import { Component, input, output } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "@services/authService/auth-service";
import { ServicioUsuario } from "@services/servicioUsuario/servicioUsuario";

import { UsuarioCompleto } from "@interfaces/modelosApp/modelosApp";
import { TiempoRelativoPipe } from "@pipes/tiempo-relativo.pipe";

@Component({
	selector: "usuario-card",
	imports: [TiempoRelativoPipe],
	templateUrl: "./usuario-card.html",
})
export class UsuarioCard {
	usuario = input.required<Partial<UsuarioCompleto>>();
	cargandoAction = false;
	feedBack = "";
	borrado = false;

	editar = output<void>();

	constructor(
		private readonly router: Router,
		private readonly aut: AuthService,
		private readonly srvUsuario: ServicioUsuario,
	) {}

	get esAdm() {
		return this.aut.usuario()?.usuario?.esAdministrador === 2;
	}

	esUsuario() {
		return this.aut.usuario()?.sesion?.id_usuario;
	}

	idPerfil(): number {
		const id = this.router.url.split("/").at(-1);
		return Number(id);
	}

	get puedeEditar() {
		console.log("Evaluando permiso de edición para el usuario con ID:", this.usuario().id_usuario);
		console.log("Usuario autenticado:", this.aut.usuario());
		console.log("ID del perfil en la ruta:", this.idPerfil());

		return this.esAdm || this.esUsuario() === this.idPerfil();
	}

	cambiarUsuario(id: string | number) {
		const idNum = Number(id);
		if (!Number.isFinite(idNum) || idNum <= 0) return;

		this.router.navigate(["/perfil-usuario", idNum]);
	}

	async borrarPerfil() {
		try {
			this.cargandoAction = true;
			this.feedBack = "";
			this.borrado = false;
			if (!confirm("¿Estás seguro de que deseas borrar tu perfil? Esta acción no se puede deshacer.")) {
				console.log("Borrado de perfil cancelado por el usuario.");
				return;
			}
			if (!confirm("Esta es tu última oportunidad para cancelar. ¿Realmente quieres borrar tu perfil?")) {
				console.log("Borrado de perfil cancelado por el usuario.");
				return;
			}
			console.log("Iniciando proceso de borrado de perfil para el usuario con ID:", this.usuario().id_usuario);
			const res = await this.srvUsuario.borrarPerfil(this.usuario().id_usuario!);
			console.log("Resultado del intento de borrado de perfil:", res);
			if (res) {
				this.feedBack = "Perfil borrado exitosamente.";
				this.borrado = true;
			} else {
				this.feedBack = "Error al borrar el perfil.";
			}
		} catch (error) {
			console.error("Error al borrar el perfil:", error);
			this.feedBack = "Error al borrar el perfil.";
		} finally {
			setTimeout(() => {
				this.feedBack = "";
				this.cargandoAction = false;
				if (this.borrado) {
					if (this.aut.usuario()?.usuario?.esAdministrador !== 2) {
						this.aut.logout();
					}
				}
			}, 4000);
		}
	}

	emitirEditar() {
		console.log("Emitido evento de edición para el usuario con ID:", this.usuario().id_usuario);
		this.editar.emit();
	}
}

import { Component, Input, signal, effect } from "@angular/core";
import { ServicioUsuario } from "@services/servicioUsuario/servicioUsuario";
import { ServicioDetalleListas } from "@services/servicioListas/servicioDetalleListas";
import { ServicioCatalogoListas } from "@services/servicioListas/servicioCatalogoListas";
import { ListaApp } from "@interfaces/modelosApp/modelosApp";
import { firstValueFrom } from "rxjs";
import { AuthService } from "@services/authService/auth-service";
import { BtnInicioSesion } from "@sharedComponents/btn-inicio-sesion/btn-inicio-sesion";

@Component({
	selector: "modal-lista-libro",
	imports: [BtnInicioSesion],
	templateUrl: "./modal-lista-libro.html",
	styleUrl: "./modal-lista-libro.css",
})
export class ModalListaLibro {
	@Input() textoBoton = "Agregar a mis lista";
	@Input() idUsuario!: number;
	@Input() idLibro?: number;

	listas = signal<ListaApp[]>([]);
	cargandoListas = signal<boolean>(false);
	errorListas = signal<string>("");
	creandoLista = signal<boolean>(false);
	nombreNuevaLista = signal<string>("");
	descripcionNuevaLista = signal<string>("");
	feedback = signal<string>("");
	loadingAccion = signal<boolean>(false);
	errorSesion = signal<boolean>(false);

	constructor(
		private readonly auth: AuthService,
		private servicioUsuario: ServicioUsuario,
		private servicioDetalleListas: ServicioDetalleListas,
		private readonly catalogoListas: ServicioCatalogoListas,
	) {
		// Carga inicial reactiva
		effect(() => {
			if (this.idUsuario) this.cargarListas();
		});
	}

	async cargarListas() {
		this.cargandoListas.set(true);
		this.errorListas.set("");
		try {
			const listas = await firstValueFrom(this.servicioUsuario.getListasCreadas(this.idUsuario));
			this.listas.set(listas);
		} catch (err) {
			this.errorListas.set("Error al cargar tus listas");
		} finally {
			this.cargandoListas.set(false);
		}
	}

	async onAddLibroToLista(idLista: number) {
		this.loadingAccion.set(true);
		this.feedback.set("");
		if (!this.idLibro) return;
		try {
			const ok = await firstValueFrom(this.servicioDetalleListas.agregarLibroALista(idLista, this.idLibro));
			this.catalogoListas.invalidateCache();
			this.feedback.set(ok ? "Libro añadido correctamente." : "No se pudo añadir el libro.");
		} catch (err) {
			this.feedback.set("Error al añadir el libro.");
		} finally {
			this.loadingAccion.set(false);
		}
	}

	async onCrearListaYAgregar() {
		if (!this.nombreNuevaLista().trim()) {
			this.feedback.set("El nombre de la lista es obligatorio.");
			return;
		}
		this.creandoLista.set(true);
		this.feedback.set("");
		try {
			const idLista = await firstValueFrom(
				this.servicioDetalleListas.crearLista(this.nombreNuevaLista(), this.descripcionNuevaLista()),
			);
			if (idLista) {
				this.catalogoListas.invalidateCache();
				if (this.idLibro) {
					try {
						const ok = await firstValueFrom(this.servicioDetalleListas.agregarLibroALista(idLista, this.idLibro));
						this.feedback.set(ok ? "Lista creada y libro añadido." : "Lista creada, pero no se pudo añadir el libro.");
					} catch {
						this.feedback.set("Lista creada, pero error al añadir el libro.");
					}
				}
				await this.cargarListas();
			} else {
				this.feedback.set("No se pudo crear la lista.");
			}
		} catch {
			this.feedback.set("Error al crear la lista.");
		} finally {
			this.creandoLista.set(false);
		}
	}

	async openModal() {
		if (!this.auth.estaLogueado()) {
			this.errorSesion.set(true);
			this.feedback.set("Debes iniciar sesión para gestionar tus listas.");
		}
		if (this.idUsuario) {
			await this.cargarListas();
		}
		const modal = document.querySelector("dialog.modal-listas") as HTMLDialogElement | null;
		modal?.showModal();
	}
}

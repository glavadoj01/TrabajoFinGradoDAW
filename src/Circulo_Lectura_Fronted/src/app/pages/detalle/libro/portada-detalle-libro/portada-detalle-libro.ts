import { Component, input, computed, inject, signal, effect } from "@angular/core";
import { BaseLibros } from "@services/servicioLibros/baseLibros";
import { ModalListaLibro } from "@sharedComponents/modal-lista-libro/modal-lista-libro";
import { AuthService } from "@services/authService/auth-service";
import { ServicioDetalleLibro } from "@services/servicioLibros/servicioDetalleLibro";
import { firstValueFrom } from "rxjs";
import { Router } from "@angular/router";

@Component({
	selector: "app-portada-detalle-libro",
	imports: [ModalListaLibro],
	templateUrl: "./portada-detalle-libro.html",
})
export class PortadaDetalleLibro {
	private readonly detalleService = inject(ServicioDetalleLibro);
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	tituloLibro = input.required<string>();
	idLibro = input.required<number>();

	meGusta = signal<boolean>(false);
	loadingMeGusta = signal<boolean>(false);

	idUsuario = computed(() => this.auth.usuario()?.sesion?.id_usuario ?? 0);

	constructor() {
		effect(() => {
			const uid = this.idUsuario();
			const lid = this.idLibro();
			if (uid && lid) {
				void this.cargarEstadoMeGusta(lid, uid);
			}
		});
	}

	async cargarEstadoMeGusta(idLibro: number, idUsuario: number) {
		try {
			const resp = await firstValueFrom(this.detalleService.getEstadoLibroUsuario(idLibro, idUsuario));
			this.meGusta.set(Boolean(resp.meGusta ?? false));
		} catch (err) {
			this.meGusta.set(false);
		}
	}

	async toggleMeGusta() {
		const uid = this.idUsuario();
		const lid = this.idLibro();
		if (!uid || !lid) {
			this.router.navigate(["/auth/login"]);
			return;
		}
		this.loadingMeGusta.set(true);
		try {
			if (this.meGusta()) {
				const ok = await firstValueFrom(this.detalleService.quitarMeGustaLibro(lid, uid));
				this.meGusta.set(ok === true ? false : this.meGusta());
			} else {
				const ok = await firstValueFrom(this.detalleService.marcarMeGustaLibro(lid, uid));
				this.meGusta.set(ok === true ? true : this.meGusta());
			}
		} catch (err) {
			// ignore and keep previous state
		} finally {
			this.loadingMeGusta.set(false);
		}
	}

	portadaLibro(): string {
		return BaseLibros.portadaLibro(this.idLibro());
	}
}

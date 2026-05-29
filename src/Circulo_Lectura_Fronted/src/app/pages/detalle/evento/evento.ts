import { Component } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { manejarError } from "@utils/error.utils";
import { valorNumeroSeguro } from "@utils/validation.utils";
import { ComentarioExistente } from "@sharedComponents/comentarioExistente/comentarioExistente";
import { BannerCargando } from "@sharedComponents/banner-cargando/banner-cargando";
import { BannerError } from "@sharedComponents/banner-error/banner-error";
import { LibroCard } from "@sharedComponents/libro-card/libro-card";
import { DetalleEventoCompleto } from "@interfaces/modelosApp/modelosApp";
import { ServicioDetalleEvento } from "@services/servicioEventos/servicioDetalleEvento";
import { ServicioCatalogoEventos } from "@services/servicioEventos/servicioCatalogoEventos";
import { DatePipe } from "@angular/common";
import { HoraPipe } from "@pipes/hora.pipe";
import { AuthService } from "@services/authService/auth-service";
import { EventoBD } from "@interfaces/modelosBD/modelosBD";
import { ComentarioNuevo } from "@sharedComponents/comentarioNuevo/comentarioNuevo";
import { ModalEventoLibros } from "@sharedComponents/modal-evento-libros/modal-evento-libros";

@Component({
	selector: "app-evento",
	imports: [
		BannerCargando,
		BannerError,
		ComentarioExistente,
		LibroCard,
		DatePipe,
		HoraPipe,
		ReactiveFormsModule,
		ComentarioNuevo,
		ModalEventoLibros,
	],
	templateUrl: "./evento.html",
})
export class Evento {
	detalle: DetalleEventoCompleto | null = null;
	eventoEncontrado = false;
	cargando = true;
	errorComentarios = false;
	siguiendoEvento = false;
	accionSeguimientoCargando = false;
	meGustaEvento = false;
	accionMeGustaCargando = false;
	editando = false;
	guardandoCambios = false;
	borrando = false;
	readonly eventoForm = new FormGroup({
		nombre_evento: new FormControl("", {
			nonNullable: true,
			validators: [Validators.required, Validators.minLength(2)],
		}),
		fecha_evento: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
		hora_evento: new FormControl("", { nonNullable: true }),
		direccion_evento: new FormControl("", { nonNullable: true }),
		descripcion_evento: new FormControl("", {
			nonNullable: true,
			validators: [Validators.required, Validators.minLength(2)],
		}),
	});
	editandoLibros = false;

	constructor(
		private readonly rutaActiva: ActivatedRoute,
		private readonly eventoService: ServicioDetalleEvento,
		private readonly catalogoEventos: ServicioCatalogoEventos,
		private readonly authService: AuthService,
		private readonly router: Router,
	) {
		const id = this.rutaActiva.snapshot.paramMap.get("id");
		const idNum = valorNumeroSeguro(id ?? -1);
		if (idNum && !Number.isNaN(idNum) && idNum > 0) {
			this.cargarDetalle(idNum);
		} else {
			manejarError("detalleevento_id_invalido", "Evento.constructor", { id });
			this.cargando = false;
		}
	}

	async recargarDetalle(id: number): Promise<void> {
		await this.cargarDetalle(id);
	}

	private async cargarDetalle(id: number): Promise<void> {
		this.cargando = true;
		this.siguiendoEvento = false;
		this.meGustaEvento = false;
		try {
			const detalle = await firstValueFrom(this.eventoService.getDetalleEvento(id));
			if (!detalle) {
				this.eventoEncontrado = false;
				this.errorComentarios = false;
				return;
			}

			this.detalle = detalle;
			this.sincronizarEdicionEvento();
			this.eventoEncontrado = true;
			this.errorComentarios = detalle.errorComentarios;
			if (this.authService.estaLogueado()) {
				await this.cargarEstadoEvento(id);
			}
		} catch (error) {
			manejarError(error, "Evento.cargarDetalle", { id });
			this.eventoEncontrado = false;
			this.errorComentarios = false;
		} finally {
			this.cargando = false;
		}
	}

	private async cargarEstadoEvento(idEvento: number): Promise<void> {
		const idUsuario = this.authService.usuario()?.sesion?.id_usuario;
		if (!idUsuario || idUsuario <= 0) {
			this.siguiendoEvento = false;
			this.meGustaEvento = false;
			return;
		}

		try {
			const estado = await firstValueFrom(this.eventoService.getEstadoEventoUsuario(idEvento, idUsuario));
			this.siguiendoEvento = estado.siguiendo;
			this.meGustaEvento = estado.meGusta;
		} catch (error) {
			this.siguiendoEvento = false;
			this.meGustaEvento = false;
			manejarError(error, "Evento.cargarEstadoEvento", { idEvento, idUsuario });
		}
	}

	async toggleSeguirEvento(): Promise<void> {
		if (this.accionSeguimientoCargando || !this.detalle?.evento?.id_evento) return;

		if (!this.authService.estaLogueado()) {
			await this.router.navigate(["/auth/login"]);
			return;
		}

		const idUsuario = this.authService.usuario()?.sesion?.id_usuario;
		const idEvento = this.detalle.evento.id_evento;
		if (!idUsuario || idUsuario <= 0) {
			await this.router.navigate(["/auth/login"]);
			return;
		}

		this.accionSeguimientoCargando = true;
		try {
			if (this.siguiendoEvento) {
				await firstValueFrom(this.eventoService.dejarSeguirEvento(idEvento, idUsuario));
				this.siguiendoEvento = false;
				if (this.meGustaEvento) {
					this.meGustaEvento = false;
				}
			} else {
				await firstValueFrom(this.eventoService.seguirEvento(idEvento, idUsuario));
				this.siguiendoEvento = true;
			}
		} catch (error) {
			manejarError(error, "Evento.toggleSeguirEvento", { idEvento, idUsuario });
		} finally {
			this.accionSeguimientoCargando = false;
		}
	}

	async toggleMeGustaEvento(): Promise<void> {
		if (this.accionMeGustaCargando || !this.detalle?.evento?.id_evento) return;

		if (!this.authService.estaLogueado()) {
			await this.router.navigate(["/auth/login"]);
			return;
		}

		if (!this.siguiendoEvento) return;

		const idUsuario = this.authService.usuario()?.sesion?.id_usuario;
		const idEvento = this.detalle.evento.id_evento;
		if (!idUsuario || idUsuario <= 0) {
			await this.router.navigate(["/auth/login"]);
			return;
		}

		this.accionMeGustaCargando = true;
		try {
			if (this.meGustaEvento) {
				await firstValueFrom(this.eventoService.quitarMeGustaEvento(idEvento, idUsuario));
				this.meGustaEvento = false;
			} else {
				await firstValueFrom(this.eventoService.marcarMeGustaEvento(idEvento, idUsuario));
				this.meGustaEvento = true;
			}
		} catch (error) {
			manejarError(error, "Evento.toggleMeGustaEvento", { idEvento, idUsuario });
		} finally {
			this.accionMeGustaCargando = false;
		}
	}

	puedeEditarEvento(): boolean {
		const evento = this.detalle?.evento;
		if (!evento) return false;
		const idUsuario = this.authService.usuario()?.sesion?.id_usuario ?? null;
		const rol = Number(this.authService.usuario()?.usuario?.esAdministrador ?? 0);
		return rol > 0 || (idUsuario !== null && idUsuario === evento.id_usuarioCrd);
	}

	iniciarEdicion(): void {
		if (!this.puedeEditarEvento() || !this.detalle?.evento) return;
		this.sincronizarEdicionEvento();
		this.editando = true;
	}

	cancelarEdicion(): void {
		this.editando = false;
		this.sincronizarEdicionEvento();
	}

	private sincronizarEdicionEvento(): void {
		if (!this.detalle?.evento) return;
		this.eventoForm.setValue({
			nombre_evento: this.detalle.evento.nombre_evento ?? "",
			fecha_evento: this.detalle.evento.fecha_evento
				? new Date(this.detalle.evento.fecha_evento).toISOString().slice(0, 10)
				: "",
			hora_evento: this.detalle.evento.hora_evento ?? "",
			direccion_evento: this.detalle.evento.direccion_evento ?? "",
			descripcion_evento: this.detalle.evento.descripcion_evento ?? "",
		});
	}

	private construirDatosEventoEditados(): Partial<EventoBD> {
		const valores = this.eventoForm.getRawValue();
		return {
			nombre_evento: valores.nombre_evento.trim(),
			fecha_evento: valores.fecha_evento as unknown as Date,
			hora_evento: valores.hora_evento.trim() || undefined,
			direccion_evento: valores.direccion_evento.trim() || undefined,
			descripcion_evento: valores.descripcion_evento.trim(),
		};
	}

	async guardarCambios(): Promise<void> {
		if (!this.detalle?.evento || !this.puedeEditarEvento()) return;
		if (this.eventoForm.invalid) {
			this.eventoForm.markAllAsTouched();
			return;
		}
		this.guardandoCambios = true;
		try {
			await firstValueFrom(
				this.eventoService.actualizarEvento(this.detalle.evento.id_evento, this.construirDatosEventoEditados()),
			);
			this.catalogoEventos.limpiarCacheCatalogo();
			await this.cargarDetalle(this.detalle.evento.id_evento);
			this.editando = false;
		} catch (error) {
			manejarError(error, "Evento.guardarCambios", { idEvento: this.detalle.evento.id_evento });
		} finally {
			this.guardandoCambios = false;
		}
	}

	async borrarEvento(): Promise<void> {
		if (!this.detalle?.evento || !this.puedeEditarEvento()) return;
		if (!globalThis.window.confirm("¿Quieres eliminar este evento?")) return;
		this.borrando = true;
		try {
			await firstValueFrom(this.eventoService.borrarEvento(this.detalle.evento.id_evento));
			this.catalogoEventos.limpiarCacheCatalogo();
			await this.router.navigate(["/catalogos/eventos"]);
		} catch (error) {
			manejarError(error, "Evento.borrarEvento", { idEvento: this.detalle.evento.id_evento });
		} finally {
			this.borrando = false;
		}
	}

	async onComentarioCreado(): Promise<void> {
		const idEvento = this.detalle?.evento?.id_evento;
		if (!idEvento || idEvento <= 0) return;
		await this.cargarDetalle(idEvento);
	}

	iniciarModalLibros(): void {
		this.editandoLibros = true;
	}

	recargarComentarios(): void {
		const idEvento = this.detalle?.evento?.id_evento;
		if (!idEvento || idEvento <= 0) return;
		this.cargarDetalle(idEvento);
	}
}

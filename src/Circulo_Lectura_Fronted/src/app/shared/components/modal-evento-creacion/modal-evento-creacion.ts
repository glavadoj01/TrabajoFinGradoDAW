import { Component, EventEmitter, Input, Output, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { AuthService } from "@services/authService/auth-service";
import { BtnInicioSesion } from "../btn-inicio-sesion/btn-inicio-sesion";
import { ServicioCatalogoEventos } from "@services/servicioEventos/servicioCatalogoEventos";
import { EventoBD } from "@interfaces/modelosBD/modelosBD";

@Component({
	selector: "modal-evento-creacion",
	imports: [BtnInicioSesion],
	templateUrl: "./modal-evento-creacion.html",
	styleUrl: "./modal-evento-creacion.css",
})
export class ModalEventoCreacion {
	@Input() textoBoton = "Crear Evento";
	@Output() eventoCreado = new EventEmitter<void>();

	nombreEvento = signal<string>("");
	fechaEvento = signal<string>("");
	horaEvento = signal<string>("");
	direccionEvento = signal<string>("");
	descripcionEvento = signal<string>("");
	creandoEvento = signal<boolean>(false);
	feedback = signal<string>("");
	errorSesion = signal<boolean>(false);

	constructor(
		private readonly auth: AuthService,
		private readonly servicioEventos: ServicioCatalogoEventos,
	) {}

	private limpiarFormulario(): void {
		this.nombreEvento.set("");
		this.fechaEvento.set("");
		this.horaEvento.set("");
		this.direccionEvento.set("");
		this.descripcionEvento.set("");
	}

	private cerrarModal(): void {
		const modal = document.querySelector("dialog.modal-eventos") as HTMLDialogElement | null;
		modal?.close();
	}

	async onCrearEvento(): Promise<void> {
		if (!this.nombreEvento().trim() || !this.fechaEvento().trim() || !this.descripcionEvento().trim()) {
			this.feedback.set("Nombre, fecha y descripción son obligatorios.");
			return;
		}

		if (!this.auth.estaLogueado()) {
			this.errorSesion.set(true);
			this.feedback.set("Debes iniciar sesión para crear eventos.");
			return;
		}

		this.creandoEvento.set(true);
		this.feedback.set("");
		try {
			const evento: Partial<EventoBD> = {
				nombre_evento: this.nombreEvento().trim(),
				fecha_evento: new Date(this.fechaEvento().trim()),
				hora_evento: this.horaEvento().trim() || undefined,
				direccion_evento: this.direccionEvento().trim() || undefined,
				descripcion_evento: this.descripcionEvento().trim(),
			};
			console.log("[ModalEventoCreacion] Datos del evento a crear:", evento);
			const idEvento = await firstValueFrom(this.servicioEventos.crearEvento(evento));
			if (idEvento) {
				this.feedback.set("Evento creado correctamente.");
				this.limpiarFormulario();
				this.servicioEventos.limpiarCacheCatalogo();
				this.eventoCreado.emit();
				this.cerrarModal();
			} else {
				this.feedback.set("No se pudo crear el evento.");
			}
		} catch {
			this.feedback.set("Error al crear el evento.");
		} finally {
			this.creandoEvento.set(false);
		}
	}

	openModal(): void {
		if (!this.auth.estaLogueado()) {
			this.errorSesion.set(true);
			this.feedback.set("Debes iniciar sesión para crear eventos.");
		} else {
			this.errorSesion.set(false);
			this.feedback.set("");
		}
		const modal = document.querySelector("dialog.modal-eventos") as HTMLDialogElement | null;
		modal?.showModal();
	}
}

import { Component, computed, effect, input, output, signal } from "@angular/core";
import type { LibroCritica, ListaComentarios, EventoComentario } from "@interfaces/modelosBD/modelosBD";
import { valorNumeroSeguro } from "@utils/validation.utils";
import { ServicioUsuario } from "@services/servicioUsuario/servicioUsuario";
import { EstrellasPuntuacion } from "@sharedComponents/estrellas-puntuacion/estrellas-puntuacion";
import { PuntuacionNormalizadaPipe } from "@pipes/puntuacion-normalizada.pipe";
import { TiempoRelativoPipe } from "@pipes/tiempo-relativo.pipe";
import { SaltosLinea } from "@pipes/saltosLinea.pipe";
import { RouterModule } from "@angular/router";
import { AuthService } from "@services/authService/auth-service";
import { manejarError } from "@utils/error.utils";
import { ServicioDetalleEvento } from "@services/servicioEventos/servicioDetalleEvento";
import { ServicioDetalleLibro } from "@services/servicioLibros/servicioDetalleLibro";
import { ServicioDetalleListas } from "@services/servicioListas/servicioDetalleListas";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";

type ComentarioConPuntuacion = Partial<LibroCritica> | Partial<ListaComentarios> | Partial<EventoComentario>;

/**
 * Componente para mostrar un comentario existente, incluyendo la puntuación, el texto del comentario, el nombre del usuario que lo realizó y el tiempo relativo desde que se publicó. Utiliza validaciones para asegurar que los datos sean seguros y presenta la información de manera clara y concisa.
 * Recibe como input un objeto `LibroCritica` que contiene toda la información relevante del comentario. El componente utiliza el servicio de usuario para obtener el nombre del usuario a partir de su ID, y muestra "Desconocido" si no se puede obtener el nombre.
 * El componente también incluye pipes para formatear la puntuación y el tiempo relativo, asegurando que se muestren valores válidos o mensajes adecuados en caso de datos faltantes o inválidos.
 */

@Component({
	selector: "app-comentario-existente",
	imports: [
		EstrellasPuntuacion,
		PuntuacionNormalizadaPipe,
		TiempoRelativoPipe,
		SaltosLinea,
		RouterModule,
		ReactiveFormsModule,
	],
	templateUrl: "./comentarioExistente.html",
})
export class ComentarioExistente {
	elemento = input.required<"libro" | "evento" | "lista" | "perfil">();
	elementoId = input.required<number>();
	critica = input.required<ComentarioConPuntuacion>();
	usuarioNombre = signal<string>("Desconocido");
	idUsuario = signal<number>(-1);

	editando = signal(false);
	tituloEdicion = signal<string>("");
	textoEdicion = signal<string>("");
	puntuacionEdicion = signal<number>(0);
	cargandoAction = signal(false);

	esElAutor = signal<boolean>(false);

	feedbackError = signal<string | null>(null);
	feedbackExito = signal<string | null>(null);

	formEdicion!: FormGroup;

	eventoFin = output<void>();

	/**
	 * Inicializa el componente y establece un efecto para obtener el nombre del usuario a partir del ID de usuario presente en la crítica. Si el ID de usuario no es válido, se establece el nombre como "Desconocido". Si el ID es válido, se suscribe al servicio de usuario para obtener el nombre y actualizarlo en consecuencia.
	 * El efecto se limpia automáticamente al destruir el componente para evitar fugas de memoria.
	 * @param servicioUsuario
	 */
	constructor(
		private readonly servicioUsuario: ServicioUsuario,
		private readonly auth: AuthService,
		private readonly srvLista: ServicioDetalleListas,
		private readonly srvLibro: ServicioDetalleLibro,
		private readonly srvEvento: ServicioDetalleEvento,
		private readonly fb: FormBuilder,
	) {
		effect(onCleanup => {
			const critica = this.critica();
			const id = valorNumeroSeguro(critica?.id_usuario ?? -1);

			this.idUsuario.set(id);
			this.usuarioNombre.set("Desconocido");

			if (!Number.isInteger(id) || id <= 0) return;

			const sub = this.servicioUsuario.getNombreUsuarioComentario(id).subscribe({
				next: data => this.usuarioNombre.set(data ?? "Desconocido"),
				error: () => {
					this.usuarioNombre.set("Desconocido");
					manejarError(
						new Error("No se pudo obtener el nombre de usuario para el comentario"),
						"Error al cargar el comentario. Por favor, inténtalo de nuevo.",
					);
				},
			});

			onCleanup(() => sub.unsubscribe());
		});

		effect(() => {
			const idActual = this.auth.usuario()?.sesion?.id_usuario ?? null;
			const esAdmin = (this.auth.usuario()?.usuario?.esAdministrador ?? 0) > 0;

			this.esElAutor.set((idActual !== null && idActual === this.idUsuario()) || esAdmin);
		});

		this.formEdicion = this.fb.group({
			titulo: ["", [Validators.maxLength(200)]],
			texto: ["", [Validators.required, Validators.maxLength(2000)]],
			puntuacion: [0, [Validators.min(1), Validators.max(5)]],
		});
	}

	get tituloComentario(): string {
		const c = this.critica();
		return "titulo_comentario" in c && typeof c.titulo_comentario === "string" ? c.titulo_comentario : "";
	}

	get textoComentario(): string {
		const c = this.critica();
		return "texto_comentario" in c && typeof c.texto_comentario === "string" ? c.texto_comentario : "";
	}

	get fechaComentario(): string | Date {
		const c = this.critica();
		return "fecha_comentario" in c ? c.fecha_comentario! : "";
	}

	get calificacion(): number | null | undefined {
		const c = this.critica();
		if ("calificacion_comentario" in c) return c.calificacion_comentario!;
		return null;
	}

	imagenAvatar(): string {
		return ServicioUsuario.avatarUsuario(this.critica()?.id_usuario ?? 1);
	}

	async editarComentario(): Promise<void> {
		const c = this.critica();

		this.formEdicion.patchValue({
			titulo: "titulo_comentario" in c ? (c.titulo_comentario ?? "") : "",
			texto: "texto_comentario" in c ? (c.texto_comentario ?? "") : "",
			puntuacion: "calificacion_comentario" in c ? Number(c.calificacion_comentario ?? 0) : 0,
		});

		this.editando.set(true);
	}

	cancelarEdicion(): void {
		this.editando.set(false);
	}

	async eliminarComentario(): Promise<void> {
		if (!confirm("¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.")) {
			return;
		}
		this.cargandoAction.set(true);
		let result: boolean | any = false;
		try {
			console.log("[EliminarComentario] Elemento:", this.elemento(), "Elemento ID:", this.elementoId());
			const c = this.critica();
			console.log("[EliminarComentario] Intentando eliminar comentario con datos:", c);
			let idComentario: number;
			const id_usuarioCrd = this.critica()?.id_usuario ?? -1;
			switch (this.elemento()) {
				case "libro":
					result = await this.srvLibro.eliminarCriticaLibro(this.elementoId(), id_usuarioCrd);
					break;
				case "evento":
					idComentario = "id_eventoComentario" in c ? Number(c.id_eventoComentario) : -1;
					if (!Number.isInteger(idComentario) || idComentario <= 0) {
						console.error("[EliminarComentario] ID de comentario inválido para eliminación:", c);
						throw new Error("No se pudo determinar el ID del comentario a eliminar.");
					}
					result = await this.srvEvento.eliminarComentarioEvento(this.elementoId(), idComentario, id_usuarioCrd);
					break;
				case "lista":
					idComentario = "id_listaComentario" in c ? Number(c.id_listaComentario) : -1;
					if (!Number.isInteger(idComentario) || idComentario <= 0) {
						console.error("[EliminarComentario] ID de comentario inválido para eliminación:", c);
						throw new Error("No se pudo determinar el ID del comentario a eliminar.");
					}
					result = await this.srvLista.eliminarComentarioLista(this.elementoId(), idComentario, id_usuarioCrd);
					break;
			}
			if (result === true) {
				this.feedbackExito.set("Comentario eliminado exitosamente.");
				this.feedbackError.set(null);
				setTimeout(() => {
					this.feedbackExito.set(null);
					this.eventoFin.emit();
				}, 3000);
			} else {
				console.error(
					"[EliminarComentario] La respuesta del servidor no indicó que el comentario fue eliminado:",
					result,
				);
				throw new Error("La respuesta del servidor no indicó que el comentario fue eliminado.");
			}
		} catch (error) {
			console.error("[EliminarComentario] Error al eliminar el comentario:", error);
			manejarError(error, "Error al eliminar el comentario. Por favor, inténtalo de nuevo.");
			this.feedbackExito.set(null);
			this.feedbackError.set("No se pudo eliminar el comentario. Por favor, inténtalo de nuevo.");
			setTimeout(() => {
				this.feedbackError.set(null);
				this.eventoFin.emit();
			}, 3000);
		} finally {
			this.cargandoAction.set(false);
		}
	}

	async guardarEdicion(): Promise<void> {
		if (this.formEdicion.invalid) return;

		this.cargandoAction.set(true);

		try {
			const c = this.critica();
			const id_usuarioCrd = c.id_usuario ?? -1;

			const { titulo, texto, puntuacion } = this.formEdicion.value;

			let idComentario: number;
			let result: boolean = false;

			switch (this.elemento()) {
				case "libro":
					result = await this.srvLibro.editarCriticaLibro(this.elementoId(), id_usuarioCrd, titulo, texto, puntuacion);
					break;

				case "evento":
					idComentario = "id_eventoComentario" in c ? Number(c.id_eventoComentario) : -1;
					result = await this.srvEvento.editarComentarioEvento(
						this.elementoId(),
						idComentario,
						id_usuarioCrd,
						texto,
						puntuacion,
					);
					break;

				case "lista":
					idComentario = "id_listaComentario" in c ? Number(c.id_listaComentario) : -1;
					result = await this.srvLista.editarComentarioLista(
						this.elementoId(),
						idComentario,
						id_usuarioCrd,
						titulo,
						texto,
						puntuacion,
					);
					break;
			}

			if (result === true) {
				this.feedbackExito.set("Comentario actualizado correctamente.");
				this.editando.set(false);

				setTimeout(() => {
					this.feedbackExito.set(null);
					this.eventoFin.emit();
				}, 2000);
			} else {
				throw new Error("La respuesta del servidor no indicó éxito.");
			}
		} catch (error) {
			manejarError(error, "Error al actualizar el comentario.");
			this.feedbackError.set("No se pudo actualizar el comentario.");
			setTimeout(() => this.feedbackError.set(null), 3000);
		} finally {
			this.cargandoAction.set(false);
		}
	}
}

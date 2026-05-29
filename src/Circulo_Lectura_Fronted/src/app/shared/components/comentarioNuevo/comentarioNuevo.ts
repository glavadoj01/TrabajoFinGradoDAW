import { Component, computed, effect, input, output, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { AuthService } from "@services/authService/auth-service";
import { ImgDefault } from "@directives/img-default";
import { ServicioUsuario } from "@services/servicioUsuario/servicioUsuario";
import { ServicioDetalleLibro } from "@services/servicioLibros/servicioDetalleLibro";
import { ServicioDetalleListas } from "@services/servicioListas/servicioDetalleListas";
import { ServicioDetalleEvento } from "@services/servicioEventos/servicioDetalleEvento";

type OrigenComentario = "libro" | "lista" | "evento";

@Component({
	selector: "app-comentario-nuevo",
	imports: [ImgDefault, ReactiveFormsModule, RouterModule],
	templateUrl: "./comentarioNuevo.html",
})
export class ComentarioNuevo {
	readonly usuarioNombre = computed(() => this.auth.usuario()?.usuario?.nombre_usuario ?? "Anónimo");
	private readonly usuarioSesionId = computed(() => this.auth.usuario()?.sesion?.id_usuario ?? null);
	readonly estaLogueado = computed(() => this.auth.estaLogueado());
	readonly estrellas = [1, 2, 3, 4, 5] as const;

	origen = input<OrigenComentario>("libro");
	idOrigen = input<number>(-1);
	comentarioCreado = output<void>();

	readonly formComentario = new FormGroup({
		titulo_comentario: new FormControl<string>("", { nonNullable: true, validators: [Validators.maxLength(100)] }),
		texto_comentario: new FormControl<string>("", { nonNullable: true, validators: [Validators.maxLength(2500)] }),
		calificacion_comentario: new FormControl<number | null>(null),
	});

	readonly enviando = signal(false);
	readonly mensajeError = signal<string | null>(null);
	readonly mensajeOk = signal<string | null>(null);
	readonly imagenUser = signal<string | null>(null);

	constructor(
		private readonly auth: AuthService,
		private readonly router: Router,
		private readonly servicioLibro: ServicioDetalleLibro,
		private readonly servicioLista: ServicioDetalleListas,
		private readonly servicioEvento: ServicioDetalleEvento,
	) {
		effect(() => {
			this.configurarValidacionesPorOrigen(this.origen());
		});

		effect(() => {
			const idSesion = this.usuarioSesionId();
			if (!idSesion || idSesion <= 0) {
				this.imagenUser.set(null);
				return;
			}
			void this.cargarAvatar(idSesion);
		});
	}

	private configurarValidacionesPorOrigen(origen: OrigenComentario): void {
		const tituloCtrl = this.formComentario.controls.titulo_comentario;
		const textoCtrl = this.formComentario.controls.texto_comentario;
		const califCtrl = this.formComentario.controls.calificacion_comentario;

		if (origen === "libro") {
			tituloCtrl.setValidators([Validators.maxLength(100)]);
			textoCtrl.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(2500)]);
			califCtrl.setValidators([Validators.required, Validators.min(1), Validators.max(5)]);
		} else if (origen === "lista") {
			tituloCtrl.setValidators([Validators.maxLength(100)]);
			textoCtrl.setValidators([Validators.required, Validators.minLength(1), Validators.maxLength(2500)]);
			califCtrl.setValidators([Validators.min(0), Validators.max(5)]);
		} else {
			tituloCtrl.setValue("");
			tituloCtrl.setValidators([]);
			textoCtrl.setValidators([Validators.required, Validators.minLength(1), Validators.maxLength(2500)]);
			califCtrl.setValidators([Validators.min(0), Validators.max(5)]);
		}

		tituloCtrl.updateValueAndValidity({ emitEvent: false });
		textoCtrl.updateValueAndValidity({ emitEvent: false });
		califCtrl.updateValueAndValidity({ emitEvent: false });
	}

	private async cargarAvatar(idUsuario: number): Promise<void> {
		try {
			this.imagenUser.set(ServicioUsuario.avatarUsuario(idUsuario));
		} catch {
			this.imagenUser.set(null);
		}
	}

	get tituloFormulario(): string {
		return this.origen() === "libro" ? "Escribe tu reseña" : "Escribe tu comentario";
	}

	get placeholderTexto(): string {
		if (this.origen() === "libro") return "Comparte tu opinión sobre este libro...";
		if (this.origen() === "lista") return "Comparte tu opinión sobre esta lista...";
		return "Comparte tu opinión sobre este evento...";
	}

	mostrarCampoTitulo(): boolean {
		return this.origen() !== "evento";
	}

	seleccionarCalificacion(valor: number): void {
		const control = this.formComentario.controls.calificacion_comentario;
		const actual = control.value;
		control.setValue(actual === valor ? null : valor);
		control.markAsDirty();
		this.mensajeError.set(null);
	}

	esEstrellaActiva(valor: number): boolean {
		return (this.formComentario.controls.calificacion_comentario.value ?? 0) >= valor;
	}

	private limpiarTexto(valor: string | null | undefined, maxLen: number): string {
		if (!valor) return "";
		return valor.replace(/\s+/g, " ").trim().slice(0, maxLen);
	}

	private normalizarCalificacion(valor: number | null | undefined): number | null {
		if (valor === null || valor === undefined) return null;
		if (!Number.isFinite(valor)) return null;
		return Math.trunc(valor);
	}

	async publicarComentario(): Promise<void> {
		this.mensajeError.set(null);
		this.mensajeOk.set(null);

		if (!this.estaLogueado()) {
			await this.router.navigate(["/auth/login"]);
			return;
		}

		if (this.idOrigen() <= 0) {
			this.mensajeError.set("No se pudo identificar el elemento a comentar.");
			return;
		}

		if (this.formComentario.invalid) {
			this.formComentario.markAllAsTouched();
			this.mensajeError.set("Revisa el formulario antes de publicar.");
			return;
		}

		const idUsuario = this.usuarioSesionId();
		if (!idUsuario || idUsuario <= 0) {
			this.mensajeError.set("No se pudo identificar tu sesión.");
			return;
		}

		const payload = this.formComentario.getRawValue();
		const tituloLimpio = this.limpiarTexto(payload.titulo_comentario, 100);
		const textoLimpio = this.limpiarTexto(payload.texto_comentario, 2500);
		const calificacion = this.normalizarCalificacion(payload.calificacion_comentario);

		if ((this.origen() === "libro" || this.origen() === "lista" || this.origen() === "evento") && !textoLimpio) {
			this.mensajeError.set("El comentario no puede estar vacío.");
			return;
		}

		if (this.origen() === "libro" && (calificacion === null || calificacion < 1 || calificacion > 5)) {
			this.mensajeError.set("La reseña del libro requiere una calificación entre 1 y 5.");
			return;
		}

		if (this.origen() !== "libro" && calificacion !== null && (calificacion < 1 || calificacion > 5)) {
			this.mensajeError.set("La calificación debe estar entre 1 y 5.");
			return;
		}

		this.enviando.set(true);

		try {
			if (this.origen() === "libro") {
				await firstValueFrom(
					this.servicioLibro.crearCriticaLibro(this.idOrigen(), idUsuario, {
						titulo_comentario: tituloLimpio || undefined,
						texto_comentario: textoLimpio || undefined,
						calificacion_comentario: Number(calificacion),
					}),
				);
			} else if (this.origen() === "lista") {
				await firstValueFrom(
					this.servicioLista.crearComentarioLista(this.idOrigen(), idUsuario, {
						titulo_comentario: tituloLimpio || undefined,
						texto_comentario: textoLimpio || undefined,
						calificacion_comentario: calificacion,
					}),
				);
			} else {
				await firstValueFrom(
					this.servicioEvento.crearComentarioEvento(this.idOrigen(), idUsuario, {
						texto_comentario: textoLimpio,
						calificacion_comentario: calificacion,
					}),
				);
			}

			this.formComentario.reset({
				titulo_comentario: "",
				texto_comentario: "",
				calificacion_comentario: null,
			});
			this.mensajeOk.set("Comentario publicado correctamente.");
			this.comentarioCreado.emit();
		} catch {
			this.mensajeError.set("No se pudo publicar el comentario. Inténtalo de nuevo.");
		} finally {
			this.enviando.set(false);
		}
	}
}

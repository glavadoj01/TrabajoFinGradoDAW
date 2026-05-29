import { Component, effect, inject, input, output, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { AuthService } from "@services/authService/auth-service";
import { UsuarioCompleto } from "@interfaces/modelosApp/modelosApp";
import { ServicioUsuario } from "@services/servicioUsuario/servicioUsuario";
import { UsuarioBD } from "@interfaces/modelosBD/modelosBD";

@Component({
	selector: "app-modal-editar-usuario",
	imports: [ReactiveFormsModule],
	templateUrl: "./modal-editar-usuario.html",
})
export class ModalEditarUsuario {
	usuario = input.required<Partial<UsuarioCompleto>>();
	cerrar = output<void>();

	private readonly fb = inject(FormBuilder);
	private readonly srvUsuario = inject(ServicioUsuario);
	private readonly auth = inject(AuthService);

	cargando = signal(false);
	feedback = signal("");

	form = this.fb.group({
		nombre_usuario: ["", [Validators.required, Validators.minLength(3)]],
		email_usuario: ["", [Validators.required, Validators.email]],
		nombre_real: ["", Validators.required],
		apellido_usuario: [""],
		password_actual: [{ value: "", disabled: true }],
		password_nueva: [{ value: "", disabled: true }],
		password_nueva_confirmacion: [{ value: "", disabled: true }],
	});

	constructor() {
		effect(() => {
			const u = this.usuario();
			if (!u) return;

			this.form.patchValue({
				nombre_usuario: u.nombre_usuario,
				email_usuario: u.email_usuario,
				nombre_real: u.nombre_real,
				apellido_usuario: u.apellido_usuario ?? "",
			});

			const esPropietario = this.auth.usuario()?.sesion?.id_usuario === u.id_usuario;

			if (esPropietario) {
				this.form.get("password_actual")?.enable();
				this.form.get("password_nueva")?.enable();
				this.form.get("password_nueva_confirmacion")?.enable();
			} else {
				this.form.get("password_actual")?.disable();
				this.form.get("password_nueva")?.disable();
				this.form.get("password_nueva_confirmacion")?.disable();
			}
		});
	}

	private validarPasswords(): string | null {
		const actual = this.form.get("password_actual")?.value?.trim();
		const nueva = this.form.get("password_nueva")?.value?.trim();
		const confirm = this.form.get("password_nueva_confirmacion")?.value?.trim();

		// Si no hay nueva → no validar nada
		if (!nueva && !confirm) return null;

		// Si hay nueva → debe haber actual
		if (!actual) return "Debes introducir tu contraseña actual.";

		// Nueva y confirmación deben coincidir
		if (nueva !== confirm) return "Las contraseñas nuevas no coinciden.";

		return null;
	}

	get esElUsuario() {
		return this.auth.usuario()?.sesion?.id_usuario === this.usuario().id_usuario;
	}

	async guardar() {
		if (this.form.invalid) return;

		// Validación local de contraseñas
		const errorPass = this.validarPasswords();
		if (errorPass) {
			this.feedback.set(errorPass);
			return;
		}

		this.cargando.set(true);
		this.feedback.set("");

		try {
			// Enviar SIEMPRE los 3 campos, aunque estén vacíos
			const payload = this.form.getRawValue();
			console.log("[MODAL USUARIO] Payload para actualizar usuario:", payload);
			let datosActualizar: {
				datosBasicos?: Partial<UsuarioBD>;
				password_actual?: string;
				password_nueva?: string;
				password_nueva_confirmacion?: string;
			} = {};

			if (payload.password_actual || payload.password_nueva || payload.password_nueva_confirmacion) {
				datosActualizar = {
					password_actual: payload.password_actual!,
					password_nueva: payload.password_nueva!,
					password_nueva_confirmacion: payload.password_nueva_confirmacion!,
				};
			}

			if (
				payload.nombre_usuario &&
				payload.nombre_usuario !== this.usuario().nombre_usuario &&
				payload.nombre_usuario !== null
			) {
				datosActualizar.datosBasicos = { nombre_usuario: payload.nombre_usuario };
			}
			if (
				payload.email_usuario &&
				payload.email_usuario !== this.usuario().email_usuario &&
				payload.email_usuario !== null
			) {
				datosActualizar.datosBasicos = { ...datosActualizar.datosBasicos, email_usuario: payload.email_usuario };
			}
			if (
				payload.apellido_usuario &&
				payload.apellido_usuario !== this.usuario().apellido_usuario &&
				payload.apellido_usuario !== null
			) {
				datosActualizar.datosBasicos = { ...datosActualizar.datosBasicos, apellido_usuario: payload.apellido_usuario };
			}
			if (payload.nombre_real && payload.nombre_real !== this.usuario().nombre_real && payload.nombre_real !== null) {
				datosActualizar.datosBasicos = { ...datosActualizar.datosBasicos, nombre_real: payload.nombre_real };
			}
			console.log("Datos a actualizar para el usuario con ID:", this.usuario().id_usuario);
			console.log(datosActualizar);
			const ok = await this.srvUsuario.actualizarUsuario(this.usuario().id_usuario!, datosActualizar);

			if (ok) {
				this.feedback.set("Perfil actualizado correctamente.");
				setTimeout(() => {
					this.cerrar.emit();
				}, 1200);
			} else {
				this.feedback.set("Error al actualizar.");
			}
		} catch (e) {
			this.feedback.set("Error inesperado.");
		} finally {
			this.cargando.set(false);
		}
	}
}

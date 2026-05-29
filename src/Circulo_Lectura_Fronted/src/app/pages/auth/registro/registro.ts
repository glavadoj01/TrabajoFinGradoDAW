import { Component, inject, signal } from "@angular/core";
import {
	AbstractControl,
	FormControl,
	FormGroup,
	ReactiveFormsModule,
	ValidationErrors,
	ValidatorFn,
	Validators,
} from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { BannerError } from "@sharedComponents/banner-error/banner-error";
import { AuthService } from "@services/authService/auth-service";
import { manejarError } from "@utils/error.utils";

const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,15}$/;

const contraseñasCoinciden: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
	const password = control.get("password")?.value;
	const passwordRepetida = control.get("passwordRepetida")?.value;
	if (!password || !passwordRepetida) return null;
	return password === passwordRepetida ? null : { contraseñasNoCoinciden: true };
};

@Component({
	selector: "app-registro",
	imports: [ReactiveFormsModule, RouterModule, BannerError],
	templateUrl: "./registro.html",
})
export class Registro {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	readonly error = signal<boolean | null>(null);
	readonly errorMensaje = signal<string | null>(null);
	readonly cargando = signal<boolean>(false);
	readonly exito = signal<boolean | null>(null);

	readonly registroForm = new FormGroup(
		{
			nombre_usuario: new FormControl("", {
				nonNullable: true,
				validators: [Validators.required, Validators.minLength(2)],
			}),
			nombre_real: new FormControl("", {
				nonNullable: true,
				validators: [Validators.required, Validators.minLength(2)],
			}),
			apellido_usuario: new FormControl("", {
				nonNullable: false,
				validators: [Validators.minLength(2)],
			}),
			email_usuario: new FormControl("", {
				nonNullable: true,
				validators: [Validators.required, Validators.email],
			}),
			password: new FormControl("", {
				nonNullable: true,
				validators: [Validators.required, Validators.pattern(REGEX_PASSWORD)],
			}),
			passwordRepetida: new FormControl("", {
				nonNullable: true,
				validators: [Validators.required],
			}),
		},
		{ validators: [contraseñasCoinciden] },
	);

	async registrar(): Promise<void> {
		this.error.set(null);
		this.exito.set(null);

		if (this.registroForm.invalid) {
			this.registroForm.markAllAsTouched();
			this.error.set(true);
			this.cargando.set(false);
			return;
		}

		this.cargando.set(true);
		try {
			const nombre_usuario = this.registroForm.controls.nombre_usuario.value.trim();
			const nombre_real = this.registroForm.controls.nombre_real.value.trim();
			const apellido_usuario = this.registroForm.controls.apellido_usuario?.value?.trim();
			const email_usuario = this.registroForm.controls.email_usuario.value.trim();
			const password = this.registroForm.controls.password.value.trim();

			const respuesta = await this.auth.register(
				{
					nombre_usuario,
					nombre_real,
					apellido_usuario: apellido_usuario || undefined,
					email_usuario,
				},
				password,
			);

			if (!respuesta.data?.id_usuario) {
				this.cargando.set(false);
				throw new Error("ERROR_USUARIO_CREAR_USUARIO");
			}

			this.registroForm.reset({
				nombre_usuario: "",
				nombre_real: "",
				apellido_usuario: "",
				email_usuario: "",
				password: "",
				passwordRepetida: "",
			});
			this.exito.set(true);
			this.cargando.set(false);
			await this.auth.login(email_usuario, password);
			setTimeout(() => {
				this.router.navigate(["/"]);
			}, 5000);
		} catch (error) {
			const respuesta = manejarError(error, "Auth.register");
			this.error.set(true);
			this.errorMensaje.set(respuesta.mensaje);
			this.cargando.set(false);
		}
	}
}

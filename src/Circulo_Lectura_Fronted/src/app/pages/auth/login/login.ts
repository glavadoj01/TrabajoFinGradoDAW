import { Component, inject, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { AuthService } from "@services/authService/auth-service";
import { manejarError } from "@utils/error.utils";
import { BannerError } from "@sharedComponents/banner-error/banner-error";

@Component({
	selector: "app-login",
	imports: [ReactiveFormsModule, RouterModule, BannerError],
	templateUrl: "./login.html",
})
export class Login {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);

	readonly error = signal<string | null>(null);
	readonly cargando = signal(false);

	readonly loginForm = new FormGroup({
		email: new FormControl("", { nonNullable: true, validators: [Validators.required, Validators.email] }),
		password: new FormControl("", { nonNullable: true, validators: [Validators.required] }),
	});

	async login(): Promise<void> {
		this.error.set(null);
		if (this.loginForm.invalid) {
			this.loginForm.markAllAsTouched();
			return;
		}

		this.cargando.set(true);
		try {
			const email = this.loginForm.controls.email.value.trim();
			const password = this.loginForm.controls.password.value.trim();
			const idLoginToken = await this.auth.login(email, password);
			if (idLoginToken) {
				setTimeout(() => {
					if (this.auth.usuario()?.sesion?.id_usuario! > 0) {
						void this.router.navigate(["/perfil-usuario/", idLoginToken.id_usuario]);
					}
				}, 1000);
			}
		} catch (error) {
			const respuesta = manejarError(error, "Auth.login");
			this.error.set(respuesta.mensaje);
		} finally {
			this.cargando.set(false);
		}
	}
}

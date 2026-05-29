import { Component, computed } from "@angular/core";
import { RouterModule } from "@angular/router";
import { AuthService } from "@services/authService/auth-service";
import { BtnInicioSesion } from "../../btn-inicio-sesion/btn-inicio-sesion";

@Component({
	selector: "app-auth-buttons",
	imports: [RouterModule, BtnInicioSesion],
	templateUrl: "./auth-buttons.html",
})
export class AuthButtons {
	estaLogueado = computed(() => this.authService.estaLogueado());
	usuarioId = computed(() => this.authService.usuario()?.sesion?.id_usuario);

	constructor(private authService: AuthService) {}

	cerrarSesion() {
		this.authService.logout();
	}
}

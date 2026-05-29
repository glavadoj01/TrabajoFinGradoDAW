import { Component, inject, input, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { LibroResumen } from "@interfaces/modelosApp/modelosApp";
import { EstrellasPuntuacion } from "@sharedComponents/estrellas-puntuacion/estrellas-puntuacion";
import { AutorPrincipalPipe } from "@pipes/autor-principal.pipe";
import { PuntuacionTextoPipe } from "@pipes/puntuacion-texto.pipe";
import { BaseLibros } from "@services/servicioLibros/baseLibros";
import { firstValueFrom } from "rxjs";
import { AuthService } from "@services/authService/auth-service";
import { ServicioDetalleLibro } from "@services/servicioLibros/servicioDetalleLibro";

@Component({
	selector: "app-libro-card",
	imports: [RouterLink, EstrellasPuntuacion, AutorPrincipalPipe, PuntuacionTextoPipe],
	templateUrl: "./libro-card.html",
	styleUrl: "./libro-card.css",
})
export class LibroCard {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly detalleService = inject(ServicioDetalleLibro);

	libro = input.required<LibroResumen>();

	meGusta = signal<boolean>(false);
	loadingMeGusta = signal<boolean>(false);

	portadaLibro(idLibro: number): string {
		return BaseLibros.portadaLibro(idLibro);
	}

	async toggleMeGusta(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		const userId = this.auth.usuario()?.sesion?.id_usuario;
		const listaId = this.libro().id_libro;
		if (!userId || !listaId) {
			this.router.navigate(["/auth/login"]);
			return;
		}
		this.loadingMeGusta.set(true);
		try {
			if (this.meGusta()) {
				const ok = await firstValueFrom(this.detalleService.quitarMeGustaLibro(listaId, userId));
				this.meGusta.set(ok === true ? false : this.meGusta());
			} else {
				const ok = await firstValueFrom(this.detalleService.marcarMeGustaLibro(listaId, userId));
				this.meGusta.set(ok === true ? true : this.meGusta());
			}
		} catch (err) {
			// ignore and keep previous state
		} finally {
			this.loadingMeGusta.set(false);
		}
	}
}

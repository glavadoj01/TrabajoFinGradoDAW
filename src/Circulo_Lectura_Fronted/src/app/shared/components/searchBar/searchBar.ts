import { Component, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { ServicioBusqueda } from "@services/servicioBusqueda/servicioBusqueda";

@Component({
	selector: "app-search-bar",
	imports: [],
	templateUrl: "./searchBar.html",
	styleUrl: "./searchBar.css",
})
export class SearchBar {
	private readonly router = inject(Router);
	private readonly srvBusqueda = inject(ServicioBusqueda);
	termino = signal<string>("");

	actualizarTermino(event: Event): void {
		const input = event.target as HTMLInputElement;
		const valor = input.value.length > 100 ? input.value.slice(0, 100) : input.value;
		this.termino.set(valor);
	}

	buscar(): void {
		const titulo = this.termino().trim();
		if (titulo.length < 3) {
			return;
		}
		this.srvBusqueda.set(titulo || null);
		void this.router.navigate(["/catalogos/libros"], {
			queryParams: { titulo },
		});
	}
}

import { Component, signal } from "@angular/core";
import { LibroResumen } from "@app/interfaces/modelosApp/modelosApp";
import { manejarError } from "@app/shared/utils/error.utils";
import { ServicioCatalogoLibros } from "@services/servicioLibros/servicioCatalogoLibros";
import { SearchBar } from "@sharedComponents/searchBar/searchBar";
import { firstValueFrom } from "rxjs";
import { BannerCargando } from "@sharedComponents/banner-cargando/banner-cargando";
import { BannerError } from "@sharedComponents/banner-error/banner-error";
import { LibroCard } from "@sharedComponents/libro-card/libro-card";

@Component({
	selector: "app-bienvenida",
	imports: [SearchBar, BannerCargando, BannerError, LibroCard],
	templateUrl: "./bienvenida.html",
})
export class Bienvenida {
	cargando = signal<boolean>(false);
	errorCarga = signal<boolean>(false);

	librosPagina = signal<LibroResumen[]>([]);

	constructor(private readonly servicioLibros: ServicioCatalogoLibros) {
		this.cargarLibros();
	}

	private async cargarLibros(): Promise<void> {
		console.log("[CatalogoLibros] cargarCatalogo: inicio");
		this.cargando.set(true);
		this.errorCarga.set(false);

		try {
			const libros = await firstValueFrom(this.servicioLibros.getCatalogoLibrosPaginado(1, "puntuacionPromedio", 4));
			console.log("[CatalogoLibros] pagina recibida:", { items: libros.length });
			this.librosPagina.set(libros);
		} catch (error) {
			manejarError(error, "Libros.cargarPagina");
			this.errorCarga.set(true);
			this.librosPagina.set([]);
		} finally {
			this.cargando.set(false);
		}
	}
}

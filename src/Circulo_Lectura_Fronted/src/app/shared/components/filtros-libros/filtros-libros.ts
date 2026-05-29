import { Component, Signal, computed, output } from "@angular/core";
import { FiltroAutor, FiltroGenero, ServicioFiltrosLibros } from "@services/servicioLibros/servicioFiltrosLibros";
import {
	DesplegableFiltrosLibro,
	OpcionFiltroDesplegable,
} from "./desplegable-filtros-libro/desplegable-filtros-libro";

@Component({
	selector: "app-filtros-libros",
	imports: [DesplegableFiltrosLibro],
	templateUrl: "./filtros-libros.html",
})
export class FiltrosLibros {
	readonly filtrosAplicados = output<{
		generos: number[];
		autores: number[];
		years: number[];
		valoraciones: number[];
	}>();
	generos: Signal<FiltroGenero[]>;
	autores: Signal<FiltroAutor[]>;
	years: Signal<number[]>;
	valoraciones: Signal<number[]>;

	selectedGeneros = new Set<number>();
	selectedAutores = new Set<number>();
	selectedYears = new Set<number>();
	selectedValoraciones = new Set<number>();

	opcionesGenero = computed<OpcionFiltroDesplegable[]>(() =>
		this.generos().map(genero => ({
			id: genero.id_genero,
			etiqueta: genero?.nombre_genero ?? "Sin género",
		})),
	);

	opcionesAutor = computed<OpcionFiltroDesplegable[]>(() =>
		this.autores().map(autor => ({
			id: autor.id_autor,
			etiqueta: `${autor?.nombre_autor ?? "Desconocido"} ${autor?.apellido_autor ?? ""}`.trim(),
		})),
	);

	opcionesYear = computed<OpcionFiltroDesplegable[]>(() =>
		this.years().map(year => ({
			id: year,
			etiqueta: `${year ?? "Desconocido"}`,
		})),
	);

	opcionesValoracion = computed<OpcionFiltroDesplegable[]>(() =>
		this.valoraciones().map(valor => ({
			id: valor,
			etiqueta: valor ? `${valor} estrellas` : "Sin valoración",
		})),
	);

	constructor(private readonly filtrosSrv: ServicioFiltrosLibros) {
		this.generos = this.filtrosSrv.generos;
		this.autores = this.filtrosSrv.autores;
		this.years = this.filtrosSrv.years;
		this.valoraciones = this.filtrosSrv.valoraciones;

		this.filtrosSrv.cargarTodosFiltros();
	}

	toggleGenero(id: number) {
		this.selectedGeneros.has(id) ? this.selectedGeneros.delete(id) : this.selectedGeneros.add(id);
	}
	toggleAutor(id: number) {
		this.selectedAutores.has(id) ? this.selectedAutores.delete(id) : this.selectedAutores.add(id);
	}
	toggleYear(year: number) {
		this.selectedYears.has(year) ? this.selectedYears.delete(year) : this.selectedYears.add(year);
	}
	toggleValoracion(val: number) {
		this.selectedValoraciones.has(val) ? this.selectedValoraciones.delete(val) : this.selectedValoraciones.add(val);
	}

	limpiarFiltros() {
		this.selectedGeneros.clear();
		this.selectedAutores.clear();
		this.selectedYears.clear();
		this.selectedValoraciones.clear();
		this.filtrosAplicados.emit({
			generos: [],
			autores: [],
			years: [],
			valoraciones: [],
		});
	}

	aplicarFiltros() {
		this.filtrosAplicados.emit({
			generos: Array.from(this.selectedGeneros),
			autores: Array.from(this.selectedAutores),
			years: Array.from(this.selectedYears),
			valoraciones: Array.from(this.selectedValoraciones),
		});
	}
}

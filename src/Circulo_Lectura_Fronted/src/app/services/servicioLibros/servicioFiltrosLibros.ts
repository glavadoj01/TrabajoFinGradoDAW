import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "@environments/environments";
import { firstValueFrom } from "rxjs";
import { manejarError } from "@utils/error.utils";

export interface FiltroGenero {
	id_genero: number;
	nombre_genero: string;
}
export interface FiltroAutor {
	id_autor: number;
	nombre_autor: string;
	apellido_autor: string;
}

@Injectable({ providedIn: "root" })
export class ServicioFiltrosLibros {
	readonly generos = signal<FiltroGenero[]>([]);
	readonly autores = signal<FiltroAutor[]>([]);
	readonly years = signal<number[]>([]);
	readonly valoraciones = signal<number[]>([1, 2, 3, 4, 5]);

	constructor(private readonly http: HttpClient) {}

	async cargarGeneros(): Promise<void> {
		const url = `${environment.apiUrl}:${environment.puerto}/generos`;
		try {
			const resp = await firstValueFrom(this.http.get<any>(url));
			const generos = Array.isArray(resp) ? resp : Array.isArray(resp?.data) ? resp.data : [];
			this.generos.set(generos);
		} catch {
			manejarError("Error al cargar géneros", "[ServicioFiltrosLibros] cargarGeneros");
			this.generos.set([]);
		}
	}

	async cargarAutores(): Promise<void> {
		const url = `${environment.apiUrl}:${environment.puerto}/autores`;
		try {
			const resp = await firstValueFrom(this.http.get<any>(url));
			const autores = Array.isArray(resp) ? resp : Array.isArray(resp?.data) ? resp.data : [];
			this.autores.set(autores);
		} catch {
			manejarError("Error al cargar autores", "[ServicioFiltrosLibros] cargarAutores");
			this.autores.set([]);
		}
	}

	async cargarYears(): Promise<void> {
		const url = `${environment.apiUrl}:${environment.puerto}/years`;
		try {
			const resp = await firstValueFrom(this.http.get<any>(url));
			const years = Array.isArray(resp)
				? resp
				: Array.isArray(resp?.data)
					? resp.data.map((y: any) => y.year_publicacion)
					: [];
			this.years.set(years);
		} catch {
			manejarError("Error al cargar años", "[ServicioFiltrosLibros] cargarYears");
			this.years.set([]);
		}
	}

	cargarTodosFiltros() {
		void this.cargarGeneros();
		void this.cargarAutores();
		void this.cargarYears();
	}
}

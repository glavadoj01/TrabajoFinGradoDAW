import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "@environments/environments";
import { firstValueFrom } from "rxjs";
import { AppError } from "@utils/error.utils";
import { valorNumeroSeguro, valorTextoSeguro } from "@utils/validation.utils";

@Injectable({ providedIn: "root" })
export class ServicioCatalogos {
	private readonly apiUrl = `${environment.apiUrl}:${environment.puerto}`;

	// Señales locales (vacías por defecto)
	generos = signal<Array<{ id_genero: number; nombre_genero: string }>>([]);
	idiomas = signal<Array<{ id_idioma: number; nombre_idioma: string }>>([]);

	constructor(private http: HttpClient) {}

	async fetchGeneros(): Promise<void> {
		try {
			console.log("[ServicioCatalogos] fetchGeneros: iniciando solicitud HTTP");
			const resp = await firstValueFrom(
				this.http.get<{ data: { id_genero: number; nombre_genero: string }[] }>(`${this.apiUrl}/generos`),
			);
			console.log("[ServicioCatalogos] fetchGeneros: respuesta HTTP recibida", resp);
			if (resp && resp.data && Array.isArray(resp.data)) {
				this.generos.set(
					resp.data.map((g: any) => ({
						id_genero: valorNumeroSeguro(g.id_genero),
						nombre_genero: valorTextoSeguro(g.nombre_genero),
					})),
				);
			}
		} catch (e) {
			console.error("[ServicioCatalogos] fetchGeneros: error al obtener géneros", e);
			throw new AppError("catalogos_generos_obtener_error", { original: e });
		}
	}

	async fetchIdiomas(): Promise<void> {
		try {
			console.log("[ServicioCatalogos] fetchIdiomas: iniciando solicitud HTTP");
			const resp = await firstValueFrom(
				this.http.get<{ data: { id_idioma: number; nombre_idioma: string }[] }>(`${this.apiUrl}/idiomas`),
			);
			console.log("[ServicioCatalogos] fetchIdiomas: respuesta HTTP recibida", resp);
			if (resp && resp.data && Array.isArray(resp.data)) {
				this.idiomas.set(
					resp.data.map((i: any) => ({
						id_idioma: valorNumeroSeguro(i.id_idioma),
						nombre_idioma: valorTextoSeguro(i.nombre_idioma),
					})),
				);
			}
		} catch (e) {
			console.error("[ServicioCatalogos] fetchIdiomas: error al obtener idiomas", e);
			throw new AppError("catalogos_idiomas_obtener_error", { original: e });
		}
	}
}

import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, map, Observable, of } from "rxjs";
import { manejarError, AppError } from "@utils/error.utils";
import { environment } from "@environments/environments";
import { ListaApp } from "@interfaces/modelosApp/modelosApp";
import { procesarRespuestaArray } from "@utils/procesarRespuesta";

interface CacheCatalogoListas {
	total: number | null;
	pages: Record<string, ListaApp[]>;
	currentPage: number;
}

@Injectable({ providedIn: "root" })
export class ServicioCatalogoListas {
	private readonly cacheCatalogoKey = "cacheCatalogoListas";
	private cacheCatalogoMemoria: CacheCatalogoListas | null = null;
	readonly cacheRevision = signal<number>(0);
	readonly paginaActual = signal<number>(1);

	constructor(private readonly http: HttpClient) {
		console.log("[ServicioCatalogoListas] Constructor: inicializando caché de listas");
		this.cacheCatalogoMemoria = this.leerCacheCatalogo();
		this.paginaActual.set(this.cacheCatalogoMemoria.currentPage);
	}

	getTotalListas(): Observable<number> {
		try {
			const cacheActual = this.obtenerCacheCatalogo();
			console.log("[ServicioCatalogoListas] getTotalListas - cache leída:", cacheActual);
			if (cacheActual.total !== null) {
				console.log("[ServicioCatalogoListas] getTotalListas - total desde caché:", cacheActual.total);
				return of(cacheActual.total);
			}
			const url = `${environment.apiUrl}:${environment.puerto}/listas/total`;
			console.log("[ServicioCatalogoListas] getTotalListas - URL:", url);
			return this.http.get<{ data: { total: number } }>(url).pipe(
				map(resp => {
					console.log("[ServicioCatalogoListas] getTotalListas - respuesta HTTP:", resp);
					const total = Number(resp.data?.total ?? 0);
					const totalSeguro = Number.isFinite(total) && total > 0 ? total : 0;
					this.actualizarCacheCatalogo(cache => ({ ...cache, total: totalSeguro }));
					return totalSeguro;
				}),
				catchError(error => {
					throw manejarError(error, "[ServicioCatalogoListas] getTotalListas Error HTTP");
				}),
			);
		} catch (error) {
			throw manejarError(error, "[ServicioCatalogoListas] getTotalListas Error Cache");
		}
	}

	getCatalogoListasPaginado(page: number, limit = 10): Observable<ListaApp[]> {
		const key = `${page}_${limit}`;
		try {
			const cacheActual = this.obtenerCacheCatalogo();
			console.log("[ServicioCatalogoListas] getCatalogoListasPaginado - cache leída:", cacheActual);
			if (cacheActual.pages[key]) {
				console.log("[ServicioCatalogoListas] getCatalogoListasPaginado - página desde caché:", { key, page, limit });
				return of(cacheActual.pages[key]);
			}
			const url = `${environment.apiUrl}:${environment.puerto}/listas?page=${page}&limit=${limit}`;
			console.log("[ServicioCatalogoListas] getCatalogoListasPaginado - URL:", url);
			return this.http.get<{ data: ListaApp[] }>(url).pipe(
				map(resp => {
					console.log("[ServicioCatalogoListas] getCatalogoListasPaginado - respuesta HTTP:", resp);
					const listas = procesarRespuestaArray<ListaApp>(resp, "Listas");
					this.actualizarCacheCatalogo(cache => ({
						...cache,
						pages: {
							...cache.pages,
							[key]: listas,
						},
					}));
					return listas;
				}),
				catchError(error => {
					throw manejarError(error, "[ServicioCatalogoListas] getCatalogoListasPaginado Error HTTP", { page, limit });
				}),
			);
		} catch (error) {
			throw manejarError(error, "[ServicioCatalogoListas] getCatalogoListasPaginado Error Cache", { page, limit });
		}
	}

	getPaginaCatalogoActual(): number {
		try {
			const cache = this.obtenerCacheCatalogo();
			console.log("[ServicioCatalogoListas] getPaginaCatalogoActual - cache leída:", cache);
			return cache.currentPage;
		} catch (error) {
			throw manejarError(error, "[ServicioCatalogoListas] getPaginaCatalogoActual Error Cache");
		}
	}

	setPaginaCatalogoActual(page: number): void {
		const paginaSegura = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
		try {
			console.log("[ServicioCatalogoListas] setPaginaCatalogoActual - página a guardar:", paginaSegura);
			this.actualizarCacheCatalogo(cache => ({
				...cache,
				currentPage: paginaSegura,
			}));
			this.paginaActual.set(paginaSegura);
		} catch (error: unknown | AppError | Error) {
			throw manejarError(error, "[ServicioCatalogoListas] setPaginaCatalogoActual Error Cache", { page });
		}
	}

	invalidateCache(): void {
		try {
			this.cacheCatalogoMemoria = { total: null, pages: {}, currentPage: 1 };
			if (globalThis.window !== undefined) {
				globalThis.window.sessionStorage.removeItem(this.cacheCatalogoKey);
			}
			this.cacheRevision.update(revision => revision + 1);
			this.paginaActual.set(1);
		} catch (error) {
			throw manejarError(error, "[ServicioCatalogoListas] invalidateCache Error Cache");
		}
	}

	private obtenerCacheCatalogo(): CacheCatalogoListas {
		if (this.cacheCatalogoMemoria === null) {
			this.cacheCatalogoMemoria = this.leerCacheCatalogo();
		}

		return this.cacheCatalogoMemoria;
	}

	private actualizarCacheCatalogo(transformar: (cacheActual: CacheCatalogoListas) => CacheCatalogoListas): void {
		const cacheActualizado = transformar(this.obtenerCacheCatalogo());
		this.cacheCatalogoMemoria = cacheActualizado;
		this.guardarCacheCatalogo(cacheActualizado);
	}

	private leerCacheCatalogo(): CacheCatalogoListas {
		if (globalThis.window === undefined) {
			throw new AppError("catalogo_cache_no_window");
		}
		const raw = globalThis.window.sessionStorage.getItem(this.cacheCatalogoKey);
		if (!raw) {
			console.log("[ServicioCatalogoListas] leerCacheCatalogo - caché vacía");
			return { total: null, pages: {}, currentPage: 1 };
		}
		try {
			const parsed = JSON.parse(raw) as CacheCatalogoListas;
			console.log("[ServicioCatalogoListas] leerCacheCatalogo - cache raw:", raw, "parsed:", parsed);
			return {
				total: typeof parsed?.total === "number" && Number.isFinite(parsed.total) ? parsed.total : null,
				pages: parsed?.pages && typeof parsed.pages === "object" ? parsed.pages : {},
				currentPage:
					typeof parsed?.currentPage === "number" && Number.isFinite(parsed.currentPage) && parsed.currentPage > 0
						? Math.floor(parsed.currentPage)
						: 1,
			};
		} catch (error) {
			throw new AppError("catalogo_cache_parse", { original: error });
		}
	}

	private guardarCacheCatalogo(cache: CacheCatalogoListas): void {
		if (globalThis.window === undefined) {
			throw new AppError("catalogo_cache_no_window");
		}
		try {
			console.log("[ServicioCatalogoListas] guardarCacheCatalogo - cache a guardar:", cache);
			globalThis.window.sessionStorage.setItem(this.cacheCatalogoKey, JSON.stringify(cache));
		} catch (error) {
			throw new AppError("catalogo_cache_guardar", { original: error });
		}
	}
}

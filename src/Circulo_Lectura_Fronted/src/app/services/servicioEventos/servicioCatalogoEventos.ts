import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "@environments/environments";
import { catchError, map, Observable, of } from "rxjs";
import { EventoResumen } from "@interfaces/modelosApp/modelosApp";
import { EventoBD } from "@interfaces/modelosBD/modelosBD";
import { AppError, manejarError } from "@utils/error.utils";
import { procesarRespuestaArray } from "@utils/procesarRespuesta";
import { AuthService } from "@services/authService/auth-service";

interface CacheCatalogoEventos {
	total: Record<string, number | null>;
	pages: Record<string, EventoResumen[]>;
	currentPage: Record<string, number>;
}

@Injectable({ providedIn: "root" })
export class ServicioCatalogoEventos {
	private readonly cacheCatalogoKey = "cacheCatalogoEventos";
	private readonly apiUrl = `${environment.apiUrl}:${environment.puerto}`;
	private cacheCatalogoMemoria: CacheCatalogoEventos | null = null;
	readonly cacheRevision = signal<number>(0);
	readonly paginaActual = signal<number>(1);

	constructor(
		private readonly http: HttpClient,
		private readonly auth: AuthService,
	) {
		try {
			console.log("[ServicioCatalogoEventos] Constructor: inicializando caché de eventos");
			this.cacheCatalogoMemoria = this.leerCacheCatalogo();
			this.paginaActual.set(this.cacheCatalogoMemoria.currentPage["proximos"] ?? 1);
		} catch (error) {
			this.paginaActual.set(1);
			throw manejarError(error, "[servicioCatalogoEventos] Constructor");
		}
	}

	private generarFiltrosKey(tipo: "proximos" | "pasados", busqueda: string = ""): string {
		return `${tipo}_${busqueda.trim().toLowerCase() || ""}`;
	}

	private construirParams(
		tipo: "proximos" | "pasados",
		pagina: number,
		limit: number,
		busqueda: string = "",
	): URLSearchParams {
		const params = new URLSearchParams({
			tipo,
			pagina: String(pagina),
			limit: String(limit),
		});

		if (busqueda && busqueda.trim()) {
			params.append("busqueda", busqueda);
		}

		return params;
	}

	getEventos(
		tipo: "proximos" | "pasados" = "proximos",
		busqueda: string = "",
		pagina: number = 1,
		limit: number = 2,
	): Observable<EventoResumen[]> {
		try {
			const cacheActual = this.obtenerCacheCatalogo();
			console.log("[ServicioCatalogoEventos] getEventos - cache leída:", cacheActual);
			const filtrosKey = this.generarFiltrosKey(tipo, busqueda);
			const key = `${tipo}_${pagina}_${limit}_${filtrosKey}`;

			if (cacheActual.pages[key]) {
				console.log("[ServicioCatalogoEventos] getEventos - evento(s) desde caché:", {
					tipo,
					busqueda,
					pagina,
					limit,
					key,
				});
				return of(cacheActual.pages[key]);
			}

			const params = this.construirParams(tipo, pagina, limit, busqueda);
			console.log("[ServicioCatalogoEventos] getEventos - filtrosKey:", filtrosKey, "params:", params.toString());
			const url = `${this.apiUrl}/eventos?${params.toString()}`;
			console.log("[ServicioCatalogoEventos] getEventos - URL:", url);

			return this.http.get<{ data: EventoResumen[] }>(url).pipe(
				map(resp => {
					console.log("[ServicioCatalogoEventos] getEventos - respuesta HTTP:", resp);
					const eventos = procesarRespuestaArray<EventoResumen>(resp, "Eventos");
					this.actualizarCacheCatalogo(cache => ({
						...cache,
						pages: {
							...cache.pages,
							[key]: eventos,
						},
						currentPage: {
							...cache.currentPage,
							[tipo]: pagina,
						},
					}));
					return eventos;
				}),
				catchError(error => {
					throw manejarError(error, "[servicioCatalogoEventos] getEventos Caché", { tipo, busqueda, pagina, limit });
				}),
			);
		} catch (error) {
			throw manejarError(error, "[servicioCatalogoEventos] getEventos", { tipo, busqueda, pagina, limit });
		}
	}

	getTotalEventos(tipo: "proximos" | "pasados" = "proximos", busqueda: string = ""): Observable<number> {
		try {
			const cacheActual = this.obtenerCacheCatalogo();
			console.log("[ServicioCatalogoEventos] getTotalEventos - cache leída:", cacheActual);
			const filtrosKey = this.generarFiltrosKey(tipo, busqueda);

			if (cacheActual.total[filtrosKey] !== undefined && cacheActual.total[filtrosKey] !== null) {
				console.log("[ServicioCatalogoEventos] getTotalEventos - total desde caché:", {
					tipo,
					busqueda,
					total: cacheActual.total[filtrosKey],
				});
				return of(cacheActual.total[filtrosKey] as number);
			}

			const params = this.construirParams(tipo, 1, 0, busqueda);
			console.log("[ServicioCatalogoEventos] getTotalEventos - filtrosKey:", filtrosKey, "params:", params.toString());
			const url = `${this.apiUrl}/eventos/total?${params.toString()}`;
			console.log("[ServicioCatalogoEventos] getTotalEventos - URL:", url);

			return this.http.get<{ data: { total: number } }>(url).pipe(
				map(resp => {
					console.log("[ServicioCatalogoEventos] getTotalEventos - respuesta HTTP:", resp);
					const total = Number(resp.data?.total ?? 0);
					const totalSeguro = Number.isFinite(total) && total > 0 ? total : 0;
					this.actualizarCacheCatalogo(cache => ({
						...cache,
						total: { ...cache.total, [filtrosKey]: totalSeguro },
					}));
					return totalSeguro;
				}),
				catchError(error => {
					throw manejarError(error, "[servicioCatalogoEventos] getTotalEventos Error HTTP", { tipo, busqueda });
				}),
			);
		} catch (error) {
			throw manejarError(error, "[servicioCatalogoEventos] getTotalEventos Error en cache", { tipo, busqueda });
		}
	}

	crearEvento(evento: Partial<EventoBD>): Observable<number> {
		const usuarioId = this.auth.usuario()?.sesion?.id_usuario;
		if (!usuarioId || usuarioId <= 0) {
			throw new AppError("ERROR_USUARIO_NO_AUTENTICADO", { evento });
		}
		const url = `${this.apiUrl}/evento/usuario/${usuarioId}`;
		return this.http.post<{ data?: { id_evento: number } }>(url, { evento }).pipe(
			map(resp => Number(resp?.data?.id_evento ?? 0)),
			catchError(error => {
				throw manejarError(error, "[ServicioCatalogoEventos] crearEvento Error", { evento });
			}),
		);
	}

	limpiarCacheCatalogo(): void {
		this.cacheCatalogoMemoria = {
			total: {},
			pages: {},
			currentPage: { proximos: 1, pasados: 1 },
		};
		if (globalThis.window !== undefined) {
			globalThis.window.sessionStorage.removeItem(this.cacheCatalogoKey);
		}
		this.cacheRevision.update(revision => revision + 1);
		this.paginaActual.set(1);
	}

	getPaginaCatalogoActual(tipo: "proximos" | "pasados" = "proximos"): number {
		try {
			const cache = this.obtenerCacheCatalogo();
			console.log("[ServicioCatalogoEventos] getPaginaCatalogoActual - cache leída:", cache);
			return cache.currentPage[tipo] ?? 1;
		} catch (error) {
			throw manejarError(error, "[servicioCatalogoEventos] getPaginaCatalogoActual Error Cache", { tipo });
		}
	}

	setPaginaCatalogoActual(tipo: "proximos" | "pasados", page: number): void {
		const paginaSegura = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
		try {
			console.log("[ServicioCatalogoEventos] setPaginaCatalogoActual - página a guardar:", { tipo, paginaSegura });
			this.actualizarCacheCatalogo(cache => ({
				...cache,
				currentPage: {
					...cache.currentPage,
					[tipo]: paginaSegura,
				},
			}));
			this.paginaActual.set(paginaSegura);
		} catch (error) {
			throw manejarError(error, "[servicioCatalogoEventos] setPaginaCatalogoActual", { tipo, page });
		}
	}

	private obtenerCacheCatalogo(): CacheCatalogoEventos {
		if (this.cacheCatalogoMemoria === null) {
			this.cacheCatalogoMemoria = this.leerCacheCatalogo();
		}

		return this.cacheCatalogoMemoria;
	}

	private actualizarCacheCatalogo(transformar: (cacheActual: CacheCatalogoEventos) => CacheCatalogoEventos): void {
		const cacheActualizado = transformar(this.obtenerCacheCatalogo());
		this.cacheCatalogoMemoria = cacheActualizado;
		this.guardarCacheCatalogo(cacheActualizado);
	}

	private leerCacheCatalogo(): CacheCatalogoEventos {
		if (globalThis.window === undefined) {
			throw new AppError("catalogo_cache_no_window");
		}
		const raw = globalThis.window.sessionStorage.getItem(this.cacheCatalogoKey);
		if (!raw) {
			console.log("[ServicioCatalogoEventos] leerCacheCatalogo - caché vacía");
			return {
				total: {},
				pages: {},
				currentPage: { proximos: 1, pasados: 1 },
			};
		}
		try {
			const parsed = JSON.parse(raw) as CacheCatalogoEventos;
			console.log("[ServicioCatalogoEventos] leerCacheCatalogo - cache raw:", raw, "parsed:", parsed);
			return {
				total: parsed?.total && typeof parsed.total === "object" ? parsed.total : {},
				pages: parsed?.pages && typeof parsed.pages === "object" ? parsed.pages : {},
				currentPage:
					parsed?.currentPage && typeof parsed.currentPage === "object"
						? {
								proximos:
									typeof parsed.currentPage["proximos"] === "number" &&
									Number.isFinite(parsed.currentPage["proximos"]) &&
									parsed.currentPage["proximos"] > 0
										? Math.floor(parsed.currentPage["proximos"])
										: 1,
								pasados:
									typeof parsed.currentPage["pasados"] === "number" &&
									Number.isFinite(parsed.currentPage["pasados"]) &&
									parsed.currentPage["pasados"] > 0
										? Math.floor(parsed.currentPage["pasados"])
										: 1,
							}
						: { proximos: 1, pasados: 1 },
			};
		} catch (error) {
			throw new AppError("catalogo_cache_parse", { original: error });
		}
	}

	private guardarCacheCatalogo(cache: CacheCatalogoEventos): void {
		if (globalThis.window === undefined) {
			throw new AppError("catalogo_cache_no_window");
		}
		try {
			console.log("[ServicioCatalogoEventos] guardarCacheCatalogo - cache a guardar:", cache);
			globalThis.window.sessionStorage.setItem(this.cacheCatalogoKey, JSON.stringify(cache));
		} catch (error) {
			throw new AppError("catalogo_cache_guardar", { original: error });
		}
	}
}

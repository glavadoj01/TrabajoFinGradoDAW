// Servicio para detalle de libro (detalle, críticas, distribución)
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, firstValueFrom, map, Observable, of, switchMap } from "rxjs";
import { environment } from "@environments/environments";
import { DetalleLibroCompleto, LibroApp, RespuestaCriticas } from "@interfaces/modelosApp/modelosApp";
import { BaseLibros } from "./baseLibros";
import { AppError, manejarError } from "@utils/error.utils";
import { valorNumeroSeguro } from "@utils/validation.utils";
import { normalizarPuntuacion } from "@utils/format.utils";
import { procesarRespuestaUnica } from "@utils/procesarRespuesta";
import { LibroCritica } from "@interfaces/modelosBD/modelosBD";
import { AuthService } from "@services/authService/auth-service";

@Injectable({ providedIn: "root" })
export class ServicioDetalleLibro {
	/**
	 * Inicializa el servicio con el cliente HTTP de Angular para realizar las solicitudes al backend.
	 * @param http Cliente HTTP de Angular para realizar las solicitudes al backend.
	 */
	constructor(
		private readonly http: HttpClient,
		private readonly auth: AuthService,
	) {}

	/**
	 * Obtiene libro por ID, valida estructura y mapea campos
	 * @param id ID del libro a obtener
	 * @returns Observable con el libro mapeado y validado, o error tipificado en caso de fallo
	 */
	private getLibroPorId(id: number): Observable<LibroApp> {
		const url = `${environment.apiUrl}:${environment.puerto}/libro/${id}`;
		return this.http.get<DetalleLibroCompleto>(url).pipe(
			map(resp => {
				const data = procesarRespuestaUnica<{ libro: LibroApp }>(resp, "libro");

				return BaseLibros.mapLibroApp(data.libro);
			}),
			catchError(error => {
				throw new AppError("libro_obtener_error", { original: error, id });
			}),
		);
	}

	getEstadoLibroUsuario(idLibro: number, idUsuario: number) {
		const url = `${environment.apiUrl}:${environment.puerto}/libro/${idLibro}/estado/usuario/${idUsuario}`;
		return this.http.get<{ data: { meGusta: boolean } }>(url).pipe(
			map(resp => ({ meGusta: Boolean(resp.data?.meGusta) })),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleLibro] getEstadoLibroUsuario Error", { idLibro, idUsuario });
			}),
		);
	}

	marcarMeGustaLibro(idLibro: number, idUsuario: number) {
		const url = `${environment.apiUrl}:${environment.puerto}/libro/${idLibro}/me-gusta/usuario/${idUsuario}`;
		return this.http.post<{ data?: { me_gusta?: boolean } }>(url, {}).pipe(
			map(resp => resp?.data?.me_gusta === true),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleLibro] marcarMeGustaLibro Error", { idLibro, idUsuario });
			}),
		);
	}

	quitarMeGustaLibro(idLibro: number, idUsuario: number) {
		const url = `${environment.apiUrl}:${environment.puerto}/libro/${idLibro}/me-gusta/usuario/${idUsuario}`;
		return this.http.delete<{ data?: { me_gusta?: boolean } }>(url).pipe(
			map(resp => resp?.data?.me_gusta === false),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleLibro] quitarMeGustaLibro Error", { idLibro, idUsuario });
			}),
		);
	}

	actualizarLibro(idLibro: number, libro: Partial<LibroApp>) {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario;
		const url = `${environment.apiUrl}:${environment.puerto}/libro/${idLibro}/usuario/${idUsuario ?? -1}`;
		return this.http.put<{ data?: { actualizado?: boolean } }>(url, { libro }).pipe(
			map(resp => Boolean(resp?.data?.actualizado)),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleLibro] actualizarLibro Error", { idLibro, libro });
			}),
		);
	}

	borrarLibro(idLibro: number) {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario;
		const url = `${environment.apiUrl}:${environment.puerto}/libro/${idLibro}/usuario/${idUsuario ?? -1}`;
		return this.http.delete<{ data?: { borrado?: boolean } }>(url).pipe(
			map(resp => Boolean(resp?.data?.borrado)),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleLibro] borrarLibro Error", { idLibro });
			}),
		);
	}

	crearCriticaLibro(
		idLibro: number,
		idUsuario: number,
		payload: { titulo_comentario?: string; texto_comentario?: string; calificacion_comentario: number },
	): Observable<boolean> {
		const url = `${environment.apiUrl}:${environment.puerto}/libro/${idLibro}/critica/usuario/${idUsuario}`;
		return this.http.post<{ data?: { critica?: { id_libro: number; id_usuario: number } } }>(url, payload).pipe(
			map(resp => Boolean(resp?.data?.critica)),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleLibro] crearCriticaLibro Error", { idLibro, idUsuario, payload });
			}),
		);
	}

	/**
	 * Obtiene críticas por ID libro, valida frecuencias y maneja errores HTTP
	 * @param id ID del libro para obtener sus críticas
	 * @returns Observable con las críticas y frecuencias normalizadas, o error tipificado en caso de fallo
	 */
	private getCriticasPorIdLibro(id: number): Observable<RespuestaCriticas> {
		const url = `${environment.apiUrl}:${environment.puerto}/libro/${id}/criticas`;
		return this.http.get<RespuestaCriticas>(url).pipe(
			map(resp => {
				const resForm = procesarRespuestaUnica<{
					criticas: LibroCritica[];
					frecuencias: number[];
				}>(resp, "respuestaCriticas");
				const frec = resForm.frecuencias;
				const frecuenciasNormalizadas = [1, 2, 3, 4, 5].map(i => {
					const val = valorNumeroSeguro(frec[i - 1] ?? 0);
					return normalizarPuntuacion(val);
				});
				return {
					criticas: resForm.criticas,
					frecuencias: frecuenciasNormalizadas as [number, number, number, number, number],
				};
			}),
			catchError(error => {
				throw new AppError("criticas_obtener_error", { original: error, id });
			}),
		);
	}

	/**
	 * Calcula distribución de notas a partir de críticas y frecuencias
	 * @param frecuencias Array de frecuencias por nota
	 * @returns Array con la distribución de notas (nota, cantidad, frecuencia)
	 */
	private calcularDistribucion(frecuencias: number[]): { nota: number; cantidad: number; frecuencia: number }[] {
		const total = frecuencias.reduce((sum, val) => sum + val, 0);
		return [5, 4, 3, 2, 1].map(nota => {
			const cantidad = valorNumeroSeguro(Number(frecuencias[nota - 1] ?? 0));
			const frecuencia = total > 0 ? Number(((cantidad * 100) / total).toFixed(2)) : 0;
			return { nota, cantidad, frecuencia };
		});
	}

	/**
	 * Método centralizado: obtiene libro + críticas + procesa todo
	 * Lanza errores tipificados (LIBRO_NOT_FOUND, LIBRO_BAD_REQUEST, etc)
	 * @param id ID del libro a obtener el detalle
	 * @return Observable con el detalle completo del libro, incluyendo críticas y distribución de notas, o error tipificado en caso de fallo
	 */
	getDetalleLibro(id: number): Observable<DetalleLibroCompleto> {
		return this.getLibroPorId(id).pipe(
			switchMap(libro => {
				return this.getCriticasPorIdLibro(libro.id_libro).pipe(
					map(respuesta => ({
						libro,
						criticas: respuesta.criticas,
						frecuencias: respuesta.frecuencias,
						errorCriticas: false,
					})),
					catchError(error => {
						manejarError(error, "[ServicioDetalleLibro] getDetalleLibro Error críticas", { id });
						return of({
							libro,
							criticas: [],
							frecuencias: [0, 0, 0, 0, 0],
							errorCriticas: true,
						});
					}),
				);
			}),
			map(data => ({
				libro: data.libro,
				criticas: data.criticas,
				notasDistribucion: this.calcularDistribucion(data.frecuencias),
				errorCriticas: data.errorCriticas,
			})),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleLibro] getDetalleLibro Error general", { id });
			}),
		);
	}

	async eliminarCriticaLibro(idLibro: number, id_usuarioCrd: number): Promise<boolean> {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario ?? null;
		if (!idUsuario) {
			throw new AppError("usuario_no_autenticado", { idLibro });
		}

		const url = `${environment.apiUrl}:${environment.puerto}/libro/${idLibro}/critica/usuario/${id_usuarioCrd}`;
		console.log("Eliminando crítica en URL:", url);
		try {
			const result = await firstValueFrom(this.http.delete<{ data?: number }>(url));
			console.log("Resultado eliminación crítica:", result);
			if (!result.data) {
				throw new AppError("respuesta_invalida", { idLibro, response: result });
			}
			if (result.data !== 1) {
				throw new AppError("critica_no_eliminada", { idLibro, response: result });
			}
			return true;
		} catch (error) {
			throw manejarError(error, "[ServicioDetalleLibro] eliminarCritica Error", { idLibro });
		}
	}

	async editarCriticaLibro(
		idLibro: number,
		id_usuarioCrd: number,
		titulo_comentario: string,
		texto_comentario: string,
		calificacion_comentario?: number | null,
	): Promise<boolean> {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario ?? null;
		if (!idUsuario) {
			throw new AppError("usuario_no_autenticado", { idLibro });
		}

		const url = `${environment.apiUrl}:${environment.puerto}/libro/${idLibro}/critica/usuario/${id_usuarioCrd}`;
		console.log("Editando crítica en URL:", url);
		try {
			const payload = {
				titulo_comentario,
				texto_comentario,
				calificacion_comentario,
			};
			console.log("Payload edición crítica:", payload);
			const result = await firstValueFrom(this.http.put<{ data?: number }>(url, payload));
			console.log("Resultado edición crítica:", result);
			if (!result.data) {
				throw new AppError("respuesta_invalida", { idLibro, response: result });
			}
			return true;
		} catch (error) {
			throw manejarError(error, "[ServicioDetalleLibro] editarCritica Error", { idLibro });
		}
	}
}

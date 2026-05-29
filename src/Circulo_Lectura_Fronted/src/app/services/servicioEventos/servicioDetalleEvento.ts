import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, firstValueFrom, forkJoin, map, Observable, of, switchMap } from "rxjs";
import { environment } from "@environments/environments";
import { DetalleEventoCompleto, EventoApp, EventoResumen, LibroResumen } from "@interfaces/modelosApp/modelosApp";
import { EventoComentario, EventoUsuario } from "@interfaces/modelosBD/modelosBD";
import { AppError, manejarError } from "@utils/error.utils";
import { procesarRespuestaArray, procesarRespuestaUnica } from "@utils/procesarRespuesta";
import { BaseLibros } from "../servicioLibros/baseLibros";
import { AuthService } from "@services/authService/auth-service";

@Injectable({ providedIn: "root" })
export class ServicioDetalleEvento {
	constructor(
		readonly http: HttpClient,
		private readonly auth: AuthService,
	) {}

	private getEventoPorId(id: number): Observable<EventoApp> {
		const url = `${environment.apiUrl}:${environment.puerto}/evento/${id}`;
		console.log(`[ServicioDetalleEvento] getEventoPorId - URL: ${url}`);
		return this.http.get<{ data: EventoApp }>(url).pipe(
			map(resp => {
				console.log("[ServicioDetalleEvento] getEventoPorId - respuesta HTTP:", resp);
				return procesarRespuestaUnica<EventoApp>(resp, "evento");
			}),
			catchError(error => {
				throw new AppError("detalle_evento_obtener", { original: error, id });
			}),
		);
	}

	private getComentariosPorIdEvento(id: number): Observable<EventoComentario[]> {
		const url = `${environment.apiUrl}:${environment.puerto}/evento/${id}/comentarios`;
		console.log(`[ServicioDetalleEvento] getComentariosPorIdEvento - URL: ${url}`);
		return this.http.get<{ data: EventoComentario[] }>(url).pipe(
			map(resp => {
				console.log("[ServicioDetalleEvento] getComentariosPorIdEvento - respuesta HTTP:", resp);
				return procesarRespuestaArray<EventoComentario>(resp, "comentarios");
			}),
			catchError(error => {
				throw new AppError("detalle_evento_comentarios_obtener", { original: error, id });
			}),
		);
	}

	getEstadoEventoUsuario(idEvento: number, idUsuario: number): Observable<{ siguiendo: boolean; meGusta: boolean }> {
		const url = `${environment.apiUrl}:${environment.puerto}/evento/${idEvento}/estado/usuario/${idUsuario}`;
		return this.http.get<{ data: { siguiendo: boolean; meGusta: boolean } }>(url).pipe(
			map(resp => ({
				siguiendo: Boolean(resp.data?.siguiendo),
				meGusta: Boolean(resp.data?.meGusta),
			})),
			catchError(error => {
				throw new AppError("detalle_evento_estado_obtener", { original: error, idEvento, idUsuario });
			}),
		);
	}

	seguirEvento(idEvento: number, idUsuario: number): Observable<boolean> {
		const url = `${environment.apiUrl}:${environment.puerto}/evento/${idEvento}/seguir/usuario/${idUsuario}`;
		return this.http.post<{ data?: { siguiendo?: boolean } }>(url, {}).pipe(
			map(resp => resp?.data?.siguiendo === true),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleEvento] seguirEvento Error", { idEvento, idUsuario });
			}),
		);
	}

	dejarSeguirEvento(idEvento: number, idUsuario: number): Observable<boolean> {
		const url = `${environment.apiUrl}:${environment.puerto}/evento/${idEvento}/seguir/usuario/${idUsuario}`;
		return this.http.delete<{ data?: { siguiendo?: boolean } }>(url).pipe(
			map(resp => resp?.data?.siguiendo === false),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleEvento] dejarSeguirEvento Error", { idEvento, idUsuario });
			}),
		);
	}

	marcarMeGustaEvento(idEvento: number, idUsuario: number): Observable<boolean> {
		const url = `${environment.apiUrl}:${environment.puerto}/evento/${idEvento}/me-gusta/usuario/${idUsuario}`;
		return this.http.post<{ data?: { me_gusta?: boolean } }>(url, {}).pipe(
			map(resp => resp?.data?.me_gusta === true),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleEvento] marcarMeGustaEvento Error", { idEvento, idUsuario });
			}),
		);
	}

	quitarMeGustaEvento(idEvento: number, idUsuario: number): Observable<boolean> {
		const url = `${environment.apiUrl}:${environment.puerto}/evento/${idEvento}/me-gusta/usuario/${idUsuario}`;
		return this.http.delete<{ data?: { me_gusta?: boolean } }>(url).pipe(
			map(resp => resp?.data?.me_gusta === false),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleEvento] quitarMeGustaEvento Error", { idEvento, idUsuario });
			}),
		);
	}

	actualizarEvento(idEvento: number, evento: Partial<EventoApp>): Observable<boolean> {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario;
		const url = `${environment.apiUrl}:${environment.puerto}/evento/${idEvento}/usuario/${idUsuario ?? -1}`;
		return this.http.put<{ data?: { actualizado?: boolean } }>(url, { evento }).pipe(
			map(resp => Boolean(resp?.data?.actualizado)),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleEvento] actualizarEvento Error", { idEvento, evento });
			}),
		);
	}

	borrarEvento(idEvento: number): Observable<boolean> {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario;
		const url = `${environment.apiUrl}:${environment.puerto}/evento/${idEvento}/usuario/${idUsuario ?? -1}`;
		return this.http.delete<{ data?: { borrado?: boolean } }>(url).pipe(
			map(resp => Boolean(resp?.data?.borrado)),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleEvento] borrarEvento Error", { idEvento });
			}),
		);
	}

	crearComentarioEvento(
		idEvento: number,
		idUsuario: number,
		payload: {
			texto_comentario: string;
			calificacion_comentario?: number | null;
			id_com_respuesta?: number | null;
		},
	): Observable<boolean> {
		const url = `${environment.apiUrl}:${environment.puerto}/evento/${idEvento}/comentario/usuario/${idUsuario}`;
		return this.http.post<{ data?: { id_eventoComentario?: number } }>(url, payload).pipe(
			map(resp => Boolean(resp?.data?.id_eventoComentario)),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleEvento] crearComentarioEvento Error", {
					idEvento,
					idUsuario,
					payload,
				});
			}),
		);
	}

	private getAsistentesPorIdEvento(id: number): Observable<EventoUsuario[]> {
		const url = `${environment.apiUrl}:${environment.puerto}/evento/${id}/asistentes`;
		console.log(`[ServicioDetalleEvento] getAsistentesPorIdEvento - URL: ${url}`);
		return this.http.get<{ data: { asistentes: EventoUsuario[] } }>(url).pipe(
			map(resp => {
				console.log("[ServicioDetalleEvento] getAsistentesPorIdEvento - respuesta HTTP:", resp);
				return procesarRespuestaArray<EventoUsuario>({ data: resp.data.asistentes }, "asistentes");
			}),
			catchError(error => {
				throw new AppError("detalle_evento_asistentes_obtener", { original: error, id });
			}),
		);
	}

	private getLibrosPorIdEvento(id: number): Observable<LibroResumen[]> {
		const url = `${environment.apiUrl}:${environment.puerto}/evento/${id}/libros`;
		console.log(`[ServicioDetalleEvento] getLibrosPorIdEvento - URL: ${url}`);
		return this.http.get<{ data: { libros: LibroResumen[] } }>(url).pipe(
			map(resp => {
				console.log("[ServicioDetalleEvento] getLibrosPorIdEvento - respuesta HTTP:", resp);
				return procesarRespuestaArray<LibroResumen>({ data: resp.data.libros }, "libros");
			}),
			catchError(error => {
				throw new AppError("detalle_evento_libros_obtener", { original: error, id });
			}),
		);
	}

	getDetalleEvento(id: number): Observable<DetalleEventoCompleto> {
		try {
			return this.getEventoPorId(id).pipe(
				switchMap(eventoApp => {
					return forkJoin({
						asistentes: this.getAsistentesPorIdEvento(eventoApp.id_evento),
						libros: this.getLibrosPorIdEvento(eventoApp.id_evento), // Ahora devuelve LibroResumen[]
						comentarios: this.getComentariosPorIdEvento(eventoApp.id_evento),
					}).pipe(
						map(({ asistentes, libros, comentarios }) => {
							const evento: EventoResumen = {
								...eventoApp,
								nombreCreador: eventoApp.nombreCreador || "",
								totalAsistentes: asistentes.length,
								categorias: [], // si no tienes categorías
							};

							return {
								evento,
								asistentes,
								libros,
								comentarios,
								errorComentarios: false,
							};
						}),
						catchError(error => {
							manejarError(error, "[ServicioDetalleEvento] getDetalleEvento - Error al obtener detalles relacionados", {
								id,
							});
							return of({
								evento: {
									...eventoApp,
									nombreCreador: "",
									totalAsistentes: 0,
									categorias: [],
								},
								asistentes: [],
								libros: [],
								comentarios: [],
								errorComentarios: true,
							});
						}),
					);
				}),
			);
		} catch (error) {
			throw manejarError(error, "[ServicioDetalleEvento] getDetalleEvento Error General", { id });
		}
	}

	async getPortadaEvento(idEvento: number): Promise<string | null> {
		const libros = await firstValueFrom(this.getLibrosPorIdEvento(idEvento));
		const idLibro = libros[0]?.id_libro ?? null;
		return idLibro ? BaseLibros.portadaLibro(idLibro) : null;
	}

	async eliminarComentarioEvento(idEvento: number, idComentario: number, id_usuarioCrd: number): Promise<boolean> {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario ?? null;
		if (!idUsuario) {
			throw new AppError("usuario_no_autenticado");
		}

		const url = `${environment.apiUrl}:${environment.puerto}/evento/${idEvento}/comentario/${idComentario}/usuario/${id_usuarioCrd}`;
		try {
			const result = await firstValueFrom(this.http.delete<{ data?: number }>(url));
			if (!result.data) {
				throw new AppError("respuesta_invalida", { idEvento, idComentario, response: result });
			}
			if (result.data !== 1) {
				throw new AppError("comentario_no_eliminado", { idEvento, idComentario, response: result });
			}
			return true;
		} catch (error) {
			throw manejarError(error, "[ServicioDetalleEvento] eliminarComentario Error General", { idComentario });
		}
	}

	async editarComentarioEvento(
		idEvento: number,
		idComentario: number,
		id_usuarioCrd: number,
		texto_comentario: string,
		calificacion_comentario?: number | null,
	): Promise<boolean> {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario ?? null;
		if (!idUsuario) {
			throw new AppError("usuario_no_autenticado");
		}

		const url = `${environment.apiUrl}:${environment.puerto}/evento/${idEvento}/comentario/${idComentario}/usuario/${id_usuarioCrd}`;
		console.log("Editando comentario en URL:", url);
		try {
			const payload = {
				texto_comentario,
				calificacion_comentario,
			};
			const result = await firstValueFrom(this.http.put<{ data?: number }>(url, payload));
			console.log("Resultado edición comentario evento:", result);
			if (!result.data) {
				throw new AppError("respuesta_invalida", { idEvento, idComentario, response: result });
			}
			return true;
		} catch (error) {
			throw manejarError(error, "[ServicioDetalleEvento] editarComentarioEvento Error General", { idComentario });
		}
	}
}

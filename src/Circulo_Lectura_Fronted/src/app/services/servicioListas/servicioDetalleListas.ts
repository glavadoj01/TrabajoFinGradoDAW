import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, map, Observable, of, switchMap, forkJoin, firstValueFrom } from "rxjs";
import { environment } from "@environments/environments";
import { ListaApp, DetalleListaCompleta, LibroResumen } from "@interfaces/modelosApp/modelosApp";
import { ListaComentarios } from "@interfaces/modelosBD/modelosBD";
import { AppError, manejarError } from "@utils/error.utils";
import { procesarRespuestaArray, procesarRespuestaUnica } from "@utils/procesarRespuesta";
import { valorTextoSeguro } from "@utils/validation.utils";
import { AuthService } from "@services/authService/auth-service";

@Injectable({ providedIn: "root" })
export class ServicioDetalleListas {
	constructor(
		readonly http: HttpClient,
		private readonly auth: AuthService,
	) {}

	/**
	 * Obtiene el detalle de una lista por su ID, incluyendo los libros asociados en formato resumen.
	 * @param id ID de la lista a obtener
	 * @returns Observable con la lista mapeada y validada, o error tipificado en caso de fallo
	 */
	private getListaPorId(id: number): Observable<ListaApp> {
		const url = `${environment.apiUrl}:${environment.puerto}/lista/${id}`;
		return this.http.get<{ data: ListaApp }>(url).pipe(
			map(resp => {
				return procesarRespuestaUnica<ListaApp>(resp, "lista");
			}),
			catchError(error => {
				throw new AppError("lista_obtener_error", { original: error, id });
			}),
		);
	}

	private getComentariosPorIdLista(id: number): Observable<ListaComentarios[]> {
		const url = `${environment.apiUrl}:${environment.puerto}/lista/${id}/comentarios`;
		return this.http.get<{ data: ListaComentarios[] }>(url).pipe(
			map(resp => procesarRespuestaArray<ListaComentarios>(resp, "comentarios")),
			catchError(error => {
				throw new AppError("comentarios_obtener_error", { original: error, id });
			}),
		);
	}

	private getLibrosPorIdLista(id: number): Observable<LibroResumen[]> {
		const url = `${environment.apiUrl}:${environment.puerto}/lista/${id}/libros`;
		return this.http.get<{ data: LibroResumen[] }>(url).pipe(
			map(resp => procesarRespuestaArray<LibroResumen>(resp, "libros")),
			catchError(error => {
				throw new AppError("libros_obtener_error", { original: error, id });
			}),
		);
	}

	getDetalleLista(id: number): Observable<DetalleListaCompleta> {
		try {
			return this.getListaPorId(id).pipe(
				switchMap(lista => {
					return (
						// Obtener libros y comentarios en paralelo
						forkJoin({
							libros: this.getLibrosPorIdLista(lista.id_lista),
							comentarios: this.getComentariosPorIdLista(lista.id_lista),
						}).pipe(
							map(({ libros, comentarios }) => ({
								lista: procesarRespuestaUnica<ListaApp>({ data: lista }, "lista"),
								libros: procesarRespuestaArray<LibroResumen>({ data: libros }, "libros"),
								comentarios: procesarRespuestaArray<ListaComentarios>({ data: comentarios }, "comentarios"),
								errorComentarios: false,
							})),
							catchError(error => {
								manejarError(error, "[ServicioDetalleListas] getDetalleLista Error obtener libros o comentarios", {
									id,
								});
								return of({
									lista,
									libros: [],
									comentarios: [],
									errorComentarios: true,
								});
							}),
						)
					);
				}),
			);
		} catch (error) {
			throw manejarError(error, "[ServicioDetalleListas] getDetalleLista Error general", { id });
		}
	}

	getEstadoListaUsuario(idLista: number, idUsuario: number): Observable<{ siguiendo: boolean; meGusta: boolean }> {
		const url = `${environment.apiUrl}:${environment.puerto}/lista/${idLista}/estado/usuario/${idUsuario}`;
		return this.http.get<{ data: { siguiendo: boolean; meGusta: boolean } }>(url).pipe(
			map(resp => ({
				siguiendo: Boolean(resp.data?.siguiendo),
				meGusta: Boolean(resp.data?.meGusta),
			})),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleListas] getEstadoListaUsuario Error", { idLista, idUsuario });
			}),
		);
	}

	seguirLista(idLista: number, idUsuario: number): Observable<boolean> {
		const url = `${environment.apiUrl}:${environment.puerto}/lista/${idLista}/seguir/usuario/${idUsuario}`;
		return this.http.post<{ data?: { seguida?: boolean } }>(url, {}).pipe(
			map(resp => resp?.data?.seguida === true),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleListas] seguirLista Error", { idLista, idUsuario });
			}),
		);
	}

	dejarSeguirLista(idLista: number, idUsuario: number): Observable<boolean> {
		const url = `${environment.apiUrl}:${environment.puerto}/lista/${idLista}/seguir/usuario/${idUsuario}`;
		return this.http.delete<{ data?: { seguida?: boolean } }>(url).pipe(
			map(resp => resp?.data?.seguida === false),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleListas] dejarSeguirLista Error", { idLista, idUsuario });
			}),
		);
	}

	marcarMeGustaLista(idLista: number, idUsuario: number): Observable<boolean> {
		const url = `${environment.apiUrl}:${environment.puerto}/lista/${idLista}/me-gusta/usuario/${idUsuario}`;
		return this.http.post<{ data?: { me_gusta?: boolean } }>(url, {}).pipe(
			map(resp => resp?.data?.me_gusta === true),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleListas] marcarMeGustaLista Error", { idLista, idUsuario });
			}),
		);
	}

	quitarMeGustaLista(idLista: number, idUsuario: number): Observable<boolean> {
		const url = `${environment.apiUrl}:${environment.puerto}/lista/${idLista}/me-gusta/usuario/${idUsuario}`;
		return this.http.delete<{ data?: { me_gusta?: boolean } }>(url).pipe(
			map(resp => resp?.data?.me_gusta === false),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleListas] quitarMeGustaLista Error", { idLista, idUsuario });
			}),
		);
	}

	actualizarLista(idLista: number, lista: Partial<ListaApp>): Observable<boolean> {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario;
		const url = `${environment.apiUrl}:${environment.puerto}/lista/${idLista}/usuario/${idUsuario ?? -1}`;
		return this.http.put<{ data?: { actualizado?: boolean } }>(url, { lista }).pipe(
			map(resp => Boolean(resp?.data?.actualizado)),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleListas] actualizarLista Error", { idLista, lista });
			}),
		);
	}

	borrarLista(idLista: number): Observable<boolean> {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario;
		const url = `${environment.apiUrl}:${environment.puerto}/lista/${idLista}/usuario/${idUsuario ?? -1}`;
		return this.http.delete<{ data?: { borrado?: boolean } }>(url).pipe(
			map(resp => Boolean(resp?.data?.borrado)),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleListas] borrarLista Error", { idLista });
			}),
		);
	}

	eliminarLibroDeLista(idLista: number, idLibro: number): Observable<boolean> {
		const url = `${environment.apiUrl}:${environment.puerto}/lista/${idLista}/libro/${idLibro}`;
		return this.http.delete<{ data?: { eliminado?: boolean } }>(url).pipe(
			map(resp => Boolean(resp?.data?.eliminado)),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleListas] eliminarLibroDeLista Error", { idLista, idLibro });
			}),
		);
	}
	/**
	 * Añade un libro a una lista (requiere ser propietario o admin)
	 */
	agregarLibroALista(idLista: number, idLibro: number): Observable<boolean> {
		const url = `${environment.apiUrl}:${environment.puerto}/lista/${idLista}/libro`;
		return this.http.post<{ data?: { id_lista: number; id_libro: number } }>(url, { id_libro: idLibro }).pipe(
			map(resp => !!resp?.data?.id_libro),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleListas] agregarLibroALista Error", { idLista, idLibro });
			}),
		);
	}

	/**
	 * Crea una nueva lista y devuelve su id (requiere estar autenticado)
	 */
	crearLista(nombre: string, descripcion?: string): Observable<number> {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario;
		if (!idUsuario || idUsuario <= 0) {
			throw new AppError("ERROR_USUARIO_NO_AUTENTICADO", { nombre, descripcion });
		}
		const url = `${environment.apiUrl}:${environment.puerto}/lista/usuario/${idUsuario}`;
		const body: { nombre_lista: string; descripcion_lista?: string } = { nombre_lista: valorTextoSeguro(nombre) };
		const descripcionSegura = valorTextoSeguro(descripcion);
		if (descripcion) body.descripcion_lista = descripcionSegura;
		return this.http.post<{ data: { id_lista: number } }>(url, { lista: body }).pipe(
			map(resp => resp?.data?.id_lista),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleListas] crearLista Error", { nombre, descripcion });
			}),
		);
	}

	crearComentarioLista(
		idLista: number,
		idUsuario: number,
		payload: {
			titulo_comentario?: string;
			texto_comentario?: string;
			calificacion_comentario?: number | null;
			id_com_respuesta?: number | null;
		},
	): Observable<boolean> {
		const url = `${environment.apiUrl}:${environment.puerto}/lista/${idLista}/comentario/usuario/${idUsuario}`;
		return this.http.post<{ data?: { id_lista: number; id_usuario: number } }>(url, payload).pipe(
			map(resp => Boolean(resp?.data?.id_lista && resp?.data?.id_usuario)),
			catchError(error => {
				throw manejarError(error, "[ServicioDetalleListas] crearComentarioLista Error", {
					idLista,
					idUsuario,
					payload,
				});
			}),
		);
	}

	async eliminarComentarioLista(idLista: number, idComentario: number, id_usuarioCrd: number): Promise<boolean> {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario ?? null;
		if (!idUsuario) {
			throw new AppError("ERROR_USUARIO_NO_AUTENTICADO", { idLista, idComentario });
		}

		const url = `${environment.apiUrl}:${environment.puerto}/lista/${idLista}/comentario/${idComentario}/usuario/${id_usuarioCrd}`;
		console.log("[ServicioDetalleListas] eliminarComentarioLista URL:", url);
		try {
			const result = await firstValueFrom(this.http.delete<{ data?: number }>(url));
			console.log("[ServicioDetalleListas] eliminarComentarioLista Resultado HTTP:", result);
			if (!result.data) {
				throw new AppError("respuesta_invalida", { idLista, idComentario, response: result });
			}
			if (result.data < 1) {
				throw new AppError("comentario_no_eliminado", { idLista, idComentario, response: result });
			}
			return true;
		} catch (error) {
			throw manejarError(error, "[ServicioDetalleListas] eliminarComentarioLista Error", { idLista, idComentario });
		}
	}

	async editarComentarioLista(
		idLista: number,
		idComentario: number,
		id_usuarioCrd: number,
		titulo_comentario: string,
		texto_comentario: string,
		calificacion_comentario?: number | null,
	): Promise<boolean> {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario ?? null;
		if (!idUsuario) {
			throw new AppError("ERROR_USUARIO_NO_AUTENTICADO", { idLista, idComentario });
		}

		const url = `${environment.apiUrl}:${environment.puerto}/lista/${idLista}/comentario/${idComentario}/usuario/${id_usuarioCrd}`;
		console.log("[ServicioDetalleListas] editarComentarioLista URL:", url);
		try {
			const payload = {
				titulo_comentario,
				texto_comentario,
				calificacion_comentario,
			};
			console.log("[ServicioDetalleListas] editarComentarioLista Payload:", payload);
			const result = await firstValueFrom(this.http.put<{ data?: number }>(url, payload));
			console.log("[ServicioDetalleListas] editarComentarioLista Resultado HTTP:", result);
			if (!result.data) {
				throw new AppError("respuesta_invalida", { idLista, idComentario, response: result });
			}
			return true;
		} catch (error) {
			throw manejarError(error, "[ServicioDetalleListas] editarComentarioLista Error", { idLista, idComentario });
		}
	}
}

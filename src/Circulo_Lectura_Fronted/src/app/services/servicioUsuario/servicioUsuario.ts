// Importaciones node_modules
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom, map, Observable } from "rxjs";
// Importaciones propias
import { environment } from "@environments/environments";
import {
	CriticaConTitulo,
	EventoResumen,
	LibroResumen,
	ListaApp,
	UsuarioCompleto,
} from "@interfaces/modelosApp/modelosApp";
import { AppError } from "@utils/error.utils";
import { procesarRespuestaArray, procesarRespuestaUnica } from "@utils/procesarRespuesta";
import { UsuarioBD } from "@app/interfaces/modelosBD/modelosBD";

@Injectable({
	providedIn: "root",
})
export class ServicioUsuario {
	private readonly apiUrl = `${environment.apiUrl}:${environment.puerto}`;

	constructor(private readonly http: HttpClient) {}

	getNombreUsuarioComentario(id: number): Observable<string> {
		const url = `${this.apiUrl}/usuario/nombre/${id}`;
		const filtros = { id_usuario: id };
		console.log("URL para obtener usuario:", url);
		console.log("Filtros para obtener usuario:", filtros);
		return this.http
			.get<{ data: { nombre_usuario: string } }>(url, {
				params: {
					filtros: JSON.stringify(filtros),
					columnas: "nombre_usuario",
				},
			})
			.pipe(
				map(resp => {
					console.log("Respuesta del servidor para obtener usuario:", resp);
					const nombreUsuario = procesarRespuestaUnica<{ nombre_usuario: string }>(
						resp,
						"nombre_usuario",
					).nombre_usuario;
					if (!nombreUsuario) {
						throw new AppError("usuario_nombre_respuesta_invalida", { id });
					}
					return nombreUsuario;
				}),
			);
	}

	getUsuarioCompleto(id: number): Observable<UsuarioCompleto> {
		return this.http.get<UsuarioCompleto>(`${this.apiUrl}/usuario/${id}`).pipe(
			map(resp => {
				console.log("Respuesta del servidor para obtener usuario completo:", resp);
				const usuario = procesarRespuestaUnica<UsuarioCompleto>(resp, "usuario");
				if (!usuario) {
					throw new AppError("usuario_completo_respuesta_invalida", { id });
				}
				return usuario;
			}),
		);
	}

	getLibrosLeidos(id: number): Observable<LibroResumen[]> {
		return this.http.get<LibroResumen[]>(`${this.apiUrl}/usuario/libros/leidos/${id}`).pipe(
			map(resp => {
				console.log("Respuesta del servidor para obtener libros leídos:", resp);
				const librosLeidos = procesarRespuestaArray<LibroResumen>(resp, "libros_leidos");
				if (!librosLeidos) {
					throw new AppError("usuario_libros_leidos_respuesta_invalida", { id });
				}
				return librosLeidos;
			}),
		);
	}

	getLibrosPendientes(id: number): Observable<LibroResumen[]> {
		return this.http.get<LibroResumen[]>(`${this.apiUrl}/usuario/libros/pendientes/${id}`).pipe(
			map(resp => {
				console.log("Respuesta del servidor para obtener libros pendientes:", resp);
				const librosPendientes = procesarRespuestaArray<LibroResumen>(resp, "libros_pendientes");
				if (!librosPendientes) {
					throw new AppError("usuario_libros_pendientes_respuesta_invalida", { id });
				}
				return librosPendientes;
			}),
		);
	}

	getListasCreadas(id: number): Observable<ListaApp[]> {
		return this.http.get<ListaApp[]>(`${this.apiUrl}/usuario/listas/creadas/${id}`).pipe(
			map(resp => {
				console.log("Respuesta del servidor para obtener listas creadas:", resp);
				const listasCreadas = procesarRespuestaArray<ListaApp>(resp, "listas_creadas");
				if (!listasCreadas) {
					throw new AppError("usuario_listas_creadas_respuesta_invalida", { id });
				}
				return listasCreadas;
			}),
		);
	}

	getListasSeguidas(id: number): Observable<ListaApp[]> {
		return this.http.get<ListaApp[]>(`${this.apiUrl}/usuario/listas/seguidas/${id}`).pipe(
			map(resp => {
				console.log("Respuesta del servidor para obtener listas seguidas:", resp);
				const listasSeguidas = procesarRespuestaArray<ListaApp>(resp, "listas_seguidas");
				if (!listasSeguidas) {
					throw new AppError("usuario_listas_seguidas_respuesta_invalida", { id });
				}
				return listasSeguidas;
			}),
		);
	}

	getEventosCreados(id: number): Observable<EventoResumen[]> {
		return this.http.get<EventoResumen[]>(`${this.apiUrl}/usuario/eventos/creados/${id}`).pipe(
			map(resp => {
				console.log("Respuesta del servidor para obtener eventos creados:", resp);
				const eventosCreados = procesarRespuestaArray<EventoResumen>(resp, "eventos_creados");
				if (!eventosCreados) {
					throw new AppError("usuario_eventos_creados_respuesta_invalida", { id });
				}
				return eventosCreados;
			}),
		);
	}

	getEventosAsistidos(id: number): Observable<EventoResumen[]> {
		return this.http.get<EventoResumen[]>(`${this.apiUrl}/usuario/eventos/asistidos/${id}`).pipe(
			map(resp => {
				console.log("Respuesta del servidor para obtener eventos asistidos:", resp);
				const eventosAsistidos = procesarRespuestaArray<EventoResumen>(resp, "eventos_asistidos");
				if (!eventosAsistidos) {
					throw new AppError("usuario_eventos_asistidos_respuesta_invalida", { id });
				}
				return eventosAsistidos;
			}),
		);
	}

	getCriticas(id: number): Observable<CriticaConTitulo[]> {
		return this.http.get<CriticaConTitulo[]>(`${this.apiUrl}/usuario/criticas/${id}`).pipe(
			map(resp => {
				console.log("Respuesta del servidor para obtener críticas:", resp);
				const criticas = procesarRespuestaArray<CriticaConTitulo>(resp, "criticas");
				if (!criticas) {
					throw new AppError("usuario_criticas_respuesta_invalida", { id });
				}
				return criticas;
			}),
		);
	}

	static avatarUsuario(idUsuario: number = 1): string {
		if (Number.isNaN(idUsuario) || idUsuario <= 0) {
			throw new AppError("avatar_usuario_id_invalido", { id_usuario: idUsuario });
		}
		return `https://i.pravatar.cc/150?u=usuario-${idUsuario}`;
	}

	async borrarPerfil(id: number): Promise<boolean> {
		try {
			const url = `${this.apiUrl}/usuario/${id}`;
			console.log("URL para borrar perfil:", url);
			const respuesta = await firstValueFrom(
				this.http.delete<{ error?: string; data?: { afectados?: string; borrado: boolean } }>(url),
			);

			if (respuesta.error) {
				console.error("Error del servidor al borrar perfil:", respuesta.error);
				throw new AppError("borrar_perfil_error_servidor", { id, error: respuesta.error });
			}

			return respuesta.data?.borrado || false;
		} catch (error) {
			console.error("Error al borrar el perfil:", error);
			throw new AppError("borrar_perfil_error", id);
		}
	}

	async actualizarUsuario(
		id: number,
		payload: {
			datosBasicos?: Partial<UsuarioBD>;
			password_actual?: string;
			password_nueva?: string;
			password_nueva_confirmacion?: string;
		},
	): Promise<boolean> {
		try {
			const url = `${this.apiUrl}/usuario/${id}`;
			console.log("URL para actualizar usuario:", url);
			console.log("Payload para actualizar usuario:", payload);
			let datosActualizar: {
				datosBasicos?: Partial<UsuarioBD>;
				password_actual?: string;
				password_nueva?: string;
				password_nueva_confirmacion?: string;
			} = {};

			if (payload.datosBasicos) {
				datosActualizar.datosBasicos = {};

				if (payload.datosBasicos.nombre_usuario !== undefined) {
					datosActualizar.datosBasicos.nombre_usuario = payload.datosBasicos.nombre_usuario;
				}
				if (payload.datosBasicos.email_usuario !== undefined) {
					datosActualizar.datosBasicos.email_usuario = payload.datosBasicos.email_usuario;
				}
				if (payload.datosBasicos.nombre_real !== undefined) {
					datosActualizar.datosBasicos.nombre_real = payload.datosBasicos.nombre_real;
				}
				if (payload.datosBasicos.apellido_usuario !== undefined) {
					datosActualizar.datosBasicos.apellido_usuario = payload.datosBasicos.apellido_usuario;
				}
			}

			if (payload.password_actual !== undefined) {
				datosActualizar.password_actual = payload.password_actual;
			}
			if (payload.password_nueva !== undefined) {
				datosActualizar.password_nueva = payload.password_nueva;
			}
			if (payload.password_nueva_confirmacion !== undefined) {
				datosActualizar.password_nueva_confirmacion = payload.password_nueva_confirmacion;
			}

			console.log("Datos a enviar para actualizar usuario:", datosActualizar);
			const respuesta = await firstValueFrom(
				this.http.put<{ error?: string; data?: { actualizado: boolean } }>(url, datosActualizar),
			);
			console.log("Respuesta del servidor para actualizar usuario:", respuesta);
			if (respuesta.error) {
				console.error("Error del servidor al actualizar usuario:", respuesta.error);
				throw new AppError("actualizar_usuario_error_servidor", { id, error: respuesta.error });
			}

			return respuesta.data?.actualizado || false;
		} catch (error) {
			console.error("Error al actualizar el usuario:", error);
			throw new AppError("actualizar_usuario_error", id);
		}
	}
}

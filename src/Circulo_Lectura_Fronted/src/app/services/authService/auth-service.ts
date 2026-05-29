import { Injectable, signal, computed } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { SesionApp } from "@interfaces/modelosApp/modelosApp";
import { environment } from "@environments/environments";
import { AppError, manejarError } from "@utils/error.utils";
import { firstValueFrom } from "rxjs";
import { UsuarioBD } from "@interfaces/modelosBD/modelosBD";

@Injectable({ providedIn: "root" })
export class AuthService {
	private readonly STORAGE_KEY = "sesion_usuario";
	private readonly apiUrl = `${environment.apiUrl}:${environment.puerto}`;
	private _usuario = signal<SesionApp | null>(null);

	usuario = computed(() => this._usuario());
	estaLogueado = computed(() => this._usuario() !== null);
	token = computed(() => this._usuario()?.sesion?.token ?? null);

	constructor(private http: HttpClient) {
		try {
			this.cargarDesdeStorage();
		} catch (error) {
			manejarError(error, "[AuthService] constructor - Error al cargar sesión desde storage", { error });
		}
	}

	private cargarDesdeStorage() {
		const raw = localStorage.getItem(this.STORAGE_KEY);
		if (!raw) return;
		try {
			const sesion: SesionApp = this.normalizarSesion(JSON.parse(raw));
			this._usuario.set(sesion);
			void this.cargarNombreUsuarioSesion(sesion.sesion?.id_usuario ?? null);
		} catch {
			localStorage.removeItem(this.STORAGE_KEY);
			throw new AppError("ERROR_CACHE_SESION_INVALIDA", { raw });
		}
	}

	private normalizarSesion(sesion: SesionApp): SesionApp {
		const idUsuario = sesion.sesion?.id_usuario;
		const token = sesion.sesion?.token;
		const esAdministrador = Number(sesion.usuario?.esAdministrador ?? 0);

		const sesionNormalizada: SesionApp = {
			sesion: {
				...(idUsuario !== undefined ? { id_usuario: idUsuario } : {}),
				...(token ? { token } : {}),
			},
		};

		if (sesion.usuario) {
			const { esAdministrador: _esAdministrador, ...usuario } = sesion.usuario;
			if (esAdministrador > 0) {
				sesionNormalizada.usuario = {
					...usuario,
					esAdministrador: esAdministrador as 1 | 2,
				};
			} else if (Object.keys(usuario).length > 0) {
				sesionNormalizada.usuario = usuario;
			}
		}

		return sesionNormalizada;
	}

	private construirSesionLogin(idUsuario: number, token: string, esAdministrador?: number): SesionApp {
		const sesion: SesionApp = {
			sesion: { id_usuario: idUsuario, token },
		};

		if (Number(esAdministrador ?? 0) > 0) {
			sesion.usuario = {
				id_usuario: idUsuario,
				esAdministrador: Number(esAdministrador) as 1 | 2,
			};
		}

		return sesion;
	}

	private async cargarNombreUsuarioSesion(idUsuario: number | null): Promise<void> {
		if (!idUsuario || idUsuario <= 0) return;

		const sesionActual = this._usuario();
		if (sesionActual?.usuario?.nombre_usuario) return;

		try {
			const resp = await firstValueFrom(
				this.http.get<{ data: { nombre_usuario?: string } }>(`${this.apiUrl}/usuario/nombre/${idUsuario}`),
			);
			const nombreUsuario = resp?.data?.nombre_usuario;
			if (!nombreUsuario) return;

			const sesionActualizada: SesionApp = {
				...(sesionActual ?? {}),
				usuario: {
					...(sesionActual?.usuario ?? {}),
					nombre_usuario: nombreUsuario,
				},
			};

			this._usuario.set(sesionActualizada);
			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sesionActualizada));
		} catch (error) {
			manejarError(error, "[AuthService] cargarNombreUsuarioSesion - Error al cargar nombre de sesión", {
				idUsuario,
			});
		}
	}

	async login(email: string, password: string): Promise<{ id_usuario: number; token: string }> {
		try {
			const resp: any = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/auth/login`, { email, password }));

			if (!resp || resp.error) {
				throw new AppError(resp?.error?.code || "ERROR_LOGIN", { response: resp });
			}
			const sesionApp = this.construirSesionLogin(resp.data.id_usuario, resp.data.token, resp.data.esAdministrador);
			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sesionApp));
			this._usuario.set(sesionApp);
			await this.cargarNombreUsuarioSesion(resp.data.id_usuario);
			return { id_usuario: resp.data.id_usuario, token: resp.data.token };
		} catch (error) {
			if (error instanceof HttpErrorResponse) {
				const codigo = error.error?.error?.code || error.error?.code || `HTTP_${error.status}`;
				throw new AppError(String(codigo), { response: error.error, status: error.status });
			}
			throw error;
		}
	}

	async register(
		datos: Partial<UsuarioBD>,
		password: string,
	): Promise<{ message?: string; data?: Partial<UsuarioBD> & { id_usuario: number }; error?: { code?: string } }> {
		try {
			const resp = await firstValueFrom(
				this.http.post<{
					message?: string;
					data?: Partial<UsuarioBD> & { id_usuario: number };
					error?: { code?: string };
				}>(`${this.apiUrl}/usuario`, { ...datos, password }),
			);
			if (!resp || resp.error) {
				throw new AppError(resp?.error?.code || "ERROR_USUARIO_CREAR_USUARIO", { response: resp });
			}
			if (!resp.data || typeof resp.data.id_usuario !== "number") {
				throw new AppError("ERROR_USUARIO_CREAR_USUARIO", { response: resp });
			}
			return resp;
		} catch (error) {
			if (error instanceof HttpErrorResponse) {
				const codigo = error.error?.error?.code || error.error?.code || `HTTP_${error.status}`;
				throw new AppError(String(codigo), { response: error.error, status: error.status });
			}
			if (error instanceof AppError) {
				throw error;
			}
			throw new AppError("ERROR_USUARIO_CREAR_USUARIO", { originalError: error });
		}
	}

	async logout(): Promise<void> {
		const tokenActual = this.token();
		const idUsuario = this.usuario()?.sesion?.id_usuario;
		try {
			if (tokenActual && idUsuario) {
				await firstValueFrom(this.http.post(`${this.apiUrl}/auth/logout/usuario/${idUsuario}`, {}));
			}
		} catch (error) {
			manejarError(error, "[AuthService] logout - Error al cerrar sesión", { error });
		} finally {
			// La sesión local debe limpiarse siempre, incluso si el backend responde 401.
			localStorage.removeItem(this.STORAGE_KEY);
			this._usuario.set(null);
		}
	}
}

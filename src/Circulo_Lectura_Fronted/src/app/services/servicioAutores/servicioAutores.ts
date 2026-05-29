import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { environment } from "@environments/environments";
import { AuthService } from "@services/authService/auth-service";

@Injectable({ providedIn: "root" })
export class ServicioAutores {
	private readonly apiUrl = `${environment.apiUrl}:${environment.puerto}`;

	constructor(
		private readonly http: HttpClient,
		private readonly auth: AuthService,
	) {}

	async fetchAutores(): Promise<Array<any>> {
		console.log("[ServicioAutores] fetchAutores: iniciando solicitud HTTP");
		const resp: any = await firstValueFrom(this.http.get<any>(`${this.apiUrl}/autores`));
		console.log("[ServicioAutores] fetchAutores: respuesta HTTP recibida", resp);
		return resp?.data && Array.isArray(resp.data) ? resp.data : [];
	}

	async crearAutor(datos: { nombre_autor: string; apellido_autor: string }): Promise<any> {
		const idUsuario = this.auth.usuario()?.sesion?.id_usuario;
		if (!idUsuario || idUsuario <= 0) {
			throw new Error("ERROR_USUARIO_NO_AUTENTICADO");
		}
		console.log("[ServicioAutores] crearAutor: iniciando solicitud HTTP");
		const resp: any = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/autores/usuario/${idUsuario}`, datos));
		console.log("[ServicioAutores] crearAutor: respuesta HTTP recibida", resp);
		return resp?.data ?? null;
	}

	async buscarUsuarios(q: string): Promise<Array<any>> {
		console.log("[ServicioAutores] buscarUsuarios: iniciando solicitud HTTP con query", q);
		const resp: any = await firstValueFrom(this.http.get<any>(`${this.apiUrl}/usuario`, { params: { q } }));
		console.log("[ServicioAutores] buscarUsuarios: respuesta HTTP recibida", resp);
		return resp?.data && Array.isArray(resp.data) ? resp.data : [];
	}
}

// Importaciones node_modules
import { Component } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { manejarError } from "@utils/error.utils";
// Importaciones propias
import { DetalleListaCompleta } from "@interfaces/modelosApp/modelosApp";
import { ServicioDetalleListas } from "@services/servicioListas/servicioDetalleListas";
import { AuthService } from "@services/authService/auth-service";
import { valorNumeroSeguro } from "@utils/validation.utils";
import { ComentarioExistente } from "@sharedComponents/comentarioExistente/comentarioExistente";
import { BannerCargando } from "@sharedComponents/banner-cargando/banner-cargando";
import { BannerError } from "@sharedComponents/banner-error/banner-error";
import { LibroCard } from "@sharedComponents/libro-card/libro-card";
import { ResumenPuntuaciones } from "@sharedComponents/resumen-puntuaciones/resumen-puntuaciones";
import { ComentarioNuevo } from "@sharedComponents/comentarioNuevo/comentarioNuevo";
import { ServicioCatalogoListas } from "@services/servicioListas/servicioCatalogoListas";

/**
 * Componente para mostrar el detalle de una lista, incluyendo su información general y comentarios. Utiliza el servicio `ServicioDetalleListas` para obtener los datos de la lista a partir de su ID, que se obtiene de la ruta activa. El componente maneja estados de carga, error y éxito para proporcionar una experiencia de usuario fluida.
 * El componente muestra un banner de carga mientras se obtienen los datos, y un banner de error si ocurre algún problema durante la carga. Si la lista se carga correctamente, se muestra su información y una lista de comentarios utilizando `ComentarioExistente`.
 */
@Component({
	selector: "app-lista-detalle",
	imports: [
		BannerCargando,
		BannerError,
		ComentarioExistente,
		LibroCard,
		ResumenPuntuaciones,
		ReactiveFormsModule,
		ComentarioNuevo,
	],
	templateUrl: "./lista.html",
	styleUrl: "./lista.css",
})
export class DetalleLista {
	detalle: DetalleListaCompleta | null = null;
	listaEncontrada = false;
	cargando = true;
	errorComentarios = false;
	siguiendoLista = false;
	accionSeguimientoCargando = false;
	meGustaLista = false;
	accionMeGustaCargando = false;
	editando = false;
	guardandoCambios = false;
	borrando = false;
	readonly listaForm = new FormGroup({
		nombre_lista: new FormControl("", {
			nonNullable: true,
			validators: [Validators.required, Validators.minLength(2)],
		}),
		descripcion_lista: new FormControl("", { nonNullable: true }),
	});

	/**
	 * Inicializa el componente, obteniendo el ID de la lista desde la ruta activa y cargando su detalle utilizando el servicio `servicioDetalleListas`. Maneja los estados de carga y error, y asegura que se limpien las suscripciones al destruir el componente para evitar memory leaks.
	 * @param rutaActiva Servicio de Angular para acceder a la ruta activa y obtener parámetros de la URL, como el ID de la lista.
	 * @param listaService Servicio para obtener los detalles de la lista y sus comentarios.
	 */
	constructor(
		private readonly rutaActiva: ActivatedRoute,
		private readonly listaService: ServicioDetalleListas,
		private readonly catalogoListas: ServicioCatalogoListas,
		private readonly authService: AuthService,
		private readonly router: Router,
	) {
		const id = this.rutaActiva.snapshot.paramMap.get("id");
		const idNum = valorNumeroSeguro(id ?? -1);
		if (idNum && !Number.isNaN(idNum) && idNum > 0) {
			this.cargarDetalle(idNum);
		} else {
			manejarError("detallelista_id_invalido", "ListaDetalle.constructor", { id });
			this.cargando = false;
		}
	}

	/**
	 * Obtiene el detalle de la lista por su ID utilizando el servicio `servicioDetalleListas`, y maneja los estados de carga, error y éxito. Si la carga es exitosa, se asignan los datos de la lista y sus comentarios a las propiedades correspondientes. Si ocurre un error, se maneja adecuadamente y se actualizan los estados para reflejar que la lista no fue encontrada o que hubo un error al cargar los comentarios.
	 * @param id Número ID de la lista a cargar, obtenido de la ruta activa. Se espera que sea un número válido y positivo.
	 */
	private async cargarDetalle(id: number): Promise<void> {
		try {
			const detalle = await firstValueFrom(this.listaService.getDetalleLista(id));
			this.detalle = detalle;
			this.sincronizarEdicionLista();
			this.listaEncontrada = true;
			this.errorComentarios = detalle.errorComentarios;
			if (this.authService.estaLogueado()) {
				await this.cargarEstadoLista(id);
			}
		} catch (error) {
			manejarError(error, "ListaDetalle.cargarDetalle", { id });
			this.listaEncontrada = false;
			this.errorComentarios = false;
		} finally {
			this.cargando = false;
		}
	}

	private async cargarEstadoLista(idLista: number): Promise<void> {
		const idUsuario = this.authService.usuario()?.sesion?.id_usuario;
		if (!idUsuario || idUsuario <= 0) {
			this.siguiendoLista = false;
			this.meGustaLista = false;
			return;
		}

		try {
			const estado = await firstValueFrom(this.listaService.getEstadoListaUsuario(idLista, idUsuario));
			this.siguiendoLista = estado.siguiendo;
			this.meGustaLista = estado.meGusta;
		} catch (error) {
			this.siguiendoLista = false;
			this.meGustaLista = false;
			manejarError(error, "ListaDetalle.cargarEstadoSeguimiento", { idLista, idUsuario });
		}
	}

	async toggleSeguirLista(): Promise<void> {
		if (this.accionSeguimientoCargando || !this.detalle?.lista?.id_lista) return;

		if (!this.authService.estaLogueado()) {
			await this.router.navigate(["/auth/login"]);
			return;
		}

		const idUsuario = this.authService.usuario()?.sesion?.id_usuario;
		const idLista = this.detalle.lista.id_lista;
		if (!idUsuario || idUsuario <= 0) {
			await this.router.navigate(["/auth/login"]);
			return;
		}

		this.accionSeguimientoCargando = true;
		try {
			if (this.siguiendoLista) {
				await firstValueFrom(this.listaService.dejarSeguirLista(idLista, idUsuario));
				this.siguiendoLista = false;
				this.actualizarContadorSeguidores(-1);
				if (this.meGustaLista) {
					this.meGustaLista = false;
					this.actualizarContadorMeGusta(-1);
				}
			} else {
				await firstValueFrom(this.listaService.seguirLista(idLista, idUsuario));
				this.siguiendoLista = true;
				this.actualizarContadorSeguidores(1);
			}
		} catch (error) {
			manejarError(error, "ListaDetalle.toggleSeguirLista", { idLista, idUsuario });
		} finally {
			this.accionSeguimientoCargando = false;
		}
	}

	async toggleMeGustaLista(): Promise<void> {
		if (this.accionMeGustaCargando || !this.detalle?.lista?.id_lista) return;

		if (!this.authService.estaLogueado()) {
			await this.router.navigate(["/auth/login"]);
			return;
		}

		if (!this.siguiendoLista) return;

		const idUsuario = this.authService.usuario()?.sesion?.id_usuario;
		const idLista = this.detalle.lista.id_lista;
		if (!idUsuario || idUsuario <= 0) {
			await this.router.navigate(["/auth/login"]);
			return;
		}

		this.accionMeGustaCargando = true;
		try {
			if (this.meGustaLista) {
				await firstValueFrom(this.listaService.quitarMeGustaLista(idLista, idUsuario));
				this.meGustaLista = false;
				this.actualizarContadorMeGusta(-1);
			} else {
				await firstValueFrom(this.listaService.marcarMeGustaLista(idLista, idUsuario));
				this.meGustaLista = true;
				this.actualizarContadorMeGusta(1);
			}
		} catch (error) {
			manejarError(error, "ListaDetalle.toggleMeGustaLista", { idLista, idUsuario });
		} finally {
			this.accionMeGustaCargando = false;
		}
	}

	private actualizarContadorSeguidores(deltaX: number): void {
		if (!this.detalle?.lista) return;
		const actual = Number(this.detalle.lista.totalSeguidores || 0);
		this.detalle.lista.totalSeguidores = Math.max(0, actual + deltaX);
	}

	private actualizarContadorMeGusta(deltaX: number): void {
		if (!this.detalle?.lista) return;
		const actual = Number(this.detalle.lista.totalMeGusta || 0);
		this.detalle.lista.totalMeGusta = Math.max(0, actual + deltaX);
	}

	puedeEditarLista(): boolean {
		const lista = this.detalle?.lista;
		if (!lista) return false;
		const idUsuario = this.authService.usuario()?.sesion?.id_usuario ?? null;
		const rol = Number(this.authService.usuario()?.usuario?.esAdministrador ?? 0);
		return rol > 0 || (idUsuario !== null && idUsuario === lista.id_usuarioCreador);
	}

	iniciarEdicion(): void {
		if (!this.puedeEditarLista() || !this.detalle?.lista) return;
		this.sincronizarEdicionLista();
		this.editando = true;
	}

	cancelarEdicion(): void {
		this.editando = false;
		this.sincronizarEdicionLista();
	}

	private sincronizarEdicionLista(): void {
		if (!this.detalle?.lista) return;
		this.listaForm.setValue({
			nombre_lista: this.detalle.lista.nombre_lista ?? "",
			descripcion_lista: this.detalle.lista.descripcion_lista ?? "",
		});
	}

	private construirDatosListaEditados(): Partial<DetalleListaCompleta["lista"]> {
		const valores = this.listaForm.getRawValue();
		return {
			nombre_lista: valores.nombre_lista.trim(),
			descripcion_lista: valores.descripcion_lista.trim() || undefined,
		};
	}

	async guardarCambios(): Promise<void> {
		if (!this.detalle?.lista || !this.puedeEditarLista()) return;
		if (this.listaForm.invalid) {
			this.listaForm.markAllAsTouched();
			return;
		}
		this.guardandoCambios = true;
		try {
			await firstValueFrom(
				this.listaService.actualizarLista(this.detalle.lista.id_lista, this.construirDatosListaEditados()),
			);
			this.catalogoListas.invalidateCache();
			await this.cargarDetalle(this.detalle.lista.id_lista);
			this.editando = false;
		} catch (error) {
			manejarError(error, "ListaDetalle.guardarCambios", { idLista: this.detalle.lista.id_lista });
		} finally {
			this.guardandoCambios = false;
		}
	}

	async borrarLista(): Promise<void> {
		if (!this.detalle?.lista || !this.puedeEditarLista()) return;
		if (!globalThis.window.confirm("¿Quieres eliminar esta lista?")) return;
		this.borrando = true;
		try {
			await firstValueFrom(this.listaService.borrarLista(this.detalle.lista.id_lista));
			this.catalogoListas.invalidateCache();
			await this.router.navigate(["/catalogos/listas"]);
		} catch (error) {
			manejarError(error, "ListaDetalle.borrarLista", { idLista: this.detalle.lista.id_lista });
		} finally {
			this.borrando = false;
		}
	}

	async quitarLibroDeLista(idLibro: number): Promise<void> {
		if (!this.detalle?.lista || !this.puedeEditarLista()) return;
		try {
			await firstValueFrom(this.listaService.eliminarLibroDeLista(this.detalle.lista.id_lista, idLibro));
			this.catalogoListas.invalidateCache();
			await this.cargarDetalle(this.detalle.lista.id_lista);
		} catch (error) {
			manejarError(error, "ListaDetalle.quitarLibroDeLista", { idLista: this.detalle.lista.id_lista, idLibro });
		}
	}

	async onComentarioCreado(): Promise<void> {
		const idLista = this.detalle?.lista?.id_lista;
		if (!idLista || idLista <= 0) return;
		await this.cargarDetalle(idLista);
	}

	recargarComentarios(): void {
		const idLista = this.detalle?.lista?.id_lista;
		if (!idLista || idLista <= 0) return;
		this.cargarDetalle(idLista);
	}
}

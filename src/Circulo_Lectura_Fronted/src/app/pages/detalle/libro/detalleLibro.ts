// Importaciones node_modules
import { DecimalPipe } from "@angular/common";
import { Component, signal, ViewChild } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { manejarError } from "@utils/error.utils";
// Importaciones propias
import { LibroCritica } from "@interfaces/modelosBD/modelosBD";
import { LibroApp } from "@interfaces/modelosApp/modelosApp";
import { AuthService } from "@services/authService/auth-service";
import { ServicioDetalleLibro } from "@services/servicioLibros/servicioDetalleLibro";
import { ServicioCatalogoLibros } from "@services/servicioLibros/servicioCatalogoLibros";
import { ServicioCatalogos } from "@services/servicioCatalogos/servicioCatalogos";
import { ComentarioNuevo } from "@sharedComponents/comentarioNuevo/comentarioNuevo";
import { ComentarioExistente } from "@sharedComponents/comentarioExistente/comentarioExistente";
import { BannerCargando } from "@sharedComponents/banner-cargando/banner-cargando";
import { BannerError } from "@sharedComponents/banner-error/banner-error";
import { ResumenPuntuaciones } from "@sharedComponents/resumen-puntuaciones/resumen-puntuaciones";
import { LibroMetadatos } from "@sharedComponents/libro-metadatos/libro-metadatos";
import { valorNumeroSeguro, valorTextoSeguro } from "@utils/validation.utils";
import { PortadaDetalleLibro } from "./portada-detalle-libro/portada-detalle-libro";
import { AutorSelector } from "@sharedComponents/autor-selector/autor-selector";

/**
 * Componente para mostrar el detalle de un libro, incluyendo su información general, críticas y puntuaciones. Utiliza el servicio `ServicioDetalleLibro` para obtener los datos del libro a partir de su ID, que se obtiene de la ruta activa. El componente maneja estados de carga, error y éxito para proporcionar una experiencia de usuario fluida.
 * El componente muestra un banner de carga mientras se obtienen los datos, y un banner de error si ocurre algún problema durante la carga. Si el libro se carga correctamente, se muestra su información utilizando el componente `LibroMetadatos`, un resumen de las puntuaciones con `ResumenPuntuaciones`, y una lista de críticas utilizando `ComentarioExistente` para cada crítica existente y `ComentarioNuevo` para permitir al usuario agregar una nueva crítica.
 * El componente también incluye validaciones para asegurar que los datos mostrados sean seguros y maneja adecuadamente los casos en los que el libro no se encuentra o no tiene críticas disponibles.
 */

@Component({
	selector: "app-libro-detalle",
	imports: [
		BannerCargando,
		BannerError,
		ComentarioNuevo,
		ComentarioExistente,
		DecimalPipe,
		LibroMetadatos,
		PortadaDetalleLibro,
		ResumenPuntuaciones,
		ReactiveFormsModule,
		AutorSelector,
	],
	templateUrl: "./detalleLibro.html",
})
export class DetalleLibro {
	libro: LibroApp | null = null;
	notasIndividuales: { nota: number; cantidad: number; frecuencia: number }[] = [];
	criticas: LibroCritica[] = [];
	libroEncontrado = false;
	cargando = true;
	errorCriticas = false;
	editando = false;
	guardandoCambios = false;
	borrando = false;
	readonly libroForm = new FormGroup({
		titulo_libro: new FormControl("", {
			nonNullable: true,
			validators: [Validators.required, Validators.minLength(2)],
		}),
		codigo_isbn: new FormControl("", { nonNullable: true }),
		paginas: new FormControl("", { nonNullable: true }),
		year_publicacion: new FormControl("", { nonNullable: true }),
		generos: new FormControl<number[]>([], { nonNullable: true }),
		autores: new FormControl<any[]>([], { nonNullable: true }),
		id_idioma_original: new FormControl<number | null>(null, { nonNullable: true }),
		sinopsis: new FormControl("", { nonNullable: true }),
	});

	@ViewChild("autorSelector") autorSelector?: AutorSelector;

	// Handler para cambios provenientes del AutorSelector
	onAutoresSelectorChange(event: any[]) {
		try {
			const ctrl = this.libroForm.controls["autores"] as FormControl;
			ctrl.setValue(Array.isArray(event) ? event : []);
			ctrl.markAsDirty();
			ctrl.updateValueAndValidity();
			console.log("[DetalleLibro] onAutoresSelectorChange event:", event);
			console.log("[DetalleLibro] FormControl autores valor tras setValue:", ctrl.value);
		} catch (e) {
			console.warn("Error actualizando FormControl autores desde selector:", e);
		}
	}

	// Señales para catálogos
	generos = signal<Array<{ id_genero: number; nombre_genero: string }>>([]);
	idiomas = signal<Array<{ id_idioma: number; nombre_idioma: string }>>([]);

	/**
	 * Getters para integración con componentes hijos modernos
	 */
	get idLibro() {
		return this.libro?.id_libro ?? 0;
	}
	get tituloLibro() {
		return this.libro?.titulo_libro ?? "";
	}

	/**
	 * Inicializa el componente, obteniendo el ID del libro desde la ruta activa y cargando su detalle utilizando el servicio `ServicioDetalleLibro`.Maneja los estados de carga y error, y asegura que se limpien las suscripciones al destruir el componente para evitar memory leaks.
	 * @param rutaActiva Servicio de Angular para acceder a la ruta activa y obtener parámetros de la URL, como el ID del libro.
	 * @param libroService Servicio para obtener los detalles del libro y sus críticas.
	 */
	constructor(
		private readonly rutaActiva: ActivatedRoute,
		private readonly libroService: ServicioDetalleLibro,
		private readonly catalogoLibros: ServicioCatalogoLibros,
		private readonly authService: AuthService,
		private readonly catalogos: ServicioCatalogos,
		private readonly router: Router,
	) {
		const id = this.rutaActiva.snapshot.paramMap.get("id");
		console.log("[DetalleLibro] ID en ruta:", id);

		const idNum = valorNumeroSeguro(id ?? -1);
		console.log("[DetalleLibro] id parseado:", idNum);
		if (idNum && !Number.isNaN(idNum) && idNum > 0) {
			this.cargarCatalogos().then(() => this.cargarDetalle(idNum));
		} else {
			manejarError("id_invalido", "[DetalleLibro] Constructor", { id });
			this.cargando = false;
		}
	}

	get isAdmin(): boolean {
		return Number(this.authService.usuario()?.usuario?.esAdministrador ?? 0) > 0;
	}

	get estaLogueado(): boolean {
		return this.authService.estaLogueado();
	}

	get puedeCrearCritica(): boolean {
		const idUsuario = this.authService.usuario()?.sesion?.id_usuario ?? null;
		if (!idUsuario) return false;
		return !this.criticas.some(critica => Number(critica.id_usuario) === Number(idUsuario));
	}

	private async cargarCatalogos(): Promise<void> {
		try {
			await Promise.all([this.catalogos.fetchGeneros(), this.catalogos.fetchIdiomas()]);
			this.generos.set(this.catalogos.generos());
			this.idiomas.set(this.catalogos.idiomas());
		} catch (error) {
			console.warn("No se pudieron cargar catálogos", error);
		}
	}

	/**
	 * Obtiene el detalle del libro por su ID utilizando el servicio `ServicioDetalleLibro`, y maneja los estados de carga, error y éxito. Si la carga es exitosa, se asignan los datos del libro, sus críticas y la distribución de notas a las propiedades correspondientes. Si ocurre un error, se maneja adecuadamente y se actualizan los estados para reflejar que el libro no fue encontrado o que hubo un error al cargar las críticas.
	 * @param id Número ID del libro a cargar, obtenido de la ruta activa. Se espera que sea un número válido y positivo.
	 */
	private async cargarDetalle(id: number): Promise<void> {
		console.log("[DetalleLibro] Iniciando carga de detalle. id=", id);

		try {
			const detalle = await firstValueFrom(this.libroService.getDetalleLibro(id));
			console.log("[DetalleLibro] Detalle recibido:", detalle);

			this.libro = detalle.libro;
			this.sincronizarEdicionLibro();
			this.criticas = detalle.criticas;
			this.notasIndividuales = detalle.notasDistribucion;
			this.errorCriticas = detalle.errorCriticas;
			this.libroEncontrado = true;

			console.log("[DetalleLibro] ✓ Cargado:", {
				id: this.libro?.id_libro,
				titulo: this.libro?.titulo_libro,
				críticas: this.criticas.length,
				errorCriticas: this.errorCriticas,
			});
		} catch (error) {
			manejarError(error, "[DetalleLibro] CargarDetalle", { id });
			this.libroEncontrado = false;
			this.errorCriticas = false;
		} finally {
			this.cargando = false;
			console.log("[DetalleLibro] Fin.", {
				libroEncontrado: this.libroEncontrado,
				errorCriticas: this.errorCriticas,
				totalCriticas: this.criticas.length,
			});
		}
	}

	/**
	 * Verifica si la sinopsis del libro es válida (no está vacía).
	 * @returns true si la sinopsis es válida, false en caso contrario.
	 */
	tieneSinopsisValida(): boolean {
		return this.libro?.sinopsis ? this.libro.sinopsis.trim().length > 0 : false;
	}

	puedeEditarLibro(): boolean {
		const libro = this.libro;
		if (!libro) return false;
		const idUsuario = this.authService.usuario()?.sesion?.id_usuario ?? null;
		const rol = Number(this.authService.usuario()?.usuario?.esAdministrador ?? 0);
		const esAutorVinculado = (libro.autores ?? []).some(
			autor => autor.id_usuario !== undefined && autor.id_usuario === idUsuario,
		);
		return rol > 0 || esAutorVinculado;
	}

	iniciarEdicion(): void {
		if (!this.puedeEditarLibro() || !this.libro) return;
		this.sincronizarEdicionLibro();
		this.editando = true;
	}

	cancelarEdicion(): void {
		this.editando = false;
		this.sincronizarEdicionLibro();
	}

	private sincronizarEdicionLibro(): void {
		if (!this.libro) return;
		// Mapear generos (nombres) a ids disponibles en catálogo
		const generosIds = (this.libro.generos ?? [])
			.map(g => (this.generos() || []).find(v => v.nombre_genero === g.nombre_genero))
			.filter(Boolean)
			.map(v => v!.id_genero);

		const autoresForm = (this.libro.autores ?? []).map(a =>
			a.id_usuario !== undefined && a.id_usuario !== null
				? { type: "usuario", id_usuario: Number(a.id_usuario), nombre: a.nombre_autor, apellido: a.apellido_autor }
				: { type: "autor", id_autor: Number(a.id_autor), nombre: a.nombre_autor, apellido: a.apellido_autor },
		);

		this.libroForm.setValue({
			titulo_libro: this.libro.titulo_libro ?? "",
			codigo_isbn: this.libro.codigo_isbn ?? "",
			paginas: this.libro.paginas?.toString() ?? "",
			year_publicacion: this.libro.year_publicacion?.toString() ?? "",
			generos: generosIds,
			autores: autoresForm,
			id_idioma_original: valorNumeroSeguro(this.libro.id_idioma_original),
			sinopsis: this.libro.sinopsis ?? "",
		});
	}

	private construirDatosLibroEditados(): Partial<LibroApp> {
		const valores = this.libroForm.getRawValue();
		// Construir lista de autores a partir del form y del selector hijo (fallback)
		const formAutores = Array.isArray(valores.autores) ? valores.autores : [];
		const selectorAutores = this.autorSelector ? this.autorSelector.selected() : [];
		// Normalizar formAutores al formato esperado
		const mapaIds = new Set<number>();
		const autoresNormalizados: any[] = (formAutores || []).map((a: any) => {
			const obj =
				a.type === "usuario"
					? { id_usuario: Number(a.id_usuario), nombre_autor: a.nombre_autor, apellido_autor: a.apellido_autor }
					: { id_autor: Number(a.id_autor), nombre_autor: a.nombre_autor, apellido_autor: a.apellido_autor };
			if (obj.id_autor) mapaIds.add(Number(obj.id_autor));
			if ((obj as any).id_usuario) mapaIds.add(Number((obj as any).id_usuario));
			return obj;
		});
		// Añadir desde selector los que no estén en el form
		for (const s of selectorAutores || []) {
			const idA = s.id_autor ? Number(s.id_autor) : null;
			const idU = s.id_usuario ? Number(s.id_usuario) : null;
			if ((idA && !mapaIds.has(idA)) || (idU && !mapaIds.has(idU))) {
				if (s.type === "usuario") {
					autoresNormalizados.push({
						id_usuario: Number(s.id_usuario),
						nombre_autor: s.nombre_autor,
						apellido_autor: s.apellido_autor,
					});
					if (idU) mapaIds.add(idU);
				} else {
					autoresNormalizados.push({
						id_autor: Number(s.id_autor),
						nombre_autor: s.nombre_autor,
						apellido_autor: s.apellido_autor,
					});
					if (idA) mapaIds.add(idA);
				}
			}
		}

		return {
			titulo_libro: valorTextoSeguro(valores.titulo_libro),
			codigo_isbn: valorTextoSeguro(valores.codigo_isbn) ?? undefined,
			paginas: valorNumeroSeguro(valores.paginas) ?? undefined,
			year_publicacion: valorNumeroSeguro(valores.year_publicacion) ?? undefined,
			id_idioma_original: valores.id_idioma_original != null ? Number(valores.id_idioma_original) : undefined,
			sinopsis: valorTextoSeguro(valores.sinopsis) ?? undefined,
			autores: autoresNormalizados,
			generos: (Array.isArray(valores.generos)
				? valores.generos
						.map((idGenero: any) => {
							const n = Number(idGenero);
							return Number.isFinite(n) && n > 0 ? n : null;
						})
						.filter((v: any) => v !== null)
				: []) as any,
		};
	}

	async guardarCambios(): Promise<void> {
		if (!this.libro || !this.puedeEditarLibro()) return;
		if (this.libroForm.invalid) {
			this.libroForm.markAllAsTouched();
			return;
		}
		// Forzar sincronización final: si el selector hijo tiene autores, asegurar que el FormControl los contenga
		try {
			const control = this.libroForm.controls["autores"] as FormControl;
			const selectorList = (this as any).autorSelector?.selected ? (this as any).autorSelector.selected() : null;
			if (Array.isArray(selectorList) && selectorList.length > 0) {
				control.setValue(selectorList);
				control.markAsDirty();
				control.updateValueAndValidity();
			}
		} catch (e) {
			console.warn("No se pudo sincronizar autores desde el selector antes de guardar:", e);
		}

		this.guardandoCambios = true;
		try {
			console.log("[DetalleLibro] Guardar cambios. Datos editados:", this.construirDatosLibroEditados());

			await firstValueFrom(this.libroService.actualizarLibro(this.libro.id_libro, this.construirDatosLibroEditados()));
			this.catalogoLibros.invalidateCache();
			await this.cargarDetalle(this.libro.id_libro);
			this.editando = false;
		} catch (error) {
			manejarError(error, "DetalleLibro.guardarCambios", { idLibro: this.libro.id_libro });
		} finally {
			this.guardandoCambios = false;
		}
	}

	async borrarLibro(): Promise<void> {
		if (!this.libro || !this.puedeEditarLibro()) return;
		if (!globalThis.window.confirm("¿Quieres eliminar este libro?")) return;
		this.borrando = true;
		try {
			await firstValueFrom(this.libroService.borrarLibro(this.libro.id_libro));
			this.catalogoLibros.invalidateCache();
			await this.router.navigate(["/catalogos/libros"]);
		} catch (error) {
			manejarError(error, "DetalleLibro.borrarLibro", { idLibro: this.libro.id_libro });
		} finally {
			this.borrando = false;
		}
	}

	async onComentarioCreado(): Promise<void> {
		const idLibro = this.libro?.id_libro;
		if (!idLibro || idLibro <= 0) return;
		await this.cargarDetalle(idLibro);
	}

	recargar(): void {
		const idLibro = this.libro?.id_libro;
		if (!idLibro || idLibro <= 0) return;
		this.cargarDetalle(idLibro);
	}
}

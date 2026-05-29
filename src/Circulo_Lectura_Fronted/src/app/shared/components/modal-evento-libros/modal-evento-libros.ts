import { Component, computed, effect, input, output, signal } from "@angular/core";
import { LibroResumen } from "@app/interfaces/modelosApp/modelosApp";
import { AuthService } from "@app/services/authService/auth-service";
import { ServicioCatalogoLibros } from "@app/services/servicioLibros/servicioCatalogoLibros";

@Component({
	selector: "app-modal-evento-libros",
	imports: [],
	templateUrl: "./modal-evento-libros.html",
	styleUrl: "./modal-evento-libros.css",
})
export class ModalEventoLibros {
	idEvento = input<number>(-1);
	librosOriginales = input<LibroResumen[]>([]);
	componenteInicializado = signal<boolean>(false);

	idsOriginales = computed(() => this.librosOriginales().map(libro => libro.id_libro));

	cargandoLibros = signal<boolean>(false);
	errorLibros = signal<string>("");
	feedback = signal<string>("");
	loadingAccion = signal<boolean>(false);
	errorSesion = signal<boolean>(false);
	actualizadosLibros = signal<boolean>(false);

	librosResto = signal<LibroResumen[]>([]);
	librosEvento = signal<LibroResumen[]>([]);

	librosActualizados = output();

	constructor(
		private readonly authService: AuthService,
		private readonly srvLibros: ServicioCatalogoLibros,
	) {
		console.log(
			"ModalEventoLibros - Constructor: idEvento =",
			this.idEvento(),
			"librosOriginales =",
			this.librosOriginales(),
		);
		effect(() => {
			const idUsuario = this.authService.usuario()?.usuario?.id_usuario;
			if (idUsuario && this.idEvento() !== -1) {
				console.log("ModalEventoLibros - Effect: Cargando libros para evento", this.idEvento(), "y usuario", idUsuario);
				this.cargarLibrosEvento();
			}
		});
		effect(() => {
			if (this.librosOriginales().length && this.librosEvento().length === 0 && !this.componenteInicializado()) {
				this.librosEvento.set([...this.librosOriginales()]);
				this.componenteInicializado.set(true);
				console.log(
					"ModalEventoLibros - Effect: librosEvento actualizados a partir de librosOriginales",
					this.librosEvento(),
				);
			}
		});
	}

	async cargarLibrosEvento() {
		this.cargandoLibros.set(true);
		this.errorLibros.set("");
		try {
			const restoLibros = (await this.srvLibros.getLibrosTodos()).filter(
				libro => !this.idsOriginales().includes(libro.id_libro),
			);
			console.log("Libros no relacionados con evento:", restoLibros);
			this.librosResto.set(restoLibros);
		} catch (err) {
			this.errorLibros.set("Error al cargar el resto de los libros");
		} finally {
			this.cargandoLibros.set(false);
		}
	}

	async openModal() {
		if (!this.authService.estaLogueado()) {
			this.errorSesion.set(true);
			this.feedback.set("Debes iniciar sesión para gestionar tus eventos.");
		}
		const idUsuario = this.authService.usuario()?.usuario?.id_usuario;
		if (idUsuario && this.idEvento() !== -1) {
			try {
				await this.cargarLibrosEvento();
			} catch {
				this.errorLibros.set("Error al cargar los libros del evento.");
			}
		}
		const modal = document.querySelector("dialog.modal-evento-libros") as HTMLDialogElement | null;
		modal?.showModal();
	}

	closeModal() {
		this.cargandoLibros.set(false);
		this.errorLibros.set("");
		this.feedback.set("");
		this.loadingAccion.set(false);
		this.errorSesion.set(false);
		this.librosResto.set([]);
		this.librosEvento.set([]);

		const modal = document.querySelector("dialog.modal-evento-libros") as HTMLDialogElement | null;
		modal?.close();
		if (this.actualizadosLibros()) {
			this.actualizadosLibros.set(false);
			this.librosActualizados.emit();
		}
	}

	toggleLibroEventoIN(idLibro: number) {
		const libro = this.librosResto().find(l => l.id_libro === idLibro);
		if (!libro) return;

		this.librosEvento.set([...this.librosEvento(), libro]);
		this.librosResto.set(this.librosResto().filter(l => l.id_libro !== idLibro));
	}

	toggleLibroEventoOUT(idLibro: number) {
		const libro = this.librosEvento().find(l => l.id_libro === idLibro);
		if (!libro) return;

		this.librosEvento.set(this.librosEvento().filter(l => l.id_libro !== idLibro));
		this.librosResto.set([...this.librosResto(), libro]);
	}

	async guardarCambios() {
		this.loadingAccion.set(true);
		this.feedback.set("");
		this.errorLibros.set("");

		try {
			const idsOriginales = this.librosOriginales().map(l => l.id_libro);
			const idsFinales = this.librosEvento().map(l => l.id_libro);

			const idsAgregar = idsFinales.filter(id => !idsOriginales.includes(id));
			const idsEliminar = idsOriginales.filter(id => !idsFinales.includes(id));

			// Petición 1: eliminar
			if (idsEliminar.length > 0) {
				try {
					await this.srvLibros.eliminarLibrosDeEvento(this.idEvento(), idsEliminar);
				} catch (err) {
					this.errorLibros.set("Error al eliminar algunos libros del evento. Intenta de nuevo.");
					return;
				}
			}

			// Petición 2: agregar
			if (idsAgregar.length > 0) {
				try {
					await this.srvLibros.agregarLibrosAEvento(this.idEvento(), idsAgregar);
				} catch (err) {
					this.errorLibros.set("Error al agregar algunos libros al evento. Intenta de nuevo.");
					return;
				}
			}

			this.feedback.set("Cambios guardados correctamente.");
			this.actualizadosLibros.set(true);
		} catch (err) {
			console.error("Error al guardar cambios en los libros del evento:", err);
		} finally {
			this.loadingAccion.set(false);
		}
	}
}

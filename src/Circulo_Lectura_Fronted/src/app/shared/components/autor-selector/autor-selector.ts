import { Component, effect, forwardRef, input, signal, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormControl } from "@angular/forms";
import { ServicioAutores } from "@services/servicioAutores/servicioAutores";
import { AuthService } from "@services/authService/auth-service";
import { manejarError } from "@utils/error.utils";

@Component({
	selector: "app-autor-selector",
	imports: [CommonModule, ReactiveFormsModule],
	templateUrl: "./autor-selector.html",
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => AutorSelector),
			multi: true,
		},
	],
})
export class AutorSelector implements ControlValueAccessor {
	allowCreate = input<boolean>(false);

	// Lista cargada desde backend
	opciones = signal<Array<any>>([]);
	// Valor interno: array de items seleccionados (señal para que la plantilla lo lea)
	selected = signal<any[]>([]);

	// Emitir cambios de selección al componente padre
	@Output() selectionChange = new EventEmitter<any[]>();

	// Form para búsqueda/selección
	buscarCtrl = new FormControl("");

	onChange: (v: any) => void = () => {};
	onTouched: () => void = () => {};

	constructor(
		private autoresSvc: ServicioAutores,
		private auth: AuthService,
	) {
		// cargar opciones inicialmente si usuario admin
		effect(() => this.loadOpciones());
	}

	get puedeCrear(): boolean {
		return this.allowCreate();
	}

	async loadOpciones() {
		try {
			const rol = Number(this.auth.usuario()?.usuario?.esAdministrador ?? 0);
			if (rol > 0) {
				const data = await this.autoresSvc.fetchAutores();
				// Normalizar y evitar duplicados con los ya seleccionados
				const normal = data
					.map((a: any) => ({
						type: "autor",
						id_autor: a.id_autor,
						nombre_autor: a.nombre_autor,
						apellido_autor: a.apellido_autor,
						displayName: `${a.nombre_autor || ""} ${a.apellido_autor || ""}`.trim(),
					}))
					.filter(Boolean);
				// Excluir los ya seleccionados
				const filtered = normal.filter(
					(opt: any) =>
						!this.selected().some(
							sel =>
								(sel.id_autor && sel.id_autor === opt.id_autor) ||
								(sel.id_usuario && sel.id_usuario === opt.id_usuario),
						),
				);
				this.opciones.set(filtered);
			}
		} catch (e) {
			manejarError(e, "AutorSelector.loadOpciones - Error al cargar autores", { original: e });
		}
	}

	writeValue(val: any): void {
		const incoming = Array.isArray(val) ? val : [];
		// Normalizar los items entrantes para asegurar nombres y ids uniformes
		const normalized = incoming.map((s: any) => {
			const id_autor = s.id_autor ?? s.id ?? undefined;
			const id_usuario = s.id_usuario ?? undefined;
			const nombre = s.nombre_autor ?? s.nombre_usuario ?? s.nombre ?? "";
			const apellido = s.apellido_autor ?? s.apellido_usuario ?? s.apellido ?? "";
			return {
				...s,
				type: s.type ?? (id_usuario ? "usuario" : id_autor ? "autor" : undefined),
				id_autor,
				id_usuario,
				nombre_autor: nombre,
				apellido_autor: apellido,
				displayName: s.displayName ?? `${nombre} ${apellido}`.trim(),
			};
		});
		this.selected.set(normalized);
		// Filtrar opciones para no mostrar los ya seleccionados
		this.opciones.set(
			(this.opciones() || []).filter(
				(opt: any) =>
					!this.selected().some(
						sel =>
							(sel.id_autor && sel.id_autor === opt.id_autor) || (sel.id_usuario && sel.id_usuario === opt.id_usuario),
					),
			),
		);
	}
	registerOnChange(fn: any): void {
		console.log("[AutorSelector] registerOnChange callback registrada");
		this.onChange = fn;
	}
	registerOnTouched(fn: any): void {
		this.onTouched = fn;
	}
	setDisabledState?(isDisabled: boolean): void {
		// no-op
	}

	addAutorFromOption(option: any) {
		const current = this.selected();
		const exists = current.some(
			(v: any) =>
				(v.id_autor && v.id_autor === option.id_autor) || (v.id_usuario && v.id_usuario === option.id_usuario),
		);
		if (!exists) {
			const next = [...current, option];
			this.selected.set(next);
			// Notificar síncronamente usando una copia para evitar problemas de referencia
			const snapshot = [...this.selected()];
			this.onChange(snapshot);
			this.selectionChange.emit(snapshot);
			// Quitar la opción de la lista de opciones si existía
			this.opciones.set(
				(this.opciones() || []).filter(
					(o: any) =>
						!(o.id_autor && option.id_autor && o.id_autor === option.id_autor) &&
						!(o.id_usuario && option.id_usuario && o.id_usuario === option.id_usuario),
				),
			);
		}
	}

	removeAutor(index: number) {
		const removed = this.selected()[index];
		const next = this.selected().filter((_, i) => i !== index);
		this.selected.set(next);
		const snapshot = [...this.selected()];
		this.onChange(snapshot);
		this.selectionChange.emit(snapshot);
		// Reinsertar en opciones si no existe ya, normalizando displayName
		if (removed) {
			const existsInOpc = (this.opciones() || []).some(
				(o: any) =>
					(o.id_autor && removed.id_autor && o.id_autor === removed.id_autor) ||
					(o.id_usuario && removed.id_usuario && o.id_usuario === removed.id_usuario),
			);
			if (!existsInOpc) {
				const nombre = removed.nombre_autor ?? removed.nombre_usuario ?? removed.nombre ?? "";
				const apellido = removed.apellido_autor ?? removed.apellido_usuario ?? removed.apellido ?? "";
				const display = removed.displayName ?? `${nombre} ${apellido}`.trim();
				const item = {
					...removed,
					nombre_autor: nombre,
					apellido_autor: apellido,
					displayName: display || "Sin nombre",
				};
				this.opciones.set([...(this.opciones() || []), item]);
			}
		}
	}

	async crearAutor(nombre: string, apellido: string) {
		try {
			if (!this.auth.estaLogueado()) {
				throw new Error("ERROR_USUARIO_NO_AUTENTICADO");
			}
			const created = await this.autoresSvc.crearAutor({ nombre_autor: nombre, apellido_autor: apellido });
			if (created && created.id_autor) {
				const item = {
					type: "autor",
					id_autor: created.id_autor,
					nombre_autor: created.nombre_autor,
					apellido_autor: created.apellido_autor,
					displayName: `${created.nombre_autor || ""} ${created.apellido_autor || ""}`.trim(),
				};
				console.log("[AutorSelector] autor creado en backend:", created);
				// Añadir al listado de opciones si no existe
				if (!this.opciones().some((o: any) => o.id_autor === item.id_autor)) {
					this.opciones.set([...(this.opciones() || []), item]);
				}
				// Seleccionar explícitamente el nuevo autor y notificar al form
				const next = [...this.selected(), item];
				this.selected.set(next);
				this.onChange(next);
				Promise.resolve().then(() => {
					this.onChange(this.selected());
					this.selectionChange.emit(this.selected());
				});
				// Quitar de opciones la entrada seleccionada
				this.opciones.set((this.opciones() || []).filter((o: any) => o.id_autor !== item.id_autor));
				console.log("[AutorSelector] opciones tras crear:", this.opciones());
				console.log("[AutorSelector] selected tras crear:", this.selected());
			}
		} catch (e) {
			manejarError(e, "AutorSelector.crearAutor - Error al crear autor", { original: e, nombre, apellido });
		}
	}

	async searchUsuarios(q: string) {
		if (!q || q.trim().length < 2) return;
		try {
			const users = await this.autoresSvc.buscarUsuarios(q);
			// map to opciones as usuarios
			const mapped = users
				.map((u: any) => ({
					type: "usuario",
					id_usuario: u.id_usuario,
					nombre_usuario: u.nombre_usuario,
					apellido_usuario: u.apellido_usuario ?? "",
					// normalizar campos para plantilla
					nombre_autor: u.nombre_usuario,
					apellido_autor: u.apellido_usuario ?? "",
					displayName: `${u.nombre_usuario || ""} ${u.apellido_usuario || ""}`.trim(),
				}))
				.filter(Boolean);
			// Excluir los ya seleccionados
			this.opciones.set(
				mapped.filter(
					(opt: any) =>
						!this.selected().some(
							sel =>
								(sel.id_autor && sel.id_autor === opt.id_autor) ||
								(sel.id_usuario && sel.id_usuario === opt.id_usuario),
						),
				),
			);
		} catch (e) {
			manejarError(e, "AutorSelector.searchUsuarios - Error al buscar usuarios", { original: e, q });
		}
	}
}

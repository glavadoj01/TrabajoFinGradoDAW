import { Component, input, output } from "@angular/core";

export interface OpcionFiltroDesplegable {
	id: number;
	etiqueta: string;
}

@Component({
	selector: "app-desplegable-filtros-libro",
	templateUrl: "./desplegable-filtros-libro.html",
})
export class DesplegableFiltrosLibro {
	readonly titulo = input.required<string>();
	readonly opciones = input.required<OpcionFiltroDesplegable[]>();
	readonly seleccionados = input.required<Set<number>>();
	readonly abierto = input<boolean>(false);

	readonly toggleOpcion = output<number>();

	onToggleOpcion(id: number): void {
		this.toggleOpcion.emit(id);
	}
}

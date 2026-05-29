import { Directive, effect, Input } from "@angular/core";
import { ServicioDetalleEvento } from "@services/servicioEventos/servicioDetalleEvento";
import { EventoResumen } from "@interfaces/modelosApp/modelosApp";

@Directive({
	selector: "app-evento-card",
})
export class EventoCardBaseComponent {
	@Input() evento!: EventoResumen;

	imagenPortada: string | null = null;

	constructor(private srvEvento: ServicioDetalleEvento) {
		effect(() => {
			if (this.evento.id_evento && !this.imagenPortada) {
				this.srvEvento.getPortadaEvento(this.evento.id_evento).then(portada => {
					this.imagenPortada = portada;
				});
			}
		});
	}

	getPortadaEvento(): string | void {
		if (this.evento.id_evento) {
			const idPortada = this.srvEvento.getPortadaEvento(this.evento.id_evento);
		}
	}
}

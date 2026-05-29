import { DatePipe, SlicePipe } from "@angular/common";
import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { HoraPipe } from "@pipes/hora.pipe";
import { EventoCardBaseComponent } from "../evento-card-base";

@Component({
	selector: "app-evento-pasado-card",
	templateUrl: "./evento-pasado-card.html",
	imports: [DatePipe, RouterLink, SlicePipe, HoraPipe],
})
export class EventoPasadoCardComponent extends EventoCardBaseComponent {}

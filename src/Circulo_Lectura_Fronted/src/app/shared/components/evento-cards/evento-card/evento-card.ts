import { DatePipe, SlicePipe } from "@angular/common";
import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { HoraPipe } from "@pipes/hora.pipe";
import { ImgDefault } from "@directives/img-default";
import { EventoCardBaseComponent } from "../evento-card-base";

@Component({
	selector: "app-evento-card",
	templateUrl: "./evento-card.html",
	imports: [DatePipe, RouterLink, SlicePipe, HoraPipe, ImgDefault],
})
export class EventoCardComponent extends EventoCardBaseComponent {}

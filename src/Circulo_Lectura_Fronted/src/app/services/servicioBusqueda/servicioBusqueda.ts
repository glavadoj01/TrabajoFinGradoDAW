import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class ServicioBusqueda {
	private readonly _term = signal<string | null>(null);
	term() {
		return this._term();
	}
	set(term: string | null) {
		this._term.set(term);
	}
}

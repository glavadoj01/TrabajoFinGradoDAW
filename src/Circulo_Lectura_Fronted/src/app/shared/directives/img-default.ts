import { Directive, ElementRef, HostListener, Input } from "@angular/core";

@Directive({
	selector: "[imgDefault]",
})
export class ImgDefault {
	private readonly _fallback = "/anonUser.png";
	@Input("imgDefault") fallback: string = this._fallback;

	constructor(private readonly el: ElementRef<HTMLImageElement>) {}

	@HostListener("error")
	protected onError(): void {
		const img = this.el.nativeElement;
		if (img.src !== this.fallback) {
			img.src = this.fallback;
		}
	}
}

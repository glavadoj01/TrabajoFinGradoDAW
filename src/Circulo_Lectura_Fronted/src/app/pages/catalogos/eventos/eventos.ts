import { Component, effect, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ServicioCatalogoEventos } from "@services/servicioEventos/servicioCatalogoEventos";
import { EventoResumen } from "@interfaces/modelosApp/modelosApp";
import { BannerCargando } from "@sharedComponents/banner-cargando/banner-cargando";
import { BannerError } from "@sharedComponents/banner-error/banner-error";
import { firstValueFrom } from "rxjs";
import { EventoCardComponent } from "@sharedComponents/evento-cards/evento-card/evento-card";
import { EventoPasadoCardComponent } from "@sharedComponents/evento-cards/evento-pasado-card/evento-pasado-card";
import { ModalEventoCreacion } from "@sharedComponents/modal-evento-creacion/modal-evento-creacion";
import { AuthService } from "@services/authService/auth-service";

@Component({
	selector: "app-eventos",
	imports: [CommonModule, FormsModule, EventoCardComponent, EventoPasadoCardComponent, BannerCargando, BannerError, ModalEventoCreacion],
	templateUrl: "./eventos.html",
	providers: [ServicioCatalogoEventos],
})
export class Eventos {
	busqueda = signal<string>("");
	// Estado para eventos próximos
	eventosProximos = signal<EventoResumen[]>([]);
	totalEventosProximos = signal<number>(0);
	totalPaginasProximos = signal<number>(1);
	paginaProximos = signal<number>(1);
	errorProximos = signal<boolean>(false);
	cargandoProximos = signal<boolean>(false);
	readonly pageSizeProximos = 4;

	// Estado para eventos pasados
	eventosPasados = signal<EventoResumen[]>([]);
	totalEventosPasados = signal<number>(0);
	totalPaginasPasados = signal<number>(1);
	paginaPasados = signal<number>(1);
	busquedaPasados = signal<string>("");
	errorPasados = signal<boolean>(false);
	cargandoPasados = signal<boolean>(false);
	readonly pageSizePasados = 2;
	private ultimaRevisionCache = -1;

	constructor(
		private readonly catalogoEventos: ServicioCatalogoEventos,
		readonly auth: AuthService,
	) {
		try {
			// Inicializar páginas desde el cache del servicio (independientes por tipo)
			this.paginaProximos.set(this.catalogoEventos.getPaginaCatalogoActual("proximos"));
			this.paginaPasados.set(this.catalogoEventos.getPaginaCatalogoActual("pasados"));
			effect(() => {
				const revision = this.catalogoEventos.cacheRevision();
				if (revision !== this.ultimaRevisionCache) {
					this.ultimaRevisionCache = revision;
					if (revision > 0) {
						void this.recargarEventos();
					}
				}
			});

			void this.cargarEventosProximos();
			void this.cargarEventosPasados();
		} catch (error) {
			console.error("[CatalogoEventos] Error al inicializar los eventos:", error);
		}
	}

	getUsuario(): number | null {
		return this.auth.usuario()?.sesion?.id_usuario ?? null;
	}

	async cargarEventosProximos(): Promise<void> {
		this.cargandoProximos.set(true);
		console.log(
			"[CatalogoEventos] Cargando eventos próximos. Página:",
			this.paginaProximos(),
			"Búsqueda:",
			this.busqueda(),
		);
		try {
			const [eventos, total] = await Promise.all([
				firstValueFrom(
					this.catalogoEventos.getEventos("proximos", this.busqueda(), this.paginaProximos(), this.pageSizeProximos),
				),
				firstValueFrom(this.catalogoEventos.getTotalEventos("proximos", this.busqueda())),
			]);
			console.log("[CatalogoEventos] Eventos próximos recibidos del servicio:", eventos);
			this.eventosProximos.set(eventos);
			this.totalEventosProximos.set(total);
			this.totalPaginasProximos.set(Math.max(1, Math.ceil(total / this.pageSizeProximos)));
		} catch (err) {
			console.error("[CatalogoEventos] Error al cargar eventos próximos:", err);
			this.errorProximos.set(true);
			this.totalPaginasProximos.set(1);
		} finally {
			this.cargandoProximos.set(false);
		}
	}

	async cargarEventosPasados(): Promise<void> {
		this.cargandoPasados.set(true);
		try {
			const [eventos, total] = await Promise.all([
				firstValueFrom(
					this.catalogoEventos.getEventos(
						"pasados",
						this.busquedaPasados(),
						this.paginaPasados(),
						this.pageSizePasados,
					),
				),
				firstValueFrom(this.catalogoEventos.getTotalEventos("pasados", this.busquedaPasados())),
			]);
			console.log("[CatalogoEventos] Eventos pasados recibidos del servicio:", eventos);
			this.eventosPasados.set(eventos);
			this.totalEventosPasados.set(total);
			this.totalPaginasPasados.set(Math.max(1, Math.ceil(total / this.pageSizePasados)));
		} catch (err) {
			console.error("[CatalogoEventos] Error al cargar eventos pasados:", err);
			this.errorPasados.set(true);
			this.totalPaginasPasados.set(1);
		} finally {
			this.cargandoPasados.set(false);
		}
	}

	buscarProximos(): void {
		this.paginaProximos.set(1);
		void this.cargarEventosProximos();
	}

	buscarPasados(): void {
		this.paginaPasados.set(1);
		void this.cargarEventosPasados();
	}

	cambiarPaginaProximos(p: number): void {
		this.paginaProximos.set(p);
		void this.cargarEventosProximos();
	}

	cambiarPaginaPasados(p: number): void {
		this.paginaPasados.set(p);
		void this.cargarEventosPasados();
	}

	async recargarEventos(): Promise<void> {
		await Promise.all([this.cargarEventosProximos(), this.cargarEventosPasados()]);
	}
}

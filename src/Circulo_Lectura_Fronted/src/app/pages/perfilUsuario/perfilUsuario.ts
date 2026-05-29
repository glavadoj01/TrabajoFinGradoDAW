import { Component, effect, inject, signal } from "@angular/core";
import { UsuarioCompleto } from "@interfaces/modelosApp/modelosApp";
import { ServicioUsuario } from "@services/servicioUsuario/servicioUsuario";
import { UsuarioCard } from "@sharedComponents/usuario-card/usuario-card";
import { ListaCardComponent } from "@sharedComponents/lista-card/lista-card";
import { ComentarioExistente } from "@sharedComponents/comentarioExistente/comentarioExistente";
import { LibroCard } from "@sharedComponents/libro-card/libro-card";
import { forkJoin, firstValueFrom, map } from "rxjs";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { BannerCargando } from "@sharedComponents/banner-cargando/banner-cargando";
import { BannerError } from "@sharedComponents/banner-error/banner-error";
import { EventoCardComponent } from "@sharedComponents/evento-cards/evento-card/evento-card";
import { toSignal } from "@angular/core/rxjs-interop";
import { ModalEditarUsuario } from "@sharedComponents/modal-editar-usuario/modal-editar-usuario";

@Component({
	selector: "app-perfil-usuario",
	imports: [
		UsuarioCard,
		ListaCardComponent,
		ComentarioExistente,
		LibroCard,
		RouterLink,
		BannerCargando,
		BannerError,
		EventoCardComponent,
		ModalEditarUsuario,
	],
	templateUrl: "./perfilUsuario.html",
})
export class PerfilUsuario {
	private readonly usuarioSrv = inject(ServicioUsuario);
	private readonly route = inject(ActivatedRoute);

	readonly usuario = signal<Partial<UsuarioCompleto>>({});
	readonly cargando = signal<boolean>(true);
	readonly encontrado = signal<boolean>(false);
	readonly idRuta = toSignal(this.route.paramMap.pipe(map(params => Number(params.get("id") ?? -1))), {
		initialValue: -1,
	});

	modalEditar = signal<boolean>(false);

	tabActiva = signal<"listas" | "criticas" | "eventos" | "libros">("libros");

	constructor() {
		effect(() => {
			const id = this.idRuta();
			if (Number.isFinite(id) && id > 0) {
				void this.cargarPerfil(id);
				return;
			}
			this.cargando.set(false);
			this.encontrado.set(false);
		});
	}

	private async cargarPerfil(id: number): Promise<void> {
		this.cargando.set(true);
		try {
			const r = await firstValueFrom(
				forkJoin({
					base: this.usuarioSrv.getUsuarioCompleto(id),
					leidos: this.usuarioSrv.getLibrosLeidos(id),
					pendientes: this.usuarioSrv.getLibrosPendientes(id),
					listasCreadas: this.usuarioSrv.getListasCreadas(id),
					listasSeguidas: this.usuarioSrv.getListasSeguidas(id),
					criticas: this.usuarioSrv.getCriticas(id),
					eventosCreados: this.usuarioSrv.getEventosCreados(id),
					eventosAsistidos: this.usuarioSrv.getEventosAsistidos(id),
				}),
			);

			if (r.base.id_usuario) {
				const avatarUrl = ServicioUsuario.avatarUsuario(r.base.id_usuario);
				this.usuario.set({
					...r.base,
					avatarUrl,
					librosLeidos: r.leidos,
					librosPendientes: r.pendientes,
					listasCreadas: r.listasCreadas,
					listasSeguidas: r.listasSeguidas,
					criticas: r.criticas,
					eventosCreados: r.eventosCreados,
					eventosAsistidos: r.eventosAsistidos,
				});
				this.encontrado.set(true);
			} else {
				this.encontrado.set(false);
			}
		} catch {
			this.encontrado.set(false);
		} finally {
			this.cargando.set(false);
		}
	}

	abrirModalEditar() {
		console.log("Abriendo modal de edición para el usuario con ID:", this.usuario().id_usuario);
		this.modalEditar.set(true);
	}

	cerrarModalEditar() {
		this.modalEditar.set(false);
		void this.cargarPerfil(this.usuario().id_usuario!);
	}
}

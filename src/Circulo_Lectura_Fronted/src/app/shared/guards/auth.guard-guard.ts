import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "@services/authService/auth-service";

export const authGuard: CanActivateFn = () => {
	const auth = inject(AuthService);
	const router = inject(Router);

	return auth.estaLogueado() ? true : router.parseUrl("/auth/login");
};

export const adminGuard: CanActivateFn = () => {
	const auth = inject(AuthService);
	const router = inject(Router);

	const u = auth.usuario();
	return u?.usuario?.esAdministrador ? true : router.parseUrl("/auth/login");
};

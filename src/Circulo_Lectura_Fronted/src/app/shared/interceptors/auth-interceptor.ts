// auth.interceptor.ts
import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "@services/authService/auth-service";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
	const auth = inject(AuthService);
	const router = inject(Router);

	const token = auth.token();

	const authReq = token
		? req.clone({
				setHeaders: {
					Authorization: `Bearer ${token}`,
				},
			})
		: req;

	return next(authReq).pipe(
		catchError(err => {
			const esRutaAuth = req.url.includes("/auth/login") || req.url.includes("/auth/logout");

			if (err.status === 401 && !esRutaAuth) {
				auth.logout();
				router.navigate(["/auth/login"]);
			}
			return throwError(() => err);
		}),
	);
};

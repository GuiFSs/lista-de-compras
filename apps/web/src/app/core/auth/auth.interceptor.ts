import { inject } from '@angular/core';
import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { AUTH_API_LOGIN_URL } from './auth-config';
import { SessionService } from './session.service';

/**
 * Anexa `Authorization: Bearer` com sessão ativa; em 401, logout + redirect.
 * Login (`AUTH_API_LOGIN_URL`) fica de fora: ali 401 = credenciais inválidas.
 */
export const authInterceptorFn: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (request.url === AUTH_API_LOGIN_URL) {
    return next(request);
  }

  const token = session.accessToken();
  if (!token) {
    return next(request);
  }

  // Evita anexar token a requisições claramente cross-origin.
  if (!request.url.startsWith('/') && !request.url.includes('localhost')) {
    return next(request);
  }

  const cloned = request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(cloned).pipe(
    catchError((err: unknown) => {
      if (err && (err as { status?: number }).status === 401) {
        session.logout();
        router.navigate(['/login'], {
          queryParams: { returnUrl: router.url },
        });
      }
      return throwError(() => err);
    }),
  );
};

export const authInterceptor = authInterceptorFn;

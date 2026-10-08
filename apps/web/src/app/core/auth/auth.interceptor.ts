// Auth HTTP Interceptor (T10 do PLAN.md Autenticação).
// Anexa o header Authorization: Bearer <token> e trata 401 → logout + redirect.
//
// Interceptor FUNCIONAL (HttpInterceptorFn): o `inject()` no corpo roda
// em contexto de injeção — o Angular invoca interceptores funcionais
// dentro de `runInInjectionContext`. Não há instância de classe criada
// no nível do módulo (o que quebraria com NG0203 fora de um contexto
// de injeção).

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
 * Anexa `Authorization: Bearer <token>` quando há sessão ativa e
 * encerra a sessão ao receber 401 em requisições autenticadas.
 *
 * - Endpoint público de login (`AUTH_API_LOGIN_URL`): repassa sem
 *   header e sem tratamento de 401 — ali 401 significa "credenciais
 *   inválidas" (AC3), não fim de sessão.
 * - Demais requisições: com token, anexa o header; 401 → logout +
 *   volta ao login preservando a URL pretendida como `returnUrl`
 *   (AC12) e **re lança** o erro para quem chamou (o observador
 *   continua recebendo o `HttpErrorResponse`).
 */
export const authInterceptorFn: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const session = inject(SessionService);
  const router = inject(Router);

  // Endpoint público: sem header, sem tratamento de 401 (AC3).
  if (request.url === AUTH_API_LOGIN_URL) {
    return next(request);
  }

  // Anexa token apenas a requisições da mesma origem
  const token = session.accessToken();
  if (!token) {
    return next(request);
  }

  // Não anexar token para requisições cross-origin
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
        // Preserva a URL pretendida como returnUrl (AC12).
        router.navigate(['/login'], {
          queryParams: { returnUrl: router.url },
        });
      }
      // O erro segue para quem chamou (HttpErrorResponse no observer).
      return throwError(() => err);
    }),
  );
};

/** Nome público usado pelo barrel (`core/auth`) e pelo `app.config`. */
export const authInterceptor = authInterceptorFn;

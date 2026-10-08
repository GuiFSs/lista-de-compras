import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';
import { sanitizeReturnUrl } from './return-url';

/** Se já há sessão, redireciona para `returnUrl` (ou `/`); senão permite `/login`. */
export const loginGuard: CanActivateFn = (route) => {
  // Injeta SessionService para hidratar o storage antes da decisão (reload).
  const router = inject(Router);
  const session = inject(SessionService);

  if (session.hasValidSession()) {
    // Apenas paths internos absolutos — evita open redirect.
    const returnUrl = sanitizeReturnUrl(route.queryParams['returnUrl']) ?? '/';
    return router.parseUrl(returnUrl);
  }

  return true;
};

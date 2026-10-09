import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

/** Exige sessão válida; sem sessão, redireciona para `/login` com `returnUrl`. */
export const authGuard: CanActivateFn = (_route, state) => {
  // Injeta SessionService para hidratar o storage antes da decisão (reload/deep link).
  const router = inject(Router);
  const session = inject(SessionService);

  if (session.hasValidSession()) {
    return true;
  }

  const url = state.url || '/';
  const queryParams = url === '/' ? {} : { returnUrl: url };
  void router.navigate(['/login'], { queryParams });
  return false;
};

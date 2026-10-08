// AuthGuard — guarde rotas que exigem sessão ativa (RN10/AC-12).
//
// - Se há sessão válida (token no signal + não expirado): permite.
// - Se NÃO há sessão válida: redireciona para /login, preservando a
//   URL pretendida como returnUrl (para o loginGuard devolver depois).
//
// O guard INJETA o SessionService antes de ler a sessão: o serviço
// é o responsável por hidratar o token do localStorage (recarga de
// página/deep link — AC-12/AC-13). Sem a injeção, o guard lería o
// signal antes de o serviço nascer e veria "sem sessão" mesmo com
// token válido armazenado.
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const session = inject(SessionService);

  if (session.hasValidSession()) {
    // Usuário autenticado: permite a navegação
    return true;
  }

  // Usuário sem sessão: redireciona para login, guardando a URL
  // pretendida como returnUrl. A raiz ('/') dispensa o parâmetro —
  // é o destino padrão após o login (loginGuard sem returnUrl).
  const url = state.url || '/';
  const queryParams = url === '/' ? {} : { returnUrl: url };
  void router.navigate(['/login'], { queryParams });
  return false;
};

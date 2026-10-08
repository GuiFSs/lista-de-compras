// LoginGuard — guarde a rota /login: se já tem sessão válida, vai para
// a rota original (returnUrl) ou a raiz (''). Se não tem sessão, permite
// a navegação (exibir a tela de login).
//
// Fluxo:
//  1. Guarda ativa o guard na rota /login.
//  2. Se o usuário já estiver logado (hasValidSession), captura o returnUrl
//     das queryParams (setado pelo authGuard) e navega para ele (ou '/').
//  3. Se não estiver logado, deixa a navegação prosseguir (mostrar tela de login).
//
// O returnUrl é SANITIZADO (sanitizeReturnUrl): apenas caminhos
// internos absolutos ('/...' sem '//') são aceitos — returnUrl
// externo (ex.: 'https://evil.example') é rejeitado para evitar
// open redirect, caindo de volta na raiz.
//
// Assim como o authGuard, o guard INJETA o SessionService para
// forçar a hydration do storage antes de decidir (recarga de
// página com sessão válida em /login — AC12/AC13).
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';
import { sanitizeReturnUrl } from './return-url';

export const loginGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const session = inject(SessionService);

  if (session.hasValidSession()) {
    // Usuário já logado: volta à rota original (ou raiz).
    // returnUrl inválido/externo → raiz (sem open redirect).
    // Retornamos um UrlTree (padrão Angular para redirect em guard):
    // o router trata o redirect como parte da MESMA navegação.
    const returnUrl = sanitizeReturnUrl(route.queryParams['returnUrl']) ?? '/';
    return router.parseUrl(returnUrl);
  }

  // Usuário sem sessão: permite a exibição da tela de login
  return true;
};

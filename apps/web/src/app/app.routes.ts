// Rotas da PWA (RN10/AC12).
//
// - `/login`: tela cheia, fora da navegação (AC1), com guard anti-sessão —
//   com sessão válida vai para a rota original (returnUrl) ou a raiz.
// - `''`: rota raiz com guard autenticado → shell com app-bar (logout) e
//   filhos `''` (home placeholder, mobile-first, sem bottom nav) e `**`
//   (placeholder autenticado que preserva a URL para o returnUrl). Sem sessão,
//   qualquer rota/deep link/recarga cai no login guardando a URL pretendida (AC12).
import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/auth';
import { Home } from './features/home/home';
import { NotFound } from './features/not-found/not-found';
import { AuthenticatedShell } from './layout/authenticated-shell/authenticated-shell';

export const appRoutes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    component: AuthenticatedShell,
    children: [
      { path: '', component: Home },
      { path: '**', component: NotFound },
    ],
  },
  // Fallback 404 — caso a navegação termine em lugar nenhum
  // (opcional; o NotFound já cobre o ** do shell).
];
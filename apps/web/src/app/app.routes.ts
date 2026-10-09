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
      import('./features/login/login.component').then((m) => m.LoginComponent),
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
];

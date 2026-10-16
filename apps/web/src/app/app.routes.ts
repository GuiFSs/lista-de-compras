import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/auth';
import { NotFound } from './features/not-found/not-found';
import { ShoppingListPage } from './features/shopping-list/shopping-list-page';
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
      { path: '', component: ShoppingListPage },
      { path: '**', component: NotFound },
    ],
  },
];

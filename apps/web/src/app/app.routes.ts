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
      {
        path: 'historico',
        loadComponent: () =>
          import('./features/price-history/history-page').then(
            (m) => m.HistoryPage,
          ),
      },
      {
        path: 'historico/:id',
        loadComponent: () =>
          import('./features/price-history/history-detail-page').then(
            (m) => m.HistoryDetailPage,
          ),
      },
      {
        path: 'menor-preco',
        loadComponent: () =>
          import('./features/price-history/lowest-price-page').then(
            (m) => m.LowestPricePage,
          ),
      },
      {
        path: 'menor-preco/:item',
        loadComponent: () =>
          import('./features/price-history/lowest-price-by-market-page').then(
            (m) => m.LowestPriceByMarketPage,
          ),
      },
      { path: '**', component: NotFound },
    ],
  },
];

// Tabela de rotas da navegação (AC-01/AC-02/RN-12): a PWA mantém a Lista em `/`
// e registra Histórico, detalhe e Menor preço como filhas do shell autenticado.
//
// A spec da bottom nav prova o `href`/aba ativa; aqui a prova é do registro real
// em `appRoutes` — inclusive que cada rota nova entrega o componente da tela
// (o `loadComponent` lazy é resolvido de verdade, não só declarado).
import type { Route } from '@angular/router';
import { appRoutes } from './app.routes';
import { authGuard } from './core/auth';
import { NotFound } from './features/not-found/not-found';
import { HistoryDetailPage } from './features/price-history/history-detail-page';
import { HistoryPage } from './features/price-history/history-page';
import { LowestPricePage } from './features/price-history/lowest-price-page';
import { ShoppingListPage } from './features/shopping-list/shopping-list-page';
import { AuthenticatedShell } from './layout/authenticated-shell/authenticated-shell';

function shellRoute(): Route {
  const route = appRoutes.find((candidate) => candidate.path === '');
  if (!route) throw new Error('Rota raiz ("") não registrada');
  return route;
}

function childRoute(path: string): Route {
  const route = (shellRoute().children ?? []).find((candidate) => candidate.path === path);
  if (!route) throw new Error(`Rota "${path}" não registrada no shell`);
  return route;
}

/** Resolve o `loadComponent` lazy (executa o `import()` do chunk da tela). */
async function resolveComponent(route: Route): Promise<unknown> {
  const load = route.loadComponent;
  if (typeof load !== 'function') throw new Error(`Rota "${route.path}" não é lazy`);
  const component: unknown = await load();
  return component;
}

describe('appRoutes — navegação da feature (AC-01/AC-02/RN-12)', () => {
  it('mantém a Lista em `/` dentro do shell autenticado', () => {
    const shell = shellRoute();

    expect(shell.component).toBe(AuthenticatedShell);
    expect(shell.canActivate).toContain(authGuard);
    expect(childRoute('').component).toBe(ShoppingListPage);
  });

  it('registra Histórico, detalhe e Menor preço entregando a tela real', async () => {
    expect(await resolveComponent(childRoute('historico'))).toBe(HistoryPage);
    expect(await resolveComponent(childRoute('historico/:id'))).toBe(HistoryDetailPage);
    expect(await resolveComponent(childRoute('menor-preco'))).toBe(LowestPricePage);
  });

  it('deixa o curinga por último, depois das rotas reais', () => {
    const children = shellRoute().children ?? [];
    const last = children[children.length - 1];

    expect(last.path).toBe('**');
    expect(last.component).toBe(NotFound);
  });
});

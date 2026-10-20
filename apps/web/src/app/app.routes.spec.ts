// Tabela de rotas da navegação (AC-01/AC-02/RN-12): a PWA mantém a Lista em `/`
// e registra Histórico, detalhe e Menor preço como filhas do shell autenticado.
//
// A spec da bottom nav prova o `href`/aba ativa; aqui a prova é do registro real
// em `appRoutes` — inclusive que cada rota nova entrega o componente da tela
// (o `loadComponent` lazy é resolvido de verdade, não só declarado).
import type { Route } from '@angular/router';
import { ActivatedRoute, Router, RouterOutlet, provideRouter } from '@angular/router';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { appRoutes } from './app.routes';
import { authGuard } from './core/auth';
import { NotFound } from './features/not-found/not-found';
import { HistoryDetailPage } from './features/price-history/history-detail-page';
import { HistoryPage } from './features/price-history/history-page';
import { LowestPriceByMarketPage } from './features/price-history/lowest-price-by-market-page';
import { LowestPricePage } from './features/price-history/lowest-price-page';
import { ShoppingListPage } from './features/shopping-list/shopping-list-page';
import { AuthenticatedShell } from './layout/authenticated-shell/authenticated-shell';

function shellRoute(): Route {
  const route = appRoutes.find((candidate) => candidate.path === '');
  if (!route) throw new Error('Rota raiz ("") não registrada');
  return route;
}

function childRoute(path: string): Route {
  const route = (shellRoute().children ?? []).find(
    (candidate) => candidate.path === path,
  );
  if (!route) throw new Error(`Rota "${path}" não registrada no shell`);
  return route;
}

/** Resolve o `loadComponent` lazy (executa o `import()` do chunk da tela). */
async function resolveComponent(route: Route): Promise<unknown> {
  const load = route.loadComponent;
  if (typeof load !== 'function')
    throw new Error(`Rota "${route.path}" não é lazy`);
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
    expect(await resolveComponent(childRoute('historico/:id'))).toBe(
      HistoryDetailPage,
    );
    expect(await resolveComponent(childRoute('menor-preco'))).toBe(
      LowestPricePage,
    );
    expect(await resolveComponent(childRoute('menor-preco/:item'))).toBe(
      LowestPriceByMarketPage,
    );
  });

  it('deixa o curinga por último, depois das rotas reais', () => {
    const children = shellRoute().children ?? [];
    const last = children[children.length - 1];

    expect(last.path).toBe('**');
    expect(last.component).toBe(NotFound);
  });
});

// Prova do contrato do segmento `:item` (RN-09/CD-07/R-2): o router decodifica
// **por segmento**, então `caf%C3%A9` chega como `café` e `leite%2Fa%C3%A7%C3%BAcar`
// como `leite/açúcar` — a barra não divide o caminho. A tela repassa o valor cru
// ao store; percent-encodar é da borda de dados.
describe('appRoutes — decodificação do segmento `:item` (AC-05/R-2)', () => {
  @Component({ template: '' })
  class Probe {
    static lastItem: string | null = null;

    constructor() {
      const route = inject(ActivatedRoute);
      Probe.lastItem = route.snapshot.paramMap.get('item');
    }
  }

  @Component({
    imports: [RouterOutlet],
    template: '<router-outlet />',
  })
  class Host {}

  async function navigateTo(url: string): Promise<void> {
    TestBed.resetTestingModule();
    Probe.lastItem = null;
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([{ path: 'menor-preco/:item', component: Probe }]),
        provideLocationMocks(),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
  }

  it('resolve `caf%C3%A9` para o item `café` (acento preservado)', async () => {
    await navigateTo('/menor-preco/caf%C3%A9');

    expect(Probe.lastItem).toBe('café');
  });

  it('resolve `leite%2Fa%C3%A7%C3%BAcar` como um único segmento (round-trip R-2)', async () => {
    await navigateTo('/menor-preco/leite%2Fa%C3%A7%C3%BAcar');

    expect(Probe.lastItem).toBe('leite/açúcar');
  });
});

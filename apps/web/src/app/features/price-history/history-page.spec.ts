import { provideLocationMocks } from '@angular/common/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { PurchaseListItem } from '@lista/contracts';
import { DEFAULT_SHELL_TITLE, ShellChromeService } from '../../layout/shell-chrome';
import { HistoryPage } from './history-page';
import { PriceHistoryStore } from './state';
import type { LoadableState } from './state';

@Component({ selector: 'app-blank-outlet', template: '' })
class Blank {}

function purchase(overrides: Partial<PurchaseListItem> = {}): PurchaseListItem {
  return {
    id: 'c1',
    market: 'Mercado Central',
    purchaseDate: '2026-10-01',
    itemCount: 1,
    createdAt: '2026-10-01T09:00:00.000Z',
    ...overrides,
  };
}

/** Store de teste: a página só lê a lista e dispara `loadPurchases` (RN-19). */
class StoreStub {
  readonly purchases = signal<LoadableState<readonly PurchaseListItem[]>>({
    status: 'loading',
    data: [],
    error: null,
  });
  readonly loadPurchases = vi.fn((): Promise<void> => Promise.resolve());
}

function root(fixture: ComponentFixture<HistoryPage>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** Texto normalizado do primeiro nó que casa com o seletor. */
function textOf(scope: ParentNode, selector: string): string {
  return (scope.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('HistoryPage', () => {
  let store: StoreStub;
  let chrome: ShellChromeService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    store = new StoreStub();
    TestBed.configureTestingModule({
      providers: [
        { provide: PriceHistoryStore, useValue: store },
        provideRouter([
          { path: 'historico', component: Blank },
          { path: 'historico/:id', component: Blank },
        ]),
        provideLocationMocks(),
      ],
    });
    chrome = TestBed.inject(ShellChromeService);
  });

  function mount(): ComponentFixture<HistoryPage> {
    const fixture = TestBed.createComponent(HistoryPage);
    fixture.detectChanges();
    return fixture;
  }

  it('busca as compras ao entrar e mostra o skeleton na forma da lista (AC-13)', () => {
    const fixture = mount();
    const element = root(fixture);

    expect(store.loadPurchases).toHaveBeenCalledTimes(1);

    const skeleton = element.querySelector('.history-skeleton');
    expect(skeleton?.getAttribute('role')).toBe('status');
    expect(skeleton?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelectorAll('.history-skeleton__row')).toHaveLength(3);
    expect(element.querySelector('.visually-hidden')?.textContent?.trim()).toBe(
      'Carregando o histórico…',
    );
    // Skeleton no formato das linhas: nada de spinner centralizado nem conteúdo.
    expect(element.querySelector('.spinner')).toBeNull();
    expect(element.querySelector('.empty')).toBeNull();
    expect(element.querySelector('.load-error')).toBeNull();
    expect(element.querySelectorAll('.btn-primary')).toHaveLength(0);
  });

  it('contribui o título "Histórico" na app bar e devolve ao default ao sair (AC-01)', () => {
    const fixture = mount();

    expect(chrome.title()).toBe('Histórico');
    expect(chrome.actions()).toHaveLength(0);

    fixture.destroy();

    expect(chrome.title()).toBe(DEFAULT_SHELL_TITLE);
  });

  it('sem compras, mostra o empty state rico com um único CTA primary (AC-12)', () => {
    store.purchases.set({ status: 'loaded', data: [], error: null });
    const fixture = mount();
    const element = root(fixture);

    expect(element.querySelector('.empty__sticker')?.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector('.empty__title')?.textContent?.trim()).toBe('Nenhuma compra ainda');
    expect(element.querySelector('.empty__text')?.textContent?.trim()).not.toBe('');

    const primaries = element.querySelectorAll('.btn-primary');
    expect(primaries).toHaveLength(1);
    expect(primaries[0].textContent?.trim()).toBe('Ir para a lista');
    expect(primaries[0].getAttribute('href')).toBe('/');

    // Vazio não tem lista nem apoio.
    expect(element.querySelector('.history')).toBeNull();
    expect(element.querySelector('.summary')).toBeNull();
  });

  it('lista cada compra com data e mercado, na ordem do serviço (AC-06/RN-08)', () => {
    store.purchases.set({
      status: 'loaded',
      // Ordem como o serviço entrega (mais recente primeiro) — a tela não reordena.
      data: [
        purchase({ id: 'b', market: 'Rede Norte', purchaseDate: '2026-10-10', itemCount: 2 }),
        purchase({ id: 'a', market: 'Mercado Central', purchaseDate: '2026-10-01', itemCount: 1 }),
      ],
      error: null,
    });
    const fixture = mount();
    const element = root(fixture);

    const rows = Array.from(element.querySelectorAll('.history__link'));
    expect(rows.map((row) => textOf(row, '.history__date'))).toEqual([
      '10/10/2026',
      '01/10/2026',
    ]);
    expect(rows.map((row) => textOf(row, '.history__meta'))).toEqual([
      'Rede Norte · 2 itens',
      'Mercado Central · 1 item',
    ]);
    expect(rows.map((row) => row.getAttribute('href'))).toEqual([
      '/historico/b',
      '/historico/a',
    ]);
    expect(element.querySelector('.summary')?.textContent?.trim()).toBe('2 compras');
    expect(element.querySelector('ul')?.getAttribute('role')).toBe('list');
    expect(element.querySelector('.empty')).toBeNull();
  });

  it('com uma compra só, o apoio fica no singular', () => {
    store.purchases.set({ status: 'loaded', data: [purchase()], error: null });
    const fixture = mount();

    expect(root(fixture).querySelector('.summary')?.textContent?.trim()).toBe('1 compra');
  });

  it('tocar numa compra abre o detalhe daquela compra (AC-11)', async () => {
    store.purchases.set({ status: 'loaded', data: [purchase()], error: null });
    const fixture = mount();
    const router = TestBed.inject(Router);

    (root(fixture).querySelector('.history__link') as HTMLAnchorElement).click();
    await fixture.whenStable();

    expect(router.url).toBe('/historico/c1');
  });

  it('em falha de carga, mostra o erro na área e "Tentar novamente" refaz o GET (AC-14)', () => {
    store.purchases.set({ status: 'error', data: [], error: 'Falha de rede. Verifique a conexão e tente novamente.' });
    const fixture = mount();
    const element = root(fixture);

    const error = element.querySelector('.load-error');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(error?.textContent).toContain('Não foi possível carregar o histórico');
    expect(error?.textContent).toContain('Falha de rede');
    expect(element.querySelector('.history-skeleton')).toBeNull();
    expect(element.querySelector('.empty')).toBeNull();

    const retry = element.querySelector('.load-error .btn-secondary') as HTMLButtonElement;
    expect(retry.textContent?.trim()).toBe('Tentar novamente');

    retry.click();

    expect(store.loadPurchases).toHaveBeenCalledTimes(2);
  });
});

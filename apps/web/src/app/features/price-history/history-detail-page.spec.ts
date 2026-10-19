import { provideLocationMocks } from '@angular/common/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import type { PurchaseDetailResponse } from '@lista/contracts';
import { DEFAULT_SHELL_TITLE, ShellChromeService } from '../../layout/shell-chrome';
import { HistoryDetailPage } from './history-detail-page';
import { PriceHistoryStore } from './state';
import type { PurchaseDetailState } from './state';

@Component({ selector: 'app-blank-outlet', template: '' })
class Blank {}

function purchase(overrides: Partial<PurchaseDetailResponse> = {}): PurchaseDetailResponse {
  return {
    id: 'c1',
    market: 'Mercado Central',
    purchaseDate: '2026-10-15',
    items: [
      { name: 'Café', quantity: 2, unit: 'pacote', unitPrice: 7.5 },
      { name: 'Arroz', quantity: 1, unit: 'kg', unitPrice: 21.9 },
    ],
    createdAt: '2026-10-15T12:00:00.000Z',
    ...overrides,
  };
}

/** Store de teste: o detalhe só lê a seleção, refaz o GET e descarta ao sair. */
class StoreStub {
  readonly detail = signal<PurchaseDetailState>({
    status: 'loading',
    data: null,
    error: null,
    selectedId: null,
  });
  readonly loadPurchase = vi.fn((): Promise<void> => Promise.resolve());
  readonly clearPurchase = vi.fn((): void => undefined);
}

function root(fixture: ComponentFixture<HistoryDetailPage>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** Texto normalizado do primeiro nó que casa com o seletor. */
function textOf(scope: ParentNode, selector: string): string {
  return (scope.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('HistoryDetailPage', () => {
  let store: StoreStub;
  let chrome: ShellChromeService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    store = new StoreStub();
    TestBed.configureTestingModule({
      providers: [
        { provide: PriceHistoryStore, useValue: store },
        provideRouter([{ path: 'historico', component: Blank }]),
        provideLocationMocks(),
        // Depois do `provideRouter`: o array de providers deixa o último vencer,
        // e o router também registra um `ActivatedRoute` raiz (sem params).
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'c1' }) } },
        },
      ],
    });
    chrome = TestBed.inject(ShellChromeService);
  });

  function mount(): ComponentFixture<HistoryDetailPage> {
    const fixture = TestBed.createComponent(HistoryDetailPage);
    fixture.detectChanges();
    return fixture;
  }

  it('busca a compra do id da rota e mostra o skeleton na forma do detalhe (AC-13)', () => {
    const fixture = mount();
    const element = root(fixture);

    expect(store.loadPurchase).toHaveBeenCalledWith('c1');

    const skeleton = element.querySelector('.detail-skeleton');
    expect(skeleton?.getAttribute('role')).toBe('status');
    expect(skeleton?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelectorAll('.detail-skeleton__row')).toHaveLength(3);
    expect(element.querySelector('.visually-hidden')?.textContent?.trim()).toBe(
      'Carregando a compra…',
    );
    expect(element.querySelector('.spinner')).toBeNull();
    expect(element.querySelector('.load-error')).toBeNull();
  });

  it('contribui o título na app bar e descarta a seleção ao sair (AC-11/RN-19)', () => {
    const fixture = mount();

    expect(chrome.title()).toBe('Compra');
    expect(chrome.actions()).toHaveLength(0);

    fixture.destroy();

    expect(store.clearPurchase).toHaveBeenCalledTimes(1);
    expect(chrome.title()).toBe(DEFAULT_SHELL_TITLE);
  });

  it('mostra data, mercado e os itens comprados daquela conclusão (AC-11)', () => {
    store.detail.set({ status: 'loaded', data: purchase(), error: null, selectedId: 'c1' });
    const fixture = mount();
    const element = root(fixture);

    expect(element.querySelector('.detail__market')?.textContent?.trim()).toBe('Mercado Central');
    expect(element.querySelector('.detail__date')?.textContent?.trim()).toBe('15/10/2026');

    const items = Array.from(element.querySelectorAll('.detail__item'));
    expect(items.map((item) => textOf(item, '.detail__item-name'))).toEqual(['Café', 'Arroz']);
    expect(items.map((item) => textOf(item, '.detail__item-meta'))).toEqual([
      '2 pacote · R$ 7,50',
      '1 kg · R$ 21,90',
    ]);

    const list = element.querySelector('.detail__items');
    expect(list?.getAttribute('role')).toBe('list');
    expect(list?.getAttribute('aria-label')).toBe('Itens comprados');

    const back = element.querySelector('.page-back') as HTMLAnchorElement;
    expect(back.getAttribute('aria-label')).toBe('Voltar para o histórico');
    expect(back.getAttribute('href')).toBe('/historico');
  });

  it('compra inexistente (404) cai no erro e "Tentar novamente" repete a seleção (AC-14)', () => {
    store.detail.set({
      status: 'error',
      data: null,
      error: 'Compra não encontrada',
      selectedId: 'c1',
    });
    const fixture = mount();
    const element = root(fixture);

    const error = element.querySelector('.load-error');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(error?.textContent).toContain('Não foi possível carregar a compra');
    expect(error?.textContent).toContain('Compra não encontrada');
    expect(element.querySelector('.detail-skeleton')).toBeNull();
    // O voltar continua disponível no erro (guia §4: voltar é a navegação principal).
    expect(element.querySelector('.page-back')).not.toBeNull();

    (element.querySelector('.load-error .btn-secondary') as HTMLButtonElement).click();

    // Sem id: o store repete a última seleção guardada.
    expect(store.loadPurchase).toHaveBeenCalledTimes(2);
    expect(store.loadPurchase).toHaveBeenLastCalledWith();
  });

  it('o voltar retorna à lista do histórico (AC-11)', async () => {
    store.detail.set({ status: 'loaded', data: purchase(), error: null, selectedId: 'c1' });
    const fixture = mount();
    const router = TestBed.inject(Router);

    (root(fixture).querySelector('.page-back') as HTMLAnchorElement).click();
    await fixture.whenStable();

    expect(router.url).toBe('/historico');
  });
});

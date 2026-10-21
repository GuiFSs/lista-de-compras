import { provideLocationMocks } from '@angular/common/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import type { LowestPriceByMarketResponse } from '@lista/contracts';
import { ShellChromeService } from '../../layout/shell-chrome';
import { LowestPriceByMarketPage } from './lowest-price-by-market-page';
import { PriceHistoryStore } from './state';
import type { ItemLowestPricesState } from './state';

@Component({ selector: 'app-blank-outlet', template: '' })
class Blank {}

function itemByMarket(): LowestPriceByMarketResponse {
  return {
    name: 'Café',
    nameNormalized: 'cafe',
    markets: [
      {
        market: 'Atacadão',
        lowestUnitPrice: 6.9,
        purchaseDate: '2026-10-12',
        quantity: 2,
        unit: 'pacote',
      },
      {
        market: 'Mercado Central',
        lowestUnitPrice: 7.5,
        purchaseDate: '2026-10-15',
        quantity: 2,
        unit: 'pacote',
      },
    ],
  };
}

function itemByMarketEmpty(): LowestPriceByMarketResponse {
  return {
    name: 'Leite',
    nameNormalized: 'leite',
    markets: [],
  };
}

class StoreStub {
  readonly itemLowestPrices = signal<ItemLowestPricesState>({
    status: 'loading',
    data: null,
    error: null,
    selectedItem: null,
  });
  readonly loadItemLowestPrices = vi.fn((): Promise<void> => Promise.resolve());
}

function root(fixture: ComponentFixture<LowestPriceByMarketPage>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function textOf(scope: ParentNode, selector: string): string {
  return (scope.querySelector(selector)?.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('LowestPriceByMarketPage', () => {
  let store: StoreStub;
  let chrome: ShellChromeService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    store = new StoreStub();
    TestBed.configureTestingModule({
      providers: [
        { provide: PriceHistoryStore, useValue: store },
        provideRouter([{ path: 'menor-preco', component: Blank }]),
        provideLocationMocks(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: convertToParamMap({ item: 'cafe' }) },
        },
      ],
    });
    chrome = TestBed.inject(ShellChromeService);
  });

  function mount(): ComponentFixture<LowestPriceByMarketPage> {
    const fixture = TestBed.createComponent(LowestPriceByMarketPage);
    fixture.detectChanges();
    return fixture;
  }

  it('na primeira carga mostra skeleton e chama o store com o item decodificado (AC-13/AC-05)', () => {
    const fixture = mount();
    const element = root(fixture);

    expect(store.loadItemLowestPrices).toHaveBeenCalledTimes(1);
    expect(store.loadItemLowestPrices).toHaveBeenCalledWith('cafe');

    const skeleton = element.querySelector('.detail-skeleton');
    expect(skeleton?.getAttribute('role')).toBe('status');
    expect(skeleton?.getAttribute('aria-busy')).toBe('true');
    expect(
      element.querySelectorAll('.detail-skeleton__row').length,
    ).toBeGreaterThan(0);
    expect(element.querySelector('.visually-hidden')?.textContent?.trim()).toBe(
      'Carregando os preços por mercado…',
    );
    expect(element.querySelector('.spinner')).toBeNull();
  });

  it('contribui o nome do item na app bar, com voltar em todos os estados (AC-05/AC-06)', () => {
    const fixture = mount();
    expect(chrome.title()).toBe('Menor preço');

    store.itemLowestPrices.set({
      status: 'loaded',
      data: itemByMarket(),
      error: null,
      selectedItem: 'cafe',
    });
    fixture.detectChanges();

    expect(chrome.title()).toBe('Café');
  });

  it('mostra uma linha por mercado em A→Z, com preço + data + quantidade com unidade (AC-06/CD-08)', () => {
    store.itemLowestPrices.set({
      status: 'loaded',
      data: itemByMarket(),
      error: null,
      selectedItem: 'cafe',
    });
    const fixture = mount();
    const element = root(fixture);

    const back = element.querySelector('.page-back') as HTMLAnchorElement;
    expect(back.getAttribute('aria-label')).toBe(
      'Voltar para os menores preços',
    );
    expect(back.getAttribute('href')).toBe('/menor-preco');

    const lines = Array.from(element.querySelectorAll('.markets__line'));
    expect(lines).toHaveLength(2);
    expect(textOf(lines[0], '.markets__market')).toBe('Atacadão');
    expect(textOf(lines[0], '.markets__value')).toBe('R$ 6,90');
    expect(textOf(lines[0], '.markets__meta')).toBe('12/10/2026 · 2 pacote');
    expect(textOf(lines[1], '.markets__market')).toBe('Mercado Central');
    expect(textOf(lines[1], '.markets__value')).toBe('R$ 7,50');
    expect(textOf(lines[1], '.markets__meta')).toBe('15/10/2026 · 2 pacote');

    expect(element.querySelector('.empty')).toBeNull();
  });

  it('estado notFound mostra bloco não encontrado com voltar (AC-12/R-5)', () => {
    store.itemLowestPrices.set({
      status: 'notFound',
      data: null,
      error: null,
      selectedItem: 'cafe',
    });
    const fixture = mount();
    const element = root(fixture);

    const empty = element.querySelector('.empty--not-found');
    expect(empty).not.toBeNull();
    expect(textOf(empty as ParentNode, '.empty__title')).toContain(
      'Nenhum preço por mercado',
    );
    const cta = element.querySelector('.btn-primary') as HTMLAnchorElement;
    expect(cta.textContent?.trim()).toBe('Voltar para os menores preços');
    expect(cta.getAttribute('href')).toBe('/menor-preco');
    expect(element.querySelector('.markets')).toBeNull();
    expect(element.querySelector('.load-error')).toBeNull();
  });

  it('resposta com mercados vazios vira não encontrado (nunca tela em branco, AC-12)', () => {
    store.itemLowestPrices.set({
      status: 'loaded',
      data: itemByMarketEmpty(),
      error: null,
      selectedItem: 'leite',
    });
    const fixture = mount();
    const element = root(fixture);

    expect(element.querySelector('.empty--not-found')).not.toBeNull();
    expect(element.querySelector('.markets')).toBeNull();
  });

  it('erro mostra mensagem + Tentar novamente que repete a mesma consulta (AC-14)', () => {
    store.itemLowestPrices.set({
      status: 'error',
      data: null,
      error: 'Falha de rede',
      selectedItem: 'cafe',
    });
    const fixture = mount();
    const element = root(fixture);

    const error = element.querySelector('.load-error');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(error?.textContent).toContain(
      'Não foi possível carregar os preços por mercado',
    );
    expect(error?.textContent).toContain('Falha de rede');

    const retry = element.querySelector(
      '.load-error .btn-secondary',
    ) as HTMLButtonElement;
    retry.click();
    expect(store.loadItemLowestPrices).toHaveBeenCalledTimes(2);
    expect(store.loadItemLowestPrices).toHaveBeenLastCalledWith();
  });

  it('o voltar retorna à lista Menor preço (AC-11)', async () => {
    store.itemLowestPrices.set({
      status: 'loaded',
      data: itemByMarket(),
      error: null,
      selectedItem: 'cafe',
    });
    const fixture = mount();
    const router = TestBed.inject(Router);

    (root(fixture).querySelector('.page-back') as HTMLAnchorElement).click();
    await fixture.whenStable();

    expect(router.url).toBe('/menor-preco');
  });

  it('item com um único mercado mostra uma única linha (AC-08)', () => {
    store.itemLowestPrices.set({
      status: 'loaded',
      data: {
        name: 'Arroz',
        nameNormalized: 'arroz',
        markets: [
          {
            market: 'Atacadão',
            lowestUnitPrice: 21.9,
            purchaseDate: '2026-10-02',
            quantity: 5,
            unit: 'kg',
          },
        ],
      },
      error: null,
      selectedItem: 'arroz',
    });
    const fixture = mount();
    const element = root(fixture);

    expect(element.querySelectorAll('.markets__line')).toHaveLength(1);
    expect(element.querySelector('.detail__date')?.textContent?.trim()).toBe(
      '1 mercado',
    );
  });

  it('o voltar aparece em todos os estados, não só no sucesso (AC-05)', () => {
    const states: readonly ItemLowestPricesState[] = [
      { status: 'loading', data: null, error: null, selectedItem: 'cafe' },
      { status: 'notFound', data: null, error: null, selectedItem: 'cafe' },
      {
        status: 'error',
        data: null,
        error: 'Falha de rede',
        selectedItem: 'cafe',
      },
      {
        status: 'loaded',
        data: itemByMarket(),
        error: null,
        selectedItem: 'cafe',
      },
    ];

    for (const state of states) {
      TestBed.resetTestingModule();
      store = new StoreStub();
      store.itemLowestPrices.set(state);
      TestBed.configureTestingModule({
        providers: [
          { provide: PriceHistoryStore, useValue: store },
          provideRouter([{ path: 'menor-preco', component: Blank }]),
          provideLocationMocks(),
          {
            provide: ActivatedRoute,
            useValue: { paramMap: convertToParamMap({ item: 'cafe' }) },
          },
        ],
      });

      const fixture = mount();
      const back = root(fixture).querySelector(
        'a.page-back',
      ) as HTMLAnchorElement | null;
      expect(back, `voltar ausente no estado ${state.status}`).not.toBeNull();
      expect(back?.getAttribute('aria-label')).toBe(
        'Voltar para os menores preços',
      );
      expect(back?.getAttribute('href')).toBe('/menor-preco');
    }
  });

  it('cada linha de mercado tem alvo de toque ≥44px pelo token (AC-16)', () => {
    store.itemLowestPrices.set({
      status: 'loaded',
      data: itemByMarket(),
      error: null,
      selectedItem: 'cafe',
    });
    const fixture = mount();

    // O jsdom devolve o valor declarado (não resolve `var()`): é o token de 44px.
    const line = root(fixture).querySelector('.markets__line') as HTMLElement;
    expect(getComputedStyle(line).minHeight).toBe('var(--touch-target-min)');
  });

  it('uma única CTA primary: só no não encontrado (AC-16)', () => {
    store.itemLowestPrices.set({
      status: 'loaded',
      data: itemByMarket(),
      error: null,
      selectedItem: 'cafe',
    });
    const loaded = mount();
    // Tela cheia não concorre com CTA primary: o voltar é a navegação.
    expect(root(loaded).querySelectorAll('.btn-primary')).toHaveLength(0);

    TestBed.resetTestingModule();
    store = new StoreStub();
    store.itemLowestPrices.set({
      status: 'notFound',
      data: null,
      error: null,
      selectedItem: 'cafe',
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: PriceHistoryStore, useValue: store },
        provideRouter([{ path: 'menor-preco', component: Blank }]),
        provideLocationMocks(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: convertToParamMap({ item: 'cafe' }) },
        },
      ],
    });
    const notFound = mount();

    expect(root(notFound).querySelectorAll('.btn-primary')).toHaveLength(1);
  });
});

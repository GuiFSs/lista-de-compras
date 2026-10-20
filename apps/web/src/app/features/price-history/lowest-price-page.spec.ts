import { provideLocationMocks } from '@angular/common/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { LowestPriceItem, LowestPriceMarketGroup } from '@lista/contracts';
import {
  DEFAULT_SHELL_TITLE,
  ShellChromeService,
} from '../../layout/shell-chrome';
import { LowestPricePage } from './lowest-price-page';
import { PriceHistoryStore } from './state';
import type { LowestPricesState } from './state';

@Component({ selector: 'app-blank-outlet', template: '' })
class Blank {}

function item(overrides: Partial<LowestPriceItem> = {}): LowestPriceItem {
  return {
    name: 'Café',
    nameNormalized: 'cafe',
    lowestUnitPrice: 7.5,
    market: 'Mercado Central',
    purchaseDate: '2026-10-15',
    quantity: 2,
    unit: 'pacote',
    ...overrides,
  };
}

function group(
  market: string,
  items: LowestPriceItem[],
): LowestPriceMarketGroup {
  return { market, items };
}

function lowestPricesState(
  overrides: Partial<LowestPricesState> = {},
): LowestPricesState {
  return { status: 'loading', data: [], error: null, query: '', ...overrides };
}

/** Store de teste: a página só lê o snapshot de menor preço e chama o store (RN-12). */
class StoreStub {
  readonly lowestPrices = signal<LowestPricesState>(lowestPricesState());
  readonly loadLowestPrices = vi.fn((): Promise<void> => Promise.resolve());
}

function root(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function query<T extends Element>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): T {
  const found = root(fixture).querySelector<T>(selector);
  if (!found) throw new Error(`Elemento não encontrado: ${selector}`);
  return found;
}

/** Texto normalizado do primeiro nó que casa com o seletor. */
function textOf(scope: ParentNode, selector: string): string {
  return (scope.querySelector(selector)?.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function typeInto(fixture: ComponentFixture<unknown>, value: string): void {
  const input = query<HTMLInputElement>(fixture, '#lowest-price-search');
  input.value = value;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

describe('LowestPricePage', () => {
  let store: StoreStub;
  let chrome: ShellChromeService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    store = new StoreStub();
    TestBed.configureTestingModule({
      providers: [
        { provide: PriceHistoryStore, useValue: store },
        provideRouter([{ path: '', component: Blank }]),
        provideLocationMocks(),
      ],
    });
    chrome = TestBed.inject(ShellChromeService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mount(): ComponentFixture<LowestPricePage> {
    const fixture = TestBed.createComponent(LowestPricePage);
    fixture.detectChanges();
    return fixture;
  }

  it('na primeira carga (sem dados) pede a lista e mostra skeleton na forma dos grupos (AC-13)', () => {
    const fixture = mount();
    const element = root(fixture);

    expect(store.loadLowestPrices).toHaveBeenCalledTimes(1);
    expect(store.loadLowestPrices).toHaveBeenCalledWith('');

    const skeleton = element.querySelector('.prices-skeleton');
    expect(skeleton?.getAttribute('role')).toBe('status');
    expect(skeleton?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelectorAll('.prices-skeleton__group')).toHaveLength(2);
    expect(
      element.querySelectorAll('.prices-skeleton__row').length,
    ).toBeGreaterThan(0);
    expect(element.querySelector('.visually-hidden')?.textContent?.trim()).toBe(
      'Carregando os menores preços…',
    );
    // Skeleton no formato do conteúdo: nada de spinner nem conteúdo atrás.
    expect(element.querySelector('.spinner')).toBeNull();
    expect(element.querySelector('.empty')).toBeNull();
    expect(element.querySelector('.load-error')).toBeNull();
    expect(element.querySelectorAll('.btn-primary')).toHaveLength(0);
  });

  it('skeleton só sem dados: recarga com lista já carregada mantém o conteúdo visível (AC-13)', () => {
    store.lowestPrices.set(
      lowestPricesState({
        status: 'loading',
        data: [group('Mercado Central', [item()])],
        query: 'cafe',
      }),
    );
    const fixture = mount();
    const element = root(fixture);

    expect(element.querySelector('.prices-skeleton')).toBeNull();
    expect(element.querySelectorAll('.prices__item')).toHaveLength(1);
  });

  it('campo de busca tem rótulo visível associado (AC-09)', () => {
    const fixture = mount();

    const label = query<HTMLLabelElement>(fixture, '.search__label');
    expect(label.textContent?.trim()).toBe('Buscar item');

    const input = query<HTMLInputElement>(fixture, '#lowest-price-search');
    expect(label.getAttribute('for')).toBe('lowest-price-search');
    expect(input.getAttribute('type')).toBe('search');
    // Rótulo não é placeholder: o exemplo no placeholder é apoio, não o label.
    expect(input.getAttribute('placeholder')).not.toBe('');
  });

  it('contribui o título "Menor preço" na app bar e devolve ao default ao sair (AC-01)', () => {
    const fixture = mount();

    expect(chrome.title()).toBe('Menor preço');
    expect(chrome.actions()).toHaveLength(0);

    fixture.destroy();

    expect(chrome.title()).toBe(DEFAULT_SHELL_TITLE);
  });

  it('renderiza mercados e itens exatamente na ordem recebida do serviço (AC-02)', () => {
    store.lowestPrices.set(
      lowestPricesState({
        status: 'loaded',
        data: [
          group('Atacadão', [
            item({
              name: 'Arroz',
              nameNormalized: 'arroz',
              lowestUnitPrice: 21.9,
              market: 'Atacadão',
              purchaseDate: '2026-10-02',
              quantity: 5,
              unit: 'kg',
            }),
            item({
              name: 'Café',
              nameNormalized: 'cafe',
              market: 'Atacadão',
              purchaseDate: '2026-10-12',
              quantity: 1,
            }),
          ]),
          group('Zaffari', [
            item({
              name: 'Leite',
              nameNormalized: 'leite',
              lowestUnitPrice: 4.2,
              market: 'Zaffari',
              purchaseDate: '2026-10-08',
              quantity: 3,
              unit: 'L',
            }),
          ]),
        ],
      }),
    );
    const fixture = mount();
    const element = root(fixture);

    const markets = Array.from(element.querySelectorAll('.market'));
    expect(markets.map((market) => textOf(market, '.market__title'))).toEqual([
      'Atacadão',
      'Zaffari',
    ]);
    expect(
      markets.map((market) => market.querySelectorAll('.prices__item').length),
    ).toEqual([2, 1]);
    expect(
      Array.from(element.querySelectorAll('.prices__name')).map((name) =>
        name.textContent?.trim(),
      ),
    ).toEqual(['Arroz', 'Café', 'Leite']);
    expect(element.querySelector('.summary')?.textContent?.trim()).toBe(
      '3 itens',
    );
    expect(element.querySelector('.empty')).toBeNull();
  });

  it('não reordena, não agrupa e não cria cabeçalho: a tela espelha a resposta (AC-02/RN-12)', () => {
    store.lowestPrices.set(
      lowestPricesState({
        status: 'loaded',
        // Deliberadamente fora de A→Z: se a tela ordenasse, este teste falharia.
        data: [
          group('Zaffari', [
            item({ name: 'Zucchini', nameNormalized: 'zucchini' }),
          ]),
          group('Atacadão', [item({ name: 'Arroz', nameNormalized: 'arroz' })]),
        ],
      }),
    );
    const fixture = mount();
    const element = root(fixture);

    expect(
      Array.from(element.querySelectorAll('.market__title')).map((title) =>
        title.textContent?.trim(),
      ),
    ).toEqual(['Zaffari', 'Atacadão']);
    // Nenhum grupo vazio: cada cabeçalho tem ao menos uma linha.
    for (const market of Array.from(element.querySelectorAll('.market'))) {
      expect(market.querySelectorAll('.prices__item').length).toBeGreaterThan(
        0,
      );
    }
    expect(element.querySelectorAll('.market__title')).toHaveLength(2);
  });

  it('um item com histórico em dois registros credita o mercado/data/quantidade do vencedor (AC-03)', () => {
    // O serviço decide o vencedor (RN-02/RN-12); aqui a prova é que a tela exibe
    // exatamente a linha que ele creditou — R$ 7,50 — e não a compra mais cara.
    store.lowestPrices.set(
      lowestPricesState({
        status: 'loaded',
        data: [
          group('Atacadão', [
            item({
              name: 'Café',
              nameNormalized: 'cafe',
              lowestUnitPrice: 7.5,
              market: 'Atacadão',
              purchaseDate: '2026-10-12',
              quantity: 2,
              unit: 'pacote',
            }),
          ]),
        ],
      }),
    );
    const fixture = mount();
    const row = query<HTMLElement>(fixture, '.prices__item');

    expect(textOf(row, '.prices__value')).toBe('R$ 7,50');
    expect(textOf(row, '.prices__meta')).toBe('Atacadão · 12/10/2026 · 2 pacote');
  });

  it('não exibe cabeçalho de mercado para grupo sem item (AC-02/CD-09)', () => {
    // O contrato do serviço já garante "só grupo com ≥1 item" (CD-09); a tela
    // não pode inventar cabeçalho vazio se receber um grupo degenerado.
    store.lowestPrices.set(
      lowestPricesState({
        status: 'loaded',
        data: [
          group('Atacadão', [item({ name: 'Arroz', nameNormalized: 'arroz' })]),
          group('Mercado Central', []),
        ],
      }),
    );
    const fixture = mount();
    const element = root(fixture);

    const markets = Array.from(element.querySelectorAll('.market'));
    for (const market of markets) {
      expect(market.querySelectorAll('.prices__item').length).toBeGreaterThan(0);
    }
    // O grupo degenerado não produz cabeçalho: só "Atacadão" tem título.
    expect(
      Array.from(element.querySelectorAll('.market__title')).map((title) =>
        title.textContent?.trim(),
      ),
    ).toEqual(['Atacadão']);
  });

  it('a linha do item e a CTA têm alvo de toque ≥44px pelo token (AC-16)', () => {
    store.lowestPrices.set(
      lowestPricesState({
        status: 'loaded',
        data: [group('Mercado Central', [item()])],
      }),
    );
    const fixture = mount();
    const link = query<HTMLElement>(fixture, '.prices__link');

    // O jsdom devolve o valor declarado (não resolve `var()`): é o token de 44px.
    expect(getComputedStyle(link).minHeight).toBe('var(--touch-target-min)');
  });

  it('no empty de lista a CTA primary também tem alvo ≥44px (AC-16)', () => {
    store.lowestPrices.set(lowestPricesState({ status: 'loaded' }));
    const fixture = mount();
    const cta = query<HTMLElement>(fixture, '.empty--list .btn-primary');

    expect(getComputedStyle(cta).minHeight).toBe('var(--touch-target-min)');
  });

  it('cada linha traz nome, menor preço e mercado · data · quantidade com a unidade (AC-01/AC-03/CD-08)', () => {
    store.lowestPrices.set(
      lowestPricesState({
        status: 'loaded',
        data: [
          group('Atacadão', [
            item({
              name: 'Arroz',
              nameNormalized: 'arroz',
              lowestUnitPrice: 21.9,
              market: 'Atacadão',
              purchaseDate: '2026-10-02',
              quantity: 5,
              unit: 'kg',
            }),
          ]),
        ],
      }),
    );
    const fixture = mount();
    const row = query<HTMLElement>(fixture, '.prices__item');

    expect(textOf(row, '.prices__name')).toBe('Arroz');
    expect(textOf(row, '.prices__value')).toBe('R$ 21,90');
    expect(textOf(row, '.prices__meta')).toBe('Atacadão · 02/10/2026 · 5 kg');
  });

  it('a linha inteira é link para o item, com o segmento percent-encoded (AC-05/CD-07)', () => {
    store.lowestPrices.set(
      lowestPricesState({
        status: 'loaded',
        data: [
          group('Mercado Central', [
            // O segmento é opaco para a tela: o router percent-encoda o que o
            // serviço mandou (no serviço real `nameNormalized` já vem sem acento).
            item({ nameNormalized: 'café' }),
            item({
              name: 'Leite/Açúcar',
              nameNormalized: 'leite/açúcar',
              lowestUnitPrice: 4.2,
            }),
          ]),
        ],
      }),
    );
    const fixture = mount();
    const rows = Array.from(root(fixture).querySelectorAll('.prices__item'));

    const coffeeLink = rows[0].querySelector('a.prices__link');
    expect(coffeeLink?.getAttribute('href')).toBe('/menor-preco/caf%C3%A9');
    // O link é a linha toda: nome, preço e metadados dentro do mesmo alvo.
    expect(coffeeLink?.querySelector('.prices__name')).not.toBeNull();
    expect(coffeeLink?.querySelector('.prices__value')).not.toBeNull();
    expect(coffeeLink?.querySelector('.prices__meta')).not.toBeNull();

    // Round-trip R-2: `/` no nome vira %2F, não um segmento novo.
    expect(rows[1].querySelector('a.prices__link')?.getAttribute('href')).toBe(
      '/menor-preco/leite%2Fa%C3%A7%C3%BAcar',
    );
  });

  it('sem itens de preço, mostra o empty de lista com um único CTA primary (AC-10)', () => {
    store.lowestPrices.set(lowestPricesState({ status: 'loaded' }));
    const fixture = mount();
    const element = root(fixture);

    const empty = element.querySelector('.empty--list');
    expect(
      empty?.querySelector('.empty__sticker')?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(textOf(empty as ParentNode, '.empty__title')).toBe(
      'Nenhum preço registrado ainda',
    );
    expect(textOf(empty as ParentNode, '.empty__text')).not.toBe('');

    const primaries = element.querySelectorAll('.btn-primary');
    expect(primaries).toHaveLength(1);
    expect(primaries[0].textContent?.trim()).toBe('Ir para a lista');
    expect(primaries[0].getAttribute('href')).toBe('/');

    // Vazio de lista não tem lista, apoio, cabeçalho nem variante de busca.
    expect(element.querySelector('.prices')).toBeNull();
    expect(element.querySelector('.markets')).toBeNull();
    expect(element.querySelector('.market__title')).toBeNull();
    expect(element.querySelector('.summary')).toBeNull();
    expect(element.querySelector('.empty--search')).toBeNull();
  });

  it('busca sem resultado mostra o empty de busca distinto, com "Limpar busca" (AC-09)', () => {
    store.lowestPrices.set(
      lowestPricesState({ status: 'loaded', query: 'xyz' }),
    );
    const fixture = mount();
    const element = root(fixture);

    const empty = element.querySelector('.empty--search');
    expect(empty).not.toBeNull();
    expect(textOf(empty as ParentNode, '.empty__title')).toContain('xyz');
    expect(textOf(empty as ParentNode, '.empty__text')).not.toBe('');
    // Vazio de busca ≠ vazio de lista: aqui não há CTA "Ir para a lista".
    expect(element.querySelector('.empty--list')).toBeNull();

    const primaries = element.querySelectorAll('.btn-primary');
    expect(primaries).toHaveLength(1);
    expect(primaries[0].textContent?.trim()).toBe('Limpar busca');
  });

  it('digitar dispara a busca com debounce, envia o termo e não filtra no cliente (AC-09)', () => {
    store.lowestPrices.set(
      lowestPricesState({
        status: 'loaded',
        data: [group('Mercado Central', [item()])],
      }),
    );
    vi.useFakeTimers();
    const fixture = mount();
    const element = root(fixture);

    typeInto(fixture, '  cafe  ');
    // Sem pausa não há chamada: debounce, não um GET por tecla.
    expect(store.loadLowestPrices).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);

    // Termo com trim — espaço digitado não vira query diferente.
    expect(store.loadLowestPrices).toHaveBeenCalledTimes(2);
    expect(store.loadLowestPrices).toHaveBeenLastCalledWith('cafe');

    // A tela não filtra no cliente (RN-12): mesmo com o termo "cafe" no campo,
    // a lista é a resposta do serviço, por inteiro e na ordem dele.
    store.lowestPrices.set(
      lowestPricesState({
        status: 'loaded',
        data: [
          group('Atacadão', [item({ name: 'Arroz', nameNormalized: 'arroz' })]),
          group('Mercado Central', [item()]),
        ],
        query: 'cafe',
      }),
    );
    fixture.detectChanges();

    expect(element.querySelectorAll('.prices__item')).toHaveLength(2);
    expect(
      textOf(element.querySelector('.prices') as Element, '.prices__name'),
    ).toBe('Arroz');
    expect(element.querySelector('.summary')?.textContent?.trim()).toBe(
      '2 itens para "cafe"',
    );
  });

  it('com um item só e busca ativa, o apoio fica no singular com o termo', () => {
    store.lowestPrices.set(
      lowestPricesState({
        status: 'loaded',
        data: [group('Mercado Central', [item()])],
        query: 'cafe',
      }),
    );
    const fixture = mount();

    expect(query(fixture, '.summary').textContent?.trim()).toBe(
      '1 item para "cafe"',
    );
  });

  it('ao entrar com busca preservada, sincroniza o campo e repete a MESMA consulta (CD-10/AC-11)', () => {
    store.lowestPrices.set(
      lowestPricesState({
        status: 'loaded',
        data: [group('Mercado Central', [item()])],
        query: 'cafe',
      }),
    );
    const fixture = mount();

    expect(query<HTMLInputElement>(fixture, '#lowest-price-search').value).toBe(
      'cafe',
    );
    expect(store.loadLowestPrices).toHaveBeenCalledTimes(1);
    // Repete `cafe`, não a lista completa: a busca não é descartada ao voltar.
    expect(store.loadLowestPrices).toHaveBeenCalledWith('cafe');
  });

  it('"Limpar busca" volta à lista completa e limpa o campo (AC-09)', () => {
    store.lowestPrices.set(
      lowestPricesState({ status: 'loaded', query: 'xyz' }),
    );
    const fixture = mount();

    query<HTMLButtonElement>(fixture, '.empty--search .btn-primary').click();
    fixture.detectChanges();

    expect(store.loadLowestPrices).toHaveBeenLastCalledWith('');
    expect(query<HTMLInputElement>(fixture, '#lowest-price-search').value).toBe(
      '',
    );
  });

  it('em falha, mostra o erro e "Tentar novamente" refaz a MESMA busca (AC-14)', () => {
    store.lowestPrices.set(
      lowestPricesState({
        status: 'error',
        error: 'Falha de rede. Verifique a conexão e tente novamente.',
        query: 'cafe',
      }),
    );
    const fixture = mount();
    const element = root(fixture);

    const error = element.querySelector('.load-error');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(error?.textContent).toContain(
      'Não foi possível carregar os menores preços',
    );
    expect(error?.textContent).toContain('Falha de rede');
    expect(element.querySelector('.prices-skeleton')).toBeNull();
    expect(element.querySelector('.empty')).toBeNull();

    // O campo permanece visível na área de erro: dá para trocar o termo.
    expect(element.querySelector('#lowest-price-search')).not.toBeNull();

    const retry = element.querySelector(
      '.load-error .btn-secondary',
    ) as HTMLButtonElement;
    expect(retry.textContent?.trim()).toBe('Tentar novamente');

    retry.click();

    // Sem argumento: o store repete a última query ("cafe"), não a lista completa.
    expect(store.loadLowestPrices).toHaveBeenCalledTimes(2);
    expect(store.loadLowestPrices).toHaveBeenLastCalledWith();
  });

  it('lista cheia não concorre com CTA primary (AC-16)', () => {
    store.lowestPrices.set(
      lowestPricesState({
        status: 'loaded',
        data: [group('Mercado Central', [item()])],
      }),
    );
    const fixture = mount();

    expect(root(fixture).querySelectorAll('.btn-primary')).toHaveLength(0);
  });
});

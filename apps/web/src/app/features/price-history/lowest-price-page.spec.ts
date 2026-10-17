import { provideLocationMocks } from '@angular/common/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { LowestPriceItem } from '@lista/contracts';
import { DEFAULT_SHELL_TITLE, ShellChromeService } from '../../layout/shell-chrome';
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
    ...overrides,
  };
}

/** Store de teste: a página só lê o snapshot de menor preço e chama o store (RN-19). */
class StoreStub {
  readonly lowestPrices = signal<LowestPricesState>({
    status: 'loading',
    data: [],
    error: null,
    query: '',
  });
  readonly loadLowestPrices = vi.fn((): Promise<void> => Promise.resolve());
}

function root(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function query<T extends Element>(fixture: ComponentFixture<unknown>, selector: string): T {
  const found = root(fixture).querySelector<T>(selector);
  if (!found) throw new Error(`Elemento não encontrado: ${selector}`);
  return found;
}

/** Texto normalizado do primeiro nó que casa com o seletor. */
function textOf(scope: ParentNode, selector: string): string {
  return (scope.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
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

  it('ao entrar, pede a lista completa e mostra o skeleton na forma das linhas (AC-08/AC-13)', () => {
    const fixture = mount();
    const element = root(fixture);

    expect(store.loadLowestPrices).toHaveBeenCalledTimes(1);
    expect(store.loadLowestPrices).toHaveBeenCalledWith('');

    const skeleton = element.querySelector('.prices-skeleton');
    expect(skeleton?.getAttribute('role')).toBe('status');
    expect(skeleton?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelectorAll('.prices-skeleton__row')).toHaveLength(3);
    expect(element.querySelector('.visually-hidden')?.textContent?.trim()).toBe(
      'Carregando os menores preços…',
    );
    // Skeleton no formato do conteúdo: nada de spinner nem de conteúdo escondido atrás.
    expect(element.querySelector('.spinner')).toBeNull();
    expect(element.querySelector('.empty')).toBeNull();
    expect(element.querySelector('.load-error')).toBeNull();
    expect(element.querySelectorAll('.btn-primary')).toHaveLength(0);
  });

  it('campo de busca tem rótulo visível associado (AC-09/AC-19)', () => {
    const fixture = mount();

    const label = query<HTMLLabelElement>(fixture, '.search__label');
    expect(label.textContent?.trim()).toBe('Buscar item');

    const input = query<HTMLInputElement>(fixture, '#lowest-price-search');
    expect(label.getAttribute('for')).toBe('lowest-price-search');
    expect(input.getAttribute('type')).toBe('search');
    // Rótulo não é placeholder: o exemplo no placeholder é apoio, não o label.
    expect(input.getAttribute('placeholder')).not.toBe('');
  });

  it('contribui o título "Menor preço" na app bar e devolve ao default ao sair (AC-02)', () => {
    const fixture = mount();

    expect(chrome.title()).toBe('Menor preço');
    expect(chrome.actions()).toHaveLength(0);

    fixture.destroy();

    expect(chrome.title()).toBe(DEFAULT_SHELL_TITLE);
  });

  it('lista cada item com o nome e o menor preço em R$, na ordem do serviço (AC-08/AC-10/RN-07)', () => {
    store.lowestPrices.set({
      status: 'loaded',
      // Ordem como o serviço entrega — a tela não reordena nem recalcula o mínimo.
      data: [
        item({ name: 'Arroz', nameNormalized: 'arroz', lowestUnitPrice: 21.9 }),
        item({ name: 'Café', nameNormalized: 'cafe', lowestUnitPrice: 7.5 }),
      ],
      error: null,
      query: '',
    });
    const fixture = mount();
    const element = root(fixture);

    const rows = Array.from(element.querySelectorAll('.prices__item'));
    expect(rows.map((row) => textOf(row, '.prices__name'))).toEqual(['Arroz', 'Café']);
    expect(rows.map((row) => textOf(row, '.prices__value'))).toEqual(['R$ 21,90', 'R$ 7,50']);
    expect(element.querySelector('.summary')?.textContent?.trim()).toBe('2 itens');
    expect(element.querySelector('ul')?.getAttribute('role')).toBe('list');
    expect(element.querySelector('.empty')).toBeNull();
  });

  it('sem itens de preço, mostra o empty de lista com um único CTA primary (AC-12)', () => {
    store.lowestPrices.set({ status: 'loaded', data: [], error: null, query: '' });
    const fixture = mount();
    const element = root(fixture);

    const empty = element.querySelector('.empty--list');
    expect(empty?.querySelector('.empty__sticker')?.getAttribute('aria-hidden')).toBe('true');
    expect(textOf(empty as ParentNode, '.empty__title')).toBe('Nenhum preço registrado ainda');
    expect(textOf(empty as ParentNode, '.empty__text')).not.toBe('');

    const primaries = element.querySelectorAll('.btn-primary');
    expect(primaries).toHaveLength(1);
    expect(primaries[0].textContent?.trim()).toBe('Ir para a lista');
    expect(primaries[0].getAttribute('href')).toBe('/');

    // Vazio de lista não tem lista nem apoio, nem variante de busca.
    expect(element.querySelector('.prices')).toBeNull();
    expect(element.querySelector('.summary')).toBeNull();
    expect(element.querySelector('.empty--search')).toBeNull();
  });

  it('busca sem resultado mostra o empty de busca distinto, com "Limpar busca" (AC-09)', () => {
    store.lowestPrices.set({ status: 'loaded', data: [], error: null, query: 'xyz' });
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

    // A tela não filtra no cliente (RN-06/RN-07): mesmo com o termo "cafe" no
    // campo, a lista é a resposta do serviço, por inteiro e na ordem dele.
    store.lowestPrices.set({
      status: 'loaded',
      data: [item({ name: 'Arroz', nameNormalized: 'arroz', lowestUnitPrice: 21.9 }), item()],
      error: null,
      query: 'cafe',
    });
    fixture.detectChanges();

    expect(element.querySelectorAll('.prices__item')).toHaveLength(2);
    expect(textOf(element.querySelector('.prices') as Element, '.prices__name')).toBe('Arroz');
    expect(element.querySelector('.summary')?.textContent?.trim()).toBe('2 itens para "cafe"');
  });

  it('com um item só e busca ativa, o apoio fica no singular com o termo', () => {
    vi.useFakeTimers();
    const fixture = mount();

    typeInto(fixture, 'cafe');
    vi.advanceTimersByTime(300);
    store.lowestPrices.set({
      status: 'loaded',
      data: [item()],
      error: null,
      query: 'cafe',
    });
    fixture.detectChanges();

    expect(query(fixture, '.summary').textContent?.trim()).toBe('1 item para "cafe"');
  });

  it('"Limpar busca" volta à lista completa e limpa o campo (AC-09)', () => {
    vi.useFakeTimers();
    const fixture = mount();

    typeInto(fixture, 'xyz');
    vi.advanceTimersByTime(300);
    store.lowestPrices.set({ status: 'loaded', data: [], error: null, query: 'xyz' });
    fixture.detectChanges();

    query<HTMLButtonElement>(fixture, '.empty--search .btn-primary').click();
    fixture.detectChanges();

    expect(store.loadLowestPrices).toHaveBeenLastCalledWith('');
    expect(query<HTMLInputElement>(fixture, '#lowest-price-search').value).toBe('');
  });

  it('em falha, mostra o erro e "Tentar novamente" refaz a MESMA busca (AC-14)', () => {
    store.lowestPrices.set({
      status: 'error',
      data: [],
      error: 'Falha de rede. Verifique a conexão e tente novamente.',
      query: 'cafe',
    });
    const fixture = mount();
    const element = root(fixture);

    const error = element.querySelector('.load-error');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(error?.textContent).toContain('Não foi possível carregar os menores preços');
    expect(error?.textContent).toContain('Falha de rede');
    expect(element.querySelector('.prices-skeleton')).toBeNull();
    expect(element.querySelector('.empty')).toBeNull();

    // O campo permanece visível na área de erro: dá para trocar o termo.
    expect(element.querySelector('#lowest-price-search')).not.toBeNull();

    const retry = element.querySelector('.load-error .btn-secondary') as HTMLButtonElement;
    expect(retry.textContent?.trim()).toBe('Tentar novamente');

    retry.click();

    // Sem argumento: o store repete a última query ("cafe"), não a lista completa.
    expect(store.loadLowestPrices).toHaveBeenCalledTimes(2);
    expect(store.loadLowestPrices).toHaveBeenLastCalledWith();
  });
});

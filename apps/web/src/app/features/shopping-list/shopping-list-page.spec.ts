import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import type { ShoppingListItem } from '@lista/contracts';
import { DEFAULT_SHELL_TITLE, ShellChromeService } from '../../layout/shell-chrome';
import { ShoppingListPage } from './shopping-list-page';
import { ShoppingListStore, type ShoppingListStatus } from './state';

function item(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    id: 'item-1',
    name: 'Café',
    plannedQuantity: null,
    unit: null,
    plannedPrice: null,
    purchased: null,
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z',
    ...overrides,
  };
}

const PURCHASED = item({
  id: 'comprado',
  name: 'Arroz',
  purchased: {
    quantity: 2,
    unit: 'pacote',
    unitPrice: 12.5,
    purchasedAt: '2026-10-13T11:00:00.000Z',
  },
});

/** Store de teste: a página só lê os signals e dispara `load`. */
class StoreStub {
  readonly status = signal<ShoppingListStatus>('loading');
  readonly items = signal<readonly ShoppingListItem[]>([]);
  readonly loadError = signal<string | null>(null);
  readonly pendingCount = computed(
    () => this.items().filter((value) => value.purchased === null).length,
  );
  readonly purchasedCount = computed(
    () => this.items().filter((value) => value.purchased !== null).length,
  );
  readonly load = vi.fn(async () => undefined);
}

describe('ShoppingListPage', () => {
  let store: StoreStub;
  let chrome: ShellChromeService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    store = new StoreStub();
    TestBed.configureTestingModule({
      providers: [{ provide: ShoppingListStore, useValue: store }],
    });
    chrome = TestBed.inject(ShellChromeService);
  });

  function mount(): ComponentFixture<ShoppingListPage> {
    const fixture = TestBed.createComponent(ShoppingListPage);
    fixture.detectChanges();
    return fixture;
  }

  function root(fixture: ComponentFixture<ShoppingListPage>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('busca a lista ao entrar e mostra o skeleton na primeira carga (AC-02)', () => {
    const fixture = mount();
    const element = root(fixture);

    expect(store.load).toHaveBeenCalledTimes(1);
    expect(element.querySelector('.list-skeleton')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelectorAll('.list-skeleton__row')).toHaveLength(4);
    expect(element.querySelector('.visually-hidden')?.textContent?.trim()).toBe(
      'Carregando a lista…',
    );
    // Skeleton no formato das linhas: nada de spinner centralizado nem CTA.
    expect(element.querySelector('.spinner')).toBeNull();
    expect(element.querySelectorAll('.btn-primary')).toHaveLength(0);
    expect(element.querySelector('.empty')).toBeNull();
    expect(element.querySelector('.load-error')).toBeNull();
  });

  it('contribui título e a ação "Concluir compra" da app bar, e devolve ao sair (AC-01)', () => {
    const fixture = mount();

    expect(chrome.title()).toBe(DEFAULT_SHELL_TITLE);
    expect(chrome.actions().map((action) => action.label)).toEqual(['Concluir compra']);

    fixture.destroy();

    expect(chrome.title()).toBe(DEFAULT_SHELL_TITLE);
    expect(chrome.actions()).toHaveLength(0);
  });

  it('com a lista vazia, mostra o empty state com um único CTA primary (AC-03)', () => {
    store.status.set('loaded');
    const fixture = mount();
    const element = root(fixture);

    expect(element.querySelector('.empty__sticker')?.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector('.empty__title')?.textContent?.trim()).toBe(
      'Sua lista está vazia',
    );
    expect(element.querySelector('.empty__text')?.textContent?.trim()).not.toBe('');

    const primaries = element.querySelectorAll('.btn-primary');
    expect(primaries).toHaveLength(1);
    expect(primaries[0].textContent?.trim()).toBe('Adicionar item');
    // Vazio não tem lista nem apoio.
    expect(element.querySelector('.list')).toBeNull();
    expect(element.querySelector('.summary')).toBeNull();
  });

  it('renderiza a lista em coluna única com o apoio do topo (AC-18)', () => {
    store.status.set('loaded');
    // Ordem como o serviço entrega (RN-18): pendentes primeiro, comprados depois.
    store.items.set([
      item({ id: 'p1', name: 'Café' }),
      item({ id: 'p2', name: 'Ovos' }),
      PURCHASED,
    ]);
    const fixture = mount();
    const element = root(fixture);

    const names = Array.from(element.querySelectorAll('.item-row__name')).map((node) =>
      node.textContent?.trim(),
    );

    expect(names).toEqual(['Café', 'Ovos', 'Arroz']);
    expect(element.querySelector('.summary')?.textContent?.trim()).toBe(
      '2 pendentes · 1 comprado',
    );
    expect(element.querySelector('ul')?.getAttribute('role')).toBe('list');
  });

  it('não reordena no cliente — a ordem é sempre a do serviço (RN-18/RN-19)', () => {
    store.status.set('loaded');
    store.items.set([PURCHASED, item({ id: 'p1', name: 'Café' })]);
    const fixture = mount();

    const names = Array.from(root(fixture).querySelectorAll('.item-row__name')).map((node) =>
      node.textContent?.trim(),
    );

    expect(names).toEqual(['Arroz', 'Café']);
  });

  it('com um item só, o apoio fica no singular', () => {
    store.status.set('loaded');
    store.items.set([item({ name: 'Café' })]);
    const fixture = mount();

    expect(root(fixture).querySelector('.summary')?.textContent?.trim()).toBe(
      '1 pendente · 0 comprados',
    );
  });

  it('mantém a ação primária única e no terço inferior quando há itens (AC-25)', () => {
    store.status.set('loaded');
    store.items.set([item({ name: 'Café' })]);
    const fixture = mount();
    const element = root(fixture);

    const primaries = element.querySelectorAll('.btn-primary');
    expect(primaries).toHaveLength(1);
    expect(primaries[0].textContent?.trim()).toBe('Adicionar item');
    expect(getComputedStyle(primaries[0] as HTMLElement).position).toBe('fixed');
  });

  it('em falha de carga, mostra o erro na área de conteúdo e refaz a carga (AC-22)', () => {
    store.status.set('error');
    store.loadError.set('Erro interno');
    const fixture = mount();
    const element = root(fixture);

    const error = element.querySelector('.load-error');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(error?.textContent).toContain('Erro interno');
    expect(element.querySelector('.list-skeleton')).toBeNull();
    expect(element.querySelector('.empty')).toBeNull();

    const retry = element.querySelector('.load-error .btn-secondary') as HTMLButtonElement;
    expect(retry.textContent?.trim()).toBe('Tentar novamente');

    retry.click();

    expect(store.load).toHaveBeenCalledTimes(2);
  });

  it('toques nas ações da tela não mudam a lista por conta própria (sheets são T-12/T-13/T-14)', () => {
    store.status.set('loaded');
    store.items.set([item({ name: 'Café' })]);
    const fixture = mount();
    const element = root(fixture);

    (element.querySelector('.list__add') as HTMLButtonElement).click();
    (element.querySelector('.item-row__toggle') as HTMLButtonElement).click();
    (element.querySelector('.item-row__actions') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(store.items()).toHaveLength(1);
    expect(element.querySelector('.list-skeleton')).toBeNull();
  });
});

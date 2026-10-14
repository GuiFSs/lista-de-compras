import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import type {
  CreateShoppingListItemRequest,
  MarkItemPurchasedRequest,
  ShoppingListItem,
  UpdateShoppingListItemRequest,
} from '@lista/contracts';
import { DEFAULT_SHELL_TITLE, ShellChromeService } from '../../layout/shell-chrome';
import { ToastService } from '../../ui';
import { ShoppingListPage } from './shopping-list-page';
import { ShoppingListStore, type ShoppingListStatus } from './state';
import type { CreateItemOutcome, MutationOutcome, UpdateItemOutcome } from './state';

/** Deixa as microtasks drenarem antes de checar a tela. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

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
  readonly saving = signal(false);
  readonly mutationError = signal<string | null>(null);
  readonly clearMutationError = vi.fn(() => this.mutationError.set(null));
  readonly createItem = vi.fn((request: CreateShoppingListItemRequest): Promise<CreateItemOutcome> => {
    void request;
    return Promise.resolve({ kind: 'created' });
  });
  readonly updateItem = vi.fn(
    (id: string, request: UpdateShoppingListItemRequest): Promise<UpdateItemOutcome> => {
      void id;
      void request;
      return Promise.resolve({ kind: 'updated' });
    },
  );
  readonly markItemPurchased = vi.fn(
    (id: string, request: MarkItemPurchasedRequest): Promise<MutationOutcome> => {
      void id;
      void request;
      return Promise.resolve({ kind: 'ok' });
    },
  );
  readonly unmarkItemPurchased = vi.fn((id: string): Promise<MutationOutcome> => {
    void id;
    return Promise.resolve({ kind: 'ok' });
  });
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

  it('o alvo de um item pendente abre o sheet de compra sem tocar na lista (T-13)', () => {
    store.status.set('loaded');
    store.items.set([item({ name: 'Café' })]);
    const fixture = mount();
    const element = root(fixture);

    (element.querySelector('.list__add') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('#item-name')).not.toBeNull();

    (element.querySelector('.bottom-sheet__close') as HTMLButtonElement).click();
    fixture.detectChanges();
    (element.querySelector('.item-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelector('.purchase-sheet')).not.toBeNull();
    expect(store.markItemPurchased).not.toHaveBeenCalled();
    expect(store.items()).toHaveLength(1);
  });

  it('o alvo de um item pendente abre o sheet com o prefill planejado; marcar confirma com toast (AC-12/AC-15)', async () => {
    store.status.set('loaded');
    store.items.set([item({ id: 'a', name: 'Arroz', plannedQuantity: 2, unit: 'kg' })]);
    const fixture = mount();
    const element = root(fixture);
    const show = vi.spyOn(TestBed.inject(ToastService), 'show');

    (element.querySelector('.item-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelector('.bottom-sheet__title')?.textContent?.trim()).toBe(
      'Marcar como comprado',
    );
    expect((element.querySelector('#purchase-quantity') as HTMLInputElement).value).toBe('2');
    expect((element.querySelector('#purchase-unit') as HTMLSelectElement).value).toBe('kg');
    expect((element.querySelector('#purchase-price') as HTMLInputElement).value).toBe('');

    const price = element.querySelector('#purchase-price') as HTMLInputElement;
    price.value = '10';
    price.dispatchEvent(new Event('input'));
    (element.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await flush();
    fixture.detectChanges();

    expect(store.markItemPurchased).toHaveBeenCalledWith('a', {
      purchasedQuantity: 2,
      unit: 'kg',
      unitPrice: 10,
    });
    expect(show).toHaveBeenCalledWith('Item marcado como comprado');
    // Sucesso fecha o sheet de compra.
    expect(element.querySelector('.purchase-sheet')).toBeNull();
  });

  it('falha ao marcar mantém o digitado na tela e vira toast persistente (AC-23)', async () => {
    const message = 'Falha de rede. Verifique a conexão e tente novamente.';
    store.markItemPurchased.mockImplementation(async (): Promise<MutationOutcome> => {
      store.mutationError.set(message);
      return { kind: 'error', message };
    });

    store.status.set('loaded');
    store.items.set([item({ id: 'a', name: 'Arroz' })]);
    const fixture = mount();
    const element = root(fixture);
    const error = vi.spyOn(TestBed.inject(ToastService), 'error');

    (element.querySelector('.item-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    const quantity = element.querySelector('#purchase-quantity') as HTMLInputElement;
    quantity.value = '2';
    quantity.dispatchEvent(new Event('input'));
    const unit = element.querySelector('#purchase-unit') as HTMLSelectElement;
    unit.value = 'kg';
    unit.dispatchEvent(new Event('change'));
    const price = element.querySelector('#purchase-price') as HTMLInputElement;
    price.value = '10';
    price.dispatchEvent(new Event('input'));

    (element.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await flush();
    fixture.detectChanges();

    expect(error).toHaveBeenCalledWith(message);
    expect(store.clearMutationError).toHaveBeenCalled();
    // O sheet segue aberto com o digitado — a pessoa só precisa tentar de novo.
    expect(element.querySelector('.purchase-sheet')).not.toBeNull();
    expect((element.querySelector('#purchase-quantity') as HTMLInputElement).value).toBe('2');
    expect((element.querySelector('#purchase-unit') as HTMLSelectElement).value).toBe('kg');
    expect((element.querySelector('#purchase-price') as HTMLInputElement).value).toBe('10');
  });

  it('desmarcar devolve o item a pendente e reabrir o sheet preserva os digitados (AC-16)', async () => {
    store.status.set('loaded');
    const purchased = item({
      id: 'item-1',
      name: 'Arroz',
      plannedQuantity: 1,
      unit: 'kg',
      purchased: {
        quantity: 3,
        unit: 'pacote',
        unitPrice: 9.9,
        purchasedAt: '2026-10-13T11:00:00.000Z',
      },
    });
    store.items.set([purchased]);
    const fixture = mount();
    const element = root(fixture);
    const show = vi.spyOn(TestBed.inject(ToastService), 'show');

    (element.querySelector('.item-row__toggle') as HTMLButtonElement).click();
    await flush();
    fixture.detectChanges();

    expect(store.unmarkItemPurchased).toHaveBeenCalledWith('item-1');
    expect(show).toHaveBeenCalledWith('Item desmarcado');

    // A releitura do serviço traz o item pendente; o digitado fica na tela (RN-12/CD-04).
    store.items.set([item({ id: 'item-1', name: 'Arroz', plannedQuantity: 1, unit: 'kg' })]);
    fixture.detectChanges();
    (element.querySelector('.item-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect((element.querySelector('#purchase-quantity') as HTMLInputElement).value).toBe('3');
    expect((element.querySelector('#purchase-unit') as HTMLSelectElement).value).toBe('pacote');
    expect((element.querySelector('#purchase-price') as HTMLInputElement).value).toBe('9,9');
  });

  it('toque duplo no alvo de desmarcar compartilha uma única requisição (AC-26)', async () => {
    let resolveUnmark: (outcome: MutationOutcome) => void = () => undefined;
    store.unmarkItemPurchased.mockImplementation(
      () =>
        new Promise<MutationOutcome>((resolve) => {
          resolveUnmark = resolve;
        }),
    );

    store.status.set('loaded');
    store.items.set([PURCHASED]);
    const fixture = mount();
    const element = root(fixture);

    const toggle = element.querySelector('.item-row__toggle') as HTMLButtonElement;
    toggle.click();
    toggle.click();
    await flush();

    expect(store.unmarkItemPurchased).toHaveBeenCalledTimes(1);

    resolveUnmark({ kind: 'ok' });
    await flush();
  });

  it('item comprado continua editável: as ações abrem o formulário preenchido (AC-17)', () => {
    store.status.set('loaded');
    store.items.set([PURCHASED]);
    const fixture = mount();
    const element = root(fixture);

    (element.querySelector('.item-row__actions') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelector('.bottom-sheet__title')?.textContent?.trim()).toBe('Editar item');
    expect((element.querySelector('#item-name') as HTMLInputElement).value).toBe('Arroz');
  });

  it('o CTA do vazio abre o formulário e salvar pede a criação com os opcionais vazios (AC-04)', async () => {
    store.status.set('loaded');
    const fixture = mount();
    const element = root(fixture);
    const show = vi.spyOn(TestBed.inject(ToastService), 'show');

    (element.querySelector('.empty__cta') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelector('.bottom-sheet__title')?.textContent?.trim()).toBe(
      'Adicionar item',
    );

    const name = element.querySelector('#item-name') as HTMLInputElement;
    name.value = 'Café';
    name.dispatchEvent(new Event('input'));
    (element.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await flush();
    fixture.detectChanges();

    expect(store.createItem).toHaveBeenCalledWith({
      name: 'Café',
      plannedQuantity: null,
      unit: null,
      plannedPrice: null,
    });
    // Sucesso fecha o formulário e confirma na tela (toast é do host de T-14).
    expect(show).toHaveBeenCalledWith('Item adicionado');
    expect(element.querySelector('.item-form')).toBeNull();
  });

  it('a ação da linha abre o formulário de edição já preenchido (AC-10)', () => {
    store.status.set('loaded');
    store.items.set([
      item({ id: 'a', name: 'Arroz', plannedQuantity: 2, unit: 'kg', plannedPrice: 12.5 }),
    ]);
    const fixture = mount();
    const element = root(fixture);

    (element.querySelector('.item-row__actions') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelector('.bottom-sheet__title')?.textContent?.trim()).toBe('Editar item');
    expect((element.querySelector('#item-name') as HTMLInputElement).value).toBe('Arroz');
    expect((element.querySelector('#item-quantity') as HTMLInputElement).value).toBe('2');
    expect((element.querySelector('#item-unit') as HTMLSelectElement).value).toBe('kg');
    expect((element.querySelector('#item-price') as HTMLInputElement).value).toBe('12,5');
  });

  it('a falha de mutação do store vira um toast persistente e é consumida (AC-23)', async () => {
    store.status.set('loaded');
    const fixture = mount();
    const error = vi.spyOn(TestBed.inject(ToastService), 'error');

    store.mutationError.set('Falha de rede. Verifique a conexão e tente novamente.');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(error).toHaveBeenCalledWith('Falha de rede. Verifique a conexão e tente novamente.');
    expect(store.clearMutationError).toHaveBeenCalled();
  });
});

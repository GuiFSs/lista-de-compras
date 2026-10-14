import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import type { PurchasedDetails, ShoppingListItem } from '@lista/contracts';
import { CheckoutSheet } from './checkout-sheet';
import { ShoppingListStore } from './state';
import type { MutationOutcome } from './state';

/** Deixa as microtasks drenarem antes de checar a tela (clique → `await` → render). */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const PURCHASED: PurchasedDetails = {
  quantity: 2,
  unit: 'pacote',
  unitPrice: 12.5,
  purchasedAt: '2026-10-13T11:00:00.000Z',
};

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

class StoreStub {
  readonly items = signal<readonly ShoppingListItem[]>([]);
  readonly purchasedCount = computed(
    () => this.items().filter((value) => value.purchased !== null).length,
  );
  readonly pendingCount = computed(
    () => this.items().filter((value) => value.purchased === null).length,
  );
  readonly saving = signal(false);
  readonly checkout = vi.fn((): Promise<MutationOutcome> => Promise.resolve({ kind: 'ok' }));
}

function query<T extends Element>(fixture: ComponentFixture<unknown>, selector: string): T {
  const element = fixture.nativeElement.querySelector(selector) as T | null;
  if (!element) throw new Error(`Elemento não encontrado: ${selector}`);
  return element;
}

function root(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function buttonByText(fixture: ComponentFixture<unknown>, text: string): HTMLButtonElement {
  const buttons = Array.from(
    root(fixture).querySelectorAll('button'),
  ) as HTMLButtonElement[];
  const button = buttons.find((candidate) => candidate.textContent?.trim() === text);
  if (!button) throw new Error(`Botão não encontrado: ${text}`);
  return button;
}

describe('CheckoutSheet', () => {
  let store: StoreStub;

  beforeEach(() => {
    TestBed.resetTestingModule();
    store = new StoreStub();
    TestBed.configureTestingModule({
      providers: [{ provide: ShoppingListStore, useValue: store }],
    });
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  function mount(): ComponentFixture<CheckoutSheet> {
    const fixture = TestBed.createComponent(CheckoutSheet);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    return fixture;
  }

  function confirmedCount(fixture: ComponentFixture<CheckoutSheet>): () => number {
    let count = 0;
    fixture.componentInstance.confirmed.subscribe(() => {
      count += 1;
    });
    return () => count;
  }

  it('é um sheet de confirmação com o resumo de quantos saem e quantos permanecem (AC-19)', () => {
    store.items.set([
      item({ id: 'c1', purchased: PURCHASED }),
      item({ id: 'c2', purchased: PURCHASED }),
      item({ id: 'p1' }),
      item({ id: 'p2' }),
      item({ id: 'p3' }),
    ]);
    const fixture = mount();

    expect(query(fixture, '.bottom-sheet__title').textContent?.trim()).toBe('Concluir compra');

    const lines = Array.from(root(fixture).querySelectorAll('.checkout__line')).map((node) =>
      node.textContent?.trim(),
    );
    expect(lines).toEqual(['2 itens comprados saem da lista.', '3 itens permanecem na lista.']);
  });

  it('com um só de cada lado, o resumo fica no singular', () => {
    store.items.set([item({ id: 'c1', purchased: PURCHASED }), item({ id: 'p1' })]);
    const fixture = mount();

    const lines = Array.from(root(fixture).querySelectorAll('.checkout__line')).map((node) =>
      node.textContent?.trim(),
    );
    expect(lines).toEqual(['1 item comprado sai da lista.', '1 item permanece na lista.']);
  });

  it('sem nenhum comprado, o resumo mostra 0/N e avisa que a lista continua como está (AC-20)', () => {
    store.items.set([item({ id: 'p1' }), item({ id: 'p2' })]);
    const fixture = mount();

    const lines = Array.from(root(fixture).querySelectorAll('.checkout__line')).map((node) =>
      node.textContent?.trim(),
    );
    expect(lines).toEqual(['Nenhum item sai da lista.', '2 itens permanecem na lista.']);
    expect(query(fixture, '.checkout__lead').textContent).toContain('continua como está');
  });

  it('confirmar envia a conclusão ao serviço e emite `confirmed` (AC-19)', async () => {
    store.items.set([item({ id: 'c1', purchased: PURCHASED }), item({ id: 'p1' })]);
    const fixture = mount();
    const confirmed = confirmedCount(fixture);

    buttonByText(fixture, 'Concluir compra').click();
    await flush();
    fixture.detectChanges();

    expect(store.checkout).toHaveBeenCalledTimes(1);
    expect(confirmed()).toBe(1);
  });

  it('sem nenhum comprado, confirmar mantém a lista exatamente como estava (AC-20)', async () => {
    const before = [item({ id: 'p1', name: 'Café' }), item({ id: 'p2', name: 'Arroz' })];
    store.items.set(before);
    // O serviço só remove comprados: sem nenhum, devolve a mesma lista (RN-15).
    store.checkout.mockImplementation(async (): Promise<MutationOutcome> => {
      store.items.set(before);
      return { kind: 'ok' };
    });

    const fixture = mount();
    const confirmed = confirmedCount(fixture);

    buttonByText(fixture, 'Concluir compra').click();
    await flush();
    fixture.detectChanges();

    expect(store.checkout).toHaveBeenCalledTimes(1);
    expect(confirmed()).toBe(1);
    expect(store.items()).toEqual(before);
  });

  it('cancelar não muda nada: fecha sem chamar o serviço (AC-19)', () => {
    store.items.set([item({ id: 'c1', purchased: PURCHASED })]);
    const fixture = mount();
    const confirmed = confirmedCount(fixture);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    buttonByText(fixture, 'Cancelar').click();
    fixture.detectChanges();

    expect(closed).toHaveBeenCalledTimes(1);
    expect(store.checkout).not.toHaveBeenCalled();
    expect(confirmed()).toBe(0);
    expect(store.items()).toHaveLength(1);
  });

  it('durante o envio, o botão mostra progresso e fica desabilitado (AC-26)', async () => {
    store.items.set([item({ id: 'c1', purchased: PURCHASED })]);
    store.checkout.mockImplementation(
      () =>
        new Promise<MutationOutcome>(() => {
          // Nunca resolve: o estado de envio é o que interessa aqui.
        }),
    );

    const fixture = mount();

    buttonByText(fixture, 'Concluir compra').click();
    await flush();
    fixture.detectChanges();

    const button = buttonByText(fixture, 'Concluindo…');
    expect(button.disabled).toBe(true);
    expect(store.checkout).toHaveBeenCalledTimes(1);
  });

  it('falha na conclusão preserva o sheet aberto para nova tentativa (AC-23)', async () => {
    store.items.set([item({ id: 'c1', purchased: PURCHASED })]);
    store.checkout.mockResolvedValue({ kind: 'error', message: 'Erro interno' });

    const fixture = mount();
    const confirmed = confirmedCount(fixture);

    buttonByText(fixture, 'Concluir compra').click();
    await flush();
    fixture.detectChanges();

    expect(confirmed()).toBe(0);
    expect(fixture.nativeElement.querySelector('.checkout')).not.toBeNull();
    expect(buttonByText(fixture, 'Concluir compra').disabled).toBe(false);
  });

  it('não pede mercado nem data: nenhum campo no sheet (AC-21)', () => {
    store.items.set([item({ id: 'c1', purchased: PURCHASED }), item({ id: 'p1' })]);
    const fixture = mount();
    const text = (fixture.nativeElement as HTMLElement).textContent?.toLowerCase() ?? '';

    expect(fixture.nativeElement.querySelectorAll('input, select, textarea')).toHaveLength(0);
    expect(text).not.toContain('mercado');
    expect(text).not.toContain('data');
  });

  it('as ações têm alvo ≥44px e a confirmação é a única primary do sheet (AC-25)', () => {
    const fixture = mount();
    const primary = buttonByText(fixture, 'Concluir compra');
    const cancel = buttonByText(fixture, 'Cancelar');

    expect(fixture.nativeElement.querySelectorAll('.btn-primary')).toHaveLength(1);
    // O jsdom devolve o valor declarado (não resolve `var()`): é o token de 44px.
    expect(getComputedStyle(primary).minHeight).toBe('var(--touch-target-min)');
    expect(getComputedStyle(cancel).minHeight).toBe('var(--touch-target-min)');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import type { PurchasedDetails, ShoppingListItem } from '@lista/contracts';
import { CheckoutSheet, localDateString } from './checkout-sheet';
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

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return localDateString(date);
}

class StoreStub {
  readonly items = signal<readonly ShoppingListItem[]>([]);
  readonly purchasedCount = computed(
    () => this.items().filter((value) => value.purchased !== null).length,
  );
  readonly pendingCount = computed(
    () => this.items().filter((value) => value.purchased === null).length,
  );
  readonly concluding = signal(false);
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

function typeInto(fixture: ComponentFixture<unknown>, selector: string, value: string): void {
  const input = query<HTMLInputElement>(fixture, selector);
  input.value = value;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
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

  it('com comprados, mostra os campos Mercado e Data com hoje pré-preenchido e `max` = hoje (AC-03)', () => {
    store.items.set([item({ id: 'c1', purchased: PURCHASED }), item({ id: 'p1' })]);
    const fixture = mount();

    const market = query<HTMLInputElement>(fixture, '#checkout-market');
    const date = query<HTMLInputElement>(fixture, '#checkout-date');
    expect(market.type).toBe('text');
    expect(date.type).toBe('date');
    expect(date.value).toBe(localDateString());
    expect(date.getAttribute('max')).toBe(localDateString());

    // Rótulos associados ao campo e marcados como obrigatórios (AC-19).
    expect(query(fixture, 'label[for="checkout-market"]').textContent).toContain('Mercado');
    expect(query(fixture, 'label[for="checkout-date"]').textContent).toContain('Data da compra');
  });

  it('sem nenhum comprado, não há campos de mercado/data (RN-09)', () => {
    store.items.set([item({ id: 'p1' }), item({ id: 'p2' })]);
    const fixture = mount();

    expect(root(fixture).querySelectorAll('input, select, textarea')).toHaveLength(0);
  });

  it('enviar com mercado/data válidos envia o payload e emite `confirmed` (AC-03)', async () => {
    store.items.set([item({ id: 'c1', purchased: PURCHASED }), item({ id: 'p1' })]);
    const fixture = mount();
    const confirmed = confirmedCount(fixture);

    typeInto(fixture, '#checkout-market', '  Mercado Z  ');
    buttonByText(fixture, 'Concluir compra').click();
    await flush();
    fixture.detectChanges();

    expect(store.checkout).toHaveBeenCalledTimes(1);
    expect(store.checkout).toHaveBeenCalledWith({
      market: 'Mercado Z',
      purchaseDate: localDateString(),
    });
    expect(confirmed()).toBe(1);
  });

  it('mercado vazio mostra o erro no campo, com aria-invalid, e não envia nada (AC-04)', async () => {
    store.items.set([item({ id: 'c1', purchased: PURCHASED })]);
    const fixture = mount();

    typeInto(fixture, '#checkout-market', '   ');
    buttonByText(fixture, 'Concluir compra').click();
    await flush();
    fixture.detectChanges();

    expect(store.checkout).not.toHaveBeenCalled();
    const error = query(fixture, '#checkout-market-error');
    expect(error.textContent?.trim()).toBe('Mercado é obrigatório');
    expect(error.getAttribute('role')).toBe('alert');
    const market = query<HTMLInputElement>(fixture, '#checkout-market');
    expect(market.getAttribute('aria-invalid')).toBe('true');
    expect(market.getAttribute('aria-describedby')).toBe('checkout-market-error');
  });

  it('data futura mostra o erro no campo e não envia nada (AC-04)', async () => {
    store.items.set([item({ id: 'c1', purchased: PURCHASED })]);
    const fixture = mount();

    typeInto(fixture, '#checkout-market', 'Mercado Z');
    typeInto(fixture, '#checkout-date', tomorrow());
    buttonByText(fixture, 'Concluir compra').click();
    await flush();
    fixture.detectChanges();

    expect(store.checkout).not.toHaveBeenCalled();
    expect(query(fixture, '#checkout-date-error').textContent?.trim()).toBe(
      'Data da compra não pode ser futura',
    );
    expect(query<HTMLInputElement>(fixture, '#checkout-date').getAttribute('aria-invalid')).toBe(
      'true',
    );
  });

  it('data vazia ou inválida mostra a mensagem própria e não envia nada (AC-04)', async () => {
    store.items.set([item({ id: 'c1', purchased: PURCHASED })]);
    const fixture = mount();

    typeInto(fixture, '#checkout-market', 'Mercado Z');
    typeInto(fixture, '#checkout-date', '');
    buttonByText(fixture, 'Concluir compra').click();
    await flush();
    fixture.detectChanges();
    expect(query(fixture, '#checkout-date-error').textContent?.trim()).toBe(
      'Data da compra é obrigatória',
    );

    // jsdom aplica a sanitização do `type="date"` e zera valor inválido; o
    // accessor simula um navegador que devolve o valor digitado (o setter
    // vazio absorve a gravação do binding `[value]` durante o CD).
    const date = query<HTMLInputElement>(fixture, '#checkout-date');
    Object.defineProperty(date, 'value', {
      configurable: true,
      get: () => '2026-02-31',
      set: () => undefined,
    });
    date.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    buttonByText(fixture, 'Concluir compra').click();
    await flush();
    fixture.detectChanges();
    expect(query(fixture, '#checkout-date-error').textContent?.trim()).toBe(
      'Data da compra inválida',
    );

    expect(store.checkout).not.toHaveBeenCalled();
  });

  it('sem nenhum comprado, confirmar envia sem payload e mantém a lista como estava (RN-09)', async () => {
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
    expect(store.checkout).toHaveBeenCalledWith(null);
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

  it('durante o envio o CTA mostra "Concluindo…" desabilitado; toque duplo não reenvia (AC-20/AC-15)', async () => {
    store.items.set([item({ id: 'c1', purchased: PURCHASED })]);
    store.checkout.mockImplementation(() => {
      store.concluding.set(true);
      return new Promise<MutationOutcome>(() => {
        // Nunca resolve: o estado de conclusão é o que interessa aqui.
      });
    });

    const fixture = mount();
    typeInto(fixture, '#checkout-market', 'Mercado Z');

    buttonByText(fixture, 'Concluir compra').click();
    await flush();
    fixture.detectChanges();

    // O segundo toque mira o rótulo já em progresso — o single-flight do store
    // e o `disabled` do CTA garantem um único POST (AC-20).
    buttonByText(fixture, 'Concluindo…').click();
    await flush();
    fixture.detectChanges();

    const button = buttonByText(fixture, 'Concluindo…');
    expect(button.disabled).toBe(true);
    expect(store.checkout).toHaveBeenCalledTimes(1);
  });

  it('erro 400 com mensagem PT mantém o sheet aberto e o digitado para nova tentativa (AC-05/AC-15)', async () => {
    store.items.set([item({ id: 'c1', purchased: PURCHASED }), item({ id: 'p1' })]);
    store.checkout.mockResolvedValueOnce({
      kind: 'error',
      message: 'Data da compra não pode ser futura',
    });

    const fixture = mount();
    const confirmed = confirmedCount(fixture);

    typeInto(fixture, '#checkout-market', 'Mercado Z');
    buttonByText(fixture, 'Concluir compra').click();
    await flush();
    fixture.detectChanges();

    // O sheet não fecha, o digitado permanece e o erro vira toast pela página.
    expect(confirmed()).toBe(0);
    expect(root(fixture).querySelector('.checkout')).not.toBeNull();
    expect(query<HTMLInputElement>(fixture, '#checkout-market').value).toBe('Mercado Z');
    expect(buttonByText(fixture, 'Concluir compra').disabled).toBe(false);

    // Nova tentativa é possível e fecha no sucesso.
    store.checkout.mockResolvedValue({ kind: 'ok' });
    buttonByText(fixture, 'Concluir compra').click();
    await flush();
    fixture.detectChanges();

    expect(store.checkout).toHaveBeenCalledTimes(2);
    expect(confirmed()).toBe(1);
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

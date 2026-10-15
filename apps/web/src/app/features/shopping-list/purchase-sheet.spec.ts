import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { MarkItemPurchasedRequest, ShoppingListItem } from '@lista/contracts';
import { ITEM_UNITS } from '@lista/contracts';
import { PurchaseSheet, type PurchaseDraft } from './purchase-sheet';
import { ShoppingListStore } from './state';
import type { MutationOutcome } from './state';

/** Deixa as microtasks drenarem antes de checar a tela (clique → `await` → render). */
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

class StoreStub {
  readonly saving = signal(false);
  markItemPurchased = vi.fn(
    (id: string, request: MarkItemPurchasedRequest): Promise<MutationOutcome> => {
      void id;
      void request;
      return Promise.resolve({ kind: 'ok' });
    },
  );
}

function query<T extends Element>(fixture: ComponentFixture<unknown>, selector: string): T {
  const element = fixture.nativeElement.querySelector(selector) as T | null;
  if (!element) throw new Error(`Elemento não encontrado: ${selector}`);
  return element;
}

function buttonByText(fixture: ComponentFixture<unknown>, text: string): HTMLButtonElement {
  const buttons = Array.from(
    fixture.nativeElement.querySelectorAll('button'),
  ) as HTMLButtonElement[];
  const button = buttons.find((candidate) => candidate.textContent?.trim() === text);
  if (!button) throw new Error(`Botão não encontrado: ${text}`);
  return button;
}

/** Título do sheet aberto no topo: o aviso de divergência empilha sobre os campos. */
function topSheetTitle(fixture: ComponentFixture<unknown>): string | undefined {
  const titles = fixture.nativeElement.querySelectorAll(
    '.bottom-sheet__title',
  ) as NodeListOf<HTMLElement>;
  return titles[titles.length - 1]?.textContent?.trim();
}

describe('PurchaseSheet', () => {
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

  function mount(
    target: ShoppingListItem,
    draft: PurchaseDraft | null = null,
  ): ComponentFixture<PurchaseSheet> {
    const fixture = TestBed.createComponent(PurchaseSheet);
    fixture.componentRef.setInput('item', target);
    fixture.componentRef.setInput('draft', draft);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    return fixture;
  }

  function purchasedCount(fixture: ComponentFixture<PurchaseSheet>): () => number {
    let count = 0;
    fixture.componentInstance.purchased.subscribe(() => {
      count += 1;
    });
    return () => count;
  }

  function setQuantity(fixture: ComponentFixture<PurchaseSheet>, value: string): void {
    const input = query<HTMLInputElement>(fixture, '#purchase-quantity');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function selectUnit(fixture: ComponentFixture<PurchaseSheet>, value: string): void {
    const select = query<HTMLSelectElement>(fixture, '#purchase-unit');
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function setPrice(fixture: ComponentFixture<PurchaseSheet>, value: string): void {
    const input = query<HTMLInputElement>(fixture, '#purchase-price');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /** Digita no fim do campo, caractere a caractere, como o navegador faria (caret no fim). */
  function typePrice(fixture: ComponentFixture<PurchaseSheet>, text: string): void {
    const input = query<HTMLInputElement>(fixture, '#purchase-price');
    for (const char of text) {
      input.value += char;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
  }

  function backspacePrice(fixture: ComponentFixture<PurchaseSheet>): void {
    const input = query<HTMLInputElement>(fixture, '#purchase-price');
    input.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true,
      }),
    );
    fixture.detectChanges();
  }

  function priceValue(fixture: ComponentFixture<PurchaseSheet>): string {
    return query<HTMLInputElement>(fixture, '#purchase-price').value;
  }

  function submit(fixture: ComponentFixture<PurchaseSheet>): void {
    query<HTMLFormElement>(fixture, 'form').dispatchEvent(new Event('submit'));
  }

  it('é um formulário de app com título e o item como contexto (guia §4)', () => {
    const fixture = mount(item({ name: 'Café' }));

    expect(query(fixture, '.bottom-sheet__title').textContent?.trim()).toBe(
      'Marcar como comprado',
    );
    expect(query(fixture, '.purchase-sheet__item').textContent?.trim()).toBe('Café');
  });

  it('oferece unidade em select com exatamente as 7 opções, sem digitação livre (AC-06)', () => {
    const fixture = mount(item());
    const select = query<HTMLSelectElement>(fixture, '#purchase-unit');

    expect(select.tagName).toBe('SELECT');
    const options = Array.from(select.querySelectorAll('option')).map((option) => option.value);
    expect(options).toEqual([...ITEM_UNITS]);
  });

  it('pré-preenche quantidade e unidade planejadas e deixa o preço por unidade vazio (AC-15)', () => {
    const fixture = mount(item({ plannedQuantity: 2, unit: 'kg', plannedPrice: 12.5 }));

    expect(query<HTMLInputElement>(fixture, '#purchase-quantity').value).toBe('2');
    expect(query<HTMLSelectElement>(fixture, '#purchase-unit').value).toBe('kg');
    // RN-13: o preço planejado é referência, não o pago — o campo começa vazio.
    expect(query<HTMLInputElement>(fixture, '#purchase-price').value).toBe('');
  });

  it('sem planejados, os três campos começam vazios e a unidade não inventa a primeira opção (AC-15)', () => {
    const fixture = mount(item({ plannedQuantity: null, unit: null }));

    expect(query<HTMLInputElement>(fixture, '#purchase-quantity').value).toBe('');
    expect(query<HTMLSelectElement>(fixture, '#purchase-unit').selectedIndex).toBe(-1);
    expect(query<HTMLInputElement>(fixture, '#purchase-price').value).toBe('');
  });

  it('usa os valores preservados quando existem, no lugar do prefill do planejado (AC-16)', () => {
    const draft: PurchaseDraft = { purchasedQuantity: 3, unit: 'pacote', unitPrice: 9.9 };
    const fixture = mount(item({ plannedQuantity: 2, unit: 'kg' }), draft);

    expect(query<HTMLInputElement>(fixture, '#purchase-quantity').value).toBe('3');
    expect(query<HTMLSelectElement>(fixture, '#purchase-unit').value).toBe('pacote');
    // RN-12: o preço preservado reaparece na máscara (9.9 → R$ 9,90).
    expect(priceValue(fixture)).toBe('R$ 9,90');
  });

  it('os três campos são obrigatórios: erro em cada campo e nenhuma requisição (AC-13)', async () => {
    const fixture = mount(item());
    submit(fixture);
    await flush();
    fixture.detectChanges();

    expect(store.markItemPurchased).not.toHaveBeenCalled();

    const quantity = query<HTMLInputElement>(fixture, '#purchase-quantity');
    const unit = query<HTMLSelectElement>(fixture, '#purchase-unit');
    const price = query<HTMLInputElement>(fixture, '#purchase-price');

    expect(quantity.getAttribute('aria-invalid')).toBe('true');
    expect(quantity.getAttribute('aria-describedby')).toBe('purchase-quantity-error');
    expect(query(fixture, '#purchase-quantity-error').textContent?.trim()).toBe(
      'Informe a quantidade comprada.',
    );

    expect(unit.getAttribute('aria-invalid')).toBe('true');
    expect(unit.getAttribute('aria-describedby')).toBe('purchase-unit-error');
    expect(query(fixture, '#purchase-unit-error').textContent?.trim()).toBe('Selecione a unidade.');

    expect(price.getAttribute('aria-invalid')).toBe('true');
    expect(price.getAttribute('aria-describedby')).toBe('purchase-price-error');
    expect(query(fixture, '#purchase-price-error').textContent?.trim()).toBe(
      'Informe o preço por unidade.',
    );
  });

  it('valida quantidade > 0 sem enviar a marcação (RN-06/AC-13)', async () => {
    const fixture = mount(item({ plannedQuantity: 2, unit: 'kg' }));
    setQuantity(fixture, '0');
    selectUnit(fixture, 'kg');
    setPrice(fixture, '1000');
    submit(fixture);
    await flush();
    fixture.detectChanges();

    expect(store.markItemPurchased).not.toHaveBeenCalled();
    expect(query(fixture, '#purchase-quantity-error').textContent?.trim()).toBe(
      'A quantidade deve ser maior que zero.',
    );
  });

  it('a máscara não aceita sinal: "-" não vira dígito e o preço nunca fica negativo (RN-21/AC-27)', async () => {
    const fixture = mount(item());
    setQuantity(fixture, '1');
    selectUnit(fixture, 'kg');

    setPrice(fixture, '-');
    expect(priceValue(fixture)).toBe('');

    setPrice(fixture, '-1');
    expect(priceValue(fixture)).toBe('R$ 0,01');

    submit(fixture);
    await flush();

    // A regra defensiva "preço ≥ 0" (RN-06/CD-08) segue no código, mas a máscara
    // só forma dígitos: o envio acontece, sem o caminho de erro de negativo.
    expect(fixture.nativeElement.querySelector('#purchase-price-error')).toBeNull();
    expect(store.markItemPurchased).toHaveBeenCalledWith('item-1', {
      purchasedQuantity: 1,
      unit: 'kg',
      unitPrice: 0.01,
    });
  });

  it('máscara de centavos em BRL: 3/30/3015 viram R$ 0,03/R$ 0,30/R$ 30,15 e enviam número (AC-27)', async () => {
    const fixture = mount(item());
    setQuantity(fixture, '1');
    selectUnit(fixture, 'kg');

    typePrice(fixture, '3');
    expect(priceValue(fixture)).toBe('R$ 0,03');

    typePrice(fixture, '0');
    expect(priceValue(fixture)).toBe('R$ 0,30');

    typePrice(fixture, '15');
    expect(priceValue(fixture)).toBe('R$ 30,15');

    submit(fixture);
    await flush();

    expect(store.markItemPurchased).toHaveBeenCalledWith('item-1', {
      purchasedQuantity: 1,
      unit: 'kg',
      unitPrice: 30.15,
    });
  });

  it('um backspace apaga um dígito (RN-21/CD-15)', () => {
    const fixture = mount(item());

    typePrice(fixture, '3015');
    expect(priceValue(fixture)).toBe('R$ 30,15');

    backspacePrice(fixture);
    expect(priceValue(fixture)).toBe('R$ 3,01');
    backspacePrice(fixture);
    expect(priceValue(fixture)).toBe('R$ 0,30');
    backspacePrice(fixture);
    expect(priceValue(fixture)).toBe('R$ 0,03');
    backspacePrice(fixture);
    expect(priceValue(fixture)).toBe('');
  });

  it('colar mantém só os dígitos, sem separador de milhar (AC-27/CD-15)', () => {
    const fixture = mount(item());

    setPrice(fixture, 'abc12,34');
    expect(priceValue(fixture)).toBe('R$ 12,34');

    setPrice(fixture, 'R$ 1.234,56');
    expect(priceValue(fixture)).toBe('R$ 1234,56');
  });

  it('o campo de preço usa teclado numérico (AC-27)', () => {
    const fixture = mount(item());

    expect(
      query<HTMLInputElement>(fixture, '#purchase-price').getAttribute('inputmode'),
    ).toBe('numeric');
  });

  it('marca com os três campos e emite o sucesso (AC-12)', async () => {
    const fixture = mount(item({ name: 'Arroz' }));
    const purchased = purchasedCount(fixture);
    setQuantity(fixture, '1,5');
    selectUnit(fixture, 'kg');
    setPrice(fixture, '12,50');
    expect(priceValue(fixture)).toBe('R$ 12,50');
    submit(fixture);
    await flush();

    expect(store.markItemPurchased).toHaveBeenCalledWith('item-1', {
      purchasedQuantity: 1.5,
      unit: 'kg',
      unitPrice: 12.5,
    });
    expect(purchased()).toBe(1);
  });

  it('mostra "Salvando…" e desabilita; toques repetidos geram uma única requisição (AC-26)', async () => {
    let resolveMark: (outcome: MutationOutcome) => void = () => undefined;
    store.markItemPurchased.mockImplementation(
      () =>
        new Promise<MutationOutcome>((resolve) => {
          resolveMark = resolve;
        }),
    );

    const fixture = mount(item());
    setQuantity(fixture, '2');
    selectUnit(fixture, 'kg');
    setPrice(fixture, '1000');

    const form = query<HTMLFormElement>(fixture, 'form');
    form.dispatchEvent(new Event('submit'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(store.markItemPurchased).toHaveBeenCalledTimes(1);
    const saveButton = query<HTMLButtonElement>(fixture, 'button[type="submit"]');
    expect(saveButton.disabled).toBe(true);
    expect(saveButton.textContent).toContain('Salvando…');

    resolveMark({ kind: 'ok' });
    await flush();
  });

  it('quantidade diferente da planejada avisa e só marca após confirmar (AC-14)', async () => {
    const fixture = mount(item({ plannedQuantity: 2, unit: 'kg' }));
    const purchased = purchasedCount(fixture);
    setQuantity(fixture, '3');
    selectUnit(fixture, 'kg');
    setPrice(fixture, '1000');
    submit(fixture);
    await flush();
    fixture.detectChanges();

    // Ainda sem requisição: o aviso pede confirmação antes de marcar.
    expect(store.markItemPurchased).not.toHaveBeenCalled();
    expect(topSheetTitle(fixture)).toBe('Quantidade diferente');
    const warning = query(fixture, '.purchase-sheet__warning');
    expect(warning.getAttribute('role')).toBe('alert');
    expect(warning.textContent).toContain('3 kg');
    expect(warning.textContent).toContain('2 kg');

    buttonByText(fixture, 'Confirmar').click();
    await flush();

    expect(store.markItemPurchased).toHaveBeenCalledWith('item-1', {
      purchasedQuantity: 3,
      unit: 'kg',
      unitPrice: 10,
    });
    expect(purchased()).toBe(1);
  });

  it('"Voltar" do aviso mantém o digitado e não marca (AC-14)', async () => {
    const fixture = mount(item({ plannedQuantity: 2, unit: 'kg' }));
    setQuantity(fixture, '3');
    selectUnit(fixture, 'kg');
    setPrice(fixture, '1000');
    submit(fixture);
    await flush();
    fixture.detectChanges();

    buttonByText(fixture, 'Voltar').click();
    fixture.detectChanges();

    expect(store.markItemPurchased).not.toHaveBeenCalled();
    expect(topSheetTitle(fixture)).toBe('Marcar como comprado');
    expect(query<HTMLInputElement>(fixture, '#purchase-quantity').value).toBe('3');
    expect(query<HTMLInputElement>(fixture, '#purchase-price').value).toBe('R$ 10,00');
  });

  it('quantidade igual à planejada não avisa e marca direto (AC-14)', async () => {
    const fixture = mount(item({ plannedQuantity: 2, unit: 'kg' }));
    setQuantity(fixture, '2');
    selectUnit(fixture, 'kg');
    setPrice(fixture, '1000');
    submit(fixture);
    await flush();
    fixture.detectChanges();

    expect(topSheetTitle(fixture)).toBe('Marcar como comprado');
    expect(store.markItemPurchased).toHaveBeenCalledTimes(1);
  });

  it('sem quantidade planejada, não avisa mesmo com quantidade diferente (AC-14)', async () => {
    const fixture = mount(item({ plannedQuantity: null, unit: 'kg' }));
    setQuantity(fixture, '7');
    selectUnit(fixture, 'kg');
    setPrice(fixture, '300');
    submit(fixture);
    await flush();
    fixture.detectChanges();

    expect(topSheetTitle(fixture)).toBe('Marcar como comprado');
    expect(store.markItemPurchased).toHaveBeenCalledWith('item-1', {
      purchasedQuantity: 7,
      unit: 'kg',
      unitPrice: 3,
    });
  });

  it('falha de rede mantém o sheet aberto com o digitado, sem emitir sucesso (AC-23)', async () => {
    store.markItemPurchased.mockResolvedValueOnce({
      kind: 'error',
      message: 'Falha de rede. Verifique a conexão e tente novamente.',
    });

    const fixture = mount(item());
    const purchased = purchasedCount(fixture);
    setQuantity(fixture, '2');
    selectUnit(fixture, 'unidade');
    setPrice(fixture, '500');
    submit(fixture);
    await flush();
    fixture.detectChanges();

    expect(purchased()).toBe(0);
    expect(query<HTMLInputElement>(fixture, '#purchase-quantity').value).toBe('2');
    expect(query<HTMLSelectElement>(fixture, '#purchase-unit').value).toBe('unidade');
    expect(query<HTMLInputElement>(fixture, '#purchase-price').value).toBe('R$ 5,00');
    expect(query<HTMLFormElement>(fixture, 'form')).toBeTruthy();
  });
});

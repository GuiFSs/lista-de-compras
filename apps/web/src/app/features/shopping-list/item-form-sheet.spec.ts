import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { CreateShoppingListItemRequest, ShoppingListItem, UpdateShoppingListItemRequest } from '@lista/contracts';
import { ITEM_UNITS } from '@lista/contracts';
import { ItemFormSheet, type ItemFormMode } from './item-form-sheet';
import { ShoppingListStore } from './state';
import type { CreateItemOutcome, UpdateItemOutcome } from './state';

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
  createItem = vi.fn((request: CreateShoppingListItemRequest): Promise<CreateItemOutcome> => {
    void request;
    return Promise.resolve({ kind: 'created' });
  });
  updateItem = vi.fn(
    (id: string, request: UpdateShoppingListItemRequest): Promise<UpdateItemOutcome> => {
      void id;
      void request;
      return Promise.resolve({ kind: 'updated' });
    },
  );
}

function query<T extends Element>(fixture: ComponentFixture<unknown>, selector: string): T {
  const element = fixture.nativeElement.querySelector(selector) as T | null;
  if (!element) throw new Error(`Elemento não encontrado: ${selector}`);
  return element;
}

function buttonByText(fixture: ComponentFixture<unknown>, text: string): HTMLButtonElement {
  const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
  const button = buttons.find((candidate) => candidate.textContent?.trim() === text);
  if (!button) throw new Error(`Botão não encontrado: ${text}`);
  return button;
}

/** Título do sheet no topo: a pergunta de soma empilha sobre o formulário aberto. */
function topSheetTitle(fixture: ComponentFixture<unknown>): string | undefined {
  const titles = fixture.nativeElement.querySelectorAll('.bottom-sheet__title') as NodeListOf<HTMLElement>;
  return titles[titles.length - 1]?.textContent?.trim();
}

describe('ItemFormSheet', () => {
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

  function mount(mode: ItemFormMode, editing: ShoppingListItem | null = null): ComponentFixture<ItemFormSheet> {
    const fixture = TestBed.createComponent(ItemFormSheet);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('item', editing);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    return fixture;
  }

  function savedCount(fixture: ComponentFixture<ItemFormSheet>): () => number {
    let count = 0;
    fixture.componentInstance.saved.subscribe(() => {
      count += 1;
    });
    return () => count;
  }

  function setName(fixture: ComponentFixture<ItemFormSheet>, value: string): void {
    const input = query<HTMLInputElement>(fixture, '#item-name');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function setQuantity(fixture: ComponentFixture<ItemFormSheet>, value: string): void {
    const input = query<HTMLInputElement>(fixture, '#item-quantity');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function setPrice(fixture: ComponentFixture<ItemFormSheet>, value: string): void {
    const input = query<HTMLInputElement>(fixture, '#item-price');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /** Digita no fim do campo, caractere a caractere, como o navegador faria (caret no fim). */
  function typePrice(fixture: ComponentFixture<ItemFormSheet>, text: string): void {
    const input = query<HTMLInputElement>(fixture, '#item-price');
    for (const char of text) {
      input.value += char;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
  }

  function backspacePrice(fixture: ComponentFixture<ItemFormSheet>): void {
    const input = query<HTMLInputElement>(fixture, '#item-price');
    input.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true,
      }),
    );
    fixture.detectChanges();
  }

  function priceValue(fixture: ComponentFixture<ItemFormSheet>): string {
    return query<HTMLInputElement>(fixture, '#item-price').value;
  }

  function selectUnit(fixture: ComponentFixture<ItemFormSheet>, value: string): void {
    const select = query<HTMLSelectElement>(fixture, '#item-unit');
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function submit(fixture: ComponentFixture<ItemFormSheet>): void {
    query<HTMLFormElement>(fixture, 'form').dispatchEvent(new Event('submit'));
  }

  it('é um formulário de app nomeado pelo tipo de fluxo (guia §4)', () => {
    const create = mount('create');
    expect(query(create, '.bottom-sheet__title').textContent?.trim()).toBe('Adicionar item');

    const edit = mount('edit', item({ name: 'Arroz' }));
    expect(query(edit, '.bottom-sheet__title').textContent?.trim()).toBe('Editar item');
  });

  it('oferece unidade em select com exatamente as 7 opções, sem digitação livre (AC-06)', () => {
    const fixture = mount('create');
    const select = query<HTMLSelectElement>(fixture, '#item-unit');

    expect(select.tagName).toBe('SELECT');
    const options = Array.from(select.querySelectorAll('option')).map((option) => option.value);
    expect(options).toEqual([...ITEM_UNITS]);
    // Sem unidade escolhida, nada aparece marcado (o campo é opcional — AC-04).
    expect(select.selectedIndex).toBe(-1);
  });

  it('salvar sem nome (ou só com espaços) mostra erro no campo e não faz requisição (AC-05)', async () => {
    const fixture = mount('create');
    setName(fixture, '   ');
    submit(fixture);
    await flush();
    fixture.detectChanges();

    expect(store.createItem).not.toHaveBeenCalled();
    const input = query<HTMLInputElement>(fixture, '#item-name');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('item-name-error');
    expect(query(fixture, '#item-name-error').textContent?.trim()).toBe('Informe o nome do item.');
  });

  it('valida quantidade > 0 sem enviar requisição (RN-06)', async () => {
    const fixture = mount('create');
    setName(fixture, 'Café');
    setQuantity(fixture, '0');
    submit(fixture);
    await flush();
    fixture.detectChanges();

    expect(store.createItem).not.toHaveBeenCalled();
    expect(query(fixture, '#item-quantity-error').textContent?.trim()).toBe(
      'A quantidade deve ser maior que zero.',
    );

    setQuantity(fixture, '2');
    submit(fixture);
    await flush();

    expect(store.createItem).toHaveBeenCalledTimes(1);
  });

  it('a máscara não aceita sinal: "-" não vira dígito e o preço nunca fica negativo (RN-21/AC-27)', async () => {
    const fixture = mount('create');
    setName(fixture, 'Café');

    setPrice(fixture, '-');
    expect(priceValue(fixture)).toBe('');

    setPrice(fixture, '-1');
    expect(priceValue(fixture)).toBe('R$ 0,01');

    submit(fixture);
    await flush();

    // A regra defensiva "preço ≥ 0" (RN-06/CD-08) segue no código, mas a máscara
    // só forma dígitos: o envio acontece, sem o caminho de erro de negativo.
    expect(fixture.nativeElement.querySelector('#item-price-error')).toBeNull();
    expect(store.createItem).toHaveBeenCalledWith({
      name: 'Café',
      plannedQuantity: null,
      unit: null,
      plannedPrice: 0.01,
    });
  });

  it('máscara de centavos em BRL: 3/30/3015 viram R$ 0,03/R$ 0,30/R$ 30,15 e enviam número (AC-27)', async () => {
    const fixture = mount('create');
    setName(fixture, 'Arroz');

    typePrice(fixture, '3');
    expect(priceValue(fixture)).toBe('R$ 0,03');

    typePrice(fixture, '0');
    expect(priceValue(fixture)).toBe('R$ 0,30');

    typePrice(fixture, '15');
    expect(priceValue(fixture)).toBe('R$ 30,15');

    submit(fixture);
    await flush();

    expect(store.createItem).toHaveBeenCalledWith({
      name: 'Arroz',
      plannedQuantity: null,
      unit: null,
      plannedPrice: 30.15,
    });
  });

  it('um backspace apaga um dígito (RN-21/CD-15)', () => {
    const fixture = mount('create');

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
    const fixture = mount('create');

    setPrice(fixture, 'abc12,34');
    expect(priceValue(fixture)).toBe('R$ 12,34');

    setPrice(fixture, 'R$ 1.234,56');
    expect(priceValue(fixture)).toBe('R$ 1234,56');
  });

  it('texto inválido não cola na tela: o campo volta à máscara (AC-27)', () => {
    const fixture = mount('create');

    typePrice(fixture, '3015');
    typePrice(fixture, 'x');

    expect(priceValue(fixture)).toBe('R$ 30,15');
  });

  it('o campo de preço usa teclado numérico (AC-27)', () => {
    const fixture = mount('create');

    expect(query<HTMLInputElement>(fixture, '#item-price').getAttribute('inputmode')).toBe(
      'numeric',
    );
  });

  it('adiciona só com o nome, com os opcionais vazios (AC-04)', async () => {
    const fixture = mount('create');
    const saved = savedCount(fixture);
    setName(fixture, 'Café');
    // Sem dígitos o campo fica vazio — ausência, não `R$ 0,00` como apoio (CD-15).
    expect(priceValue(fixture)).toBe('');

    submit(fixture);
    await flush();

    expect(store.createItem).toHaveBeenCalledWith({
      name: 'Café',
      plannedQuantity: null,
      unit: null,
      plannedPrice: null,
    });
    expect(saved()).toBe(1);
  });

  it('aceita a quantidade com vírgula e o preço na máscara, enviando números (RN-06/AC-27)', async () => {
    const fixture = mount('create');
    setName(fixture, 'Arroz');
    setQuantity(fixture, '1,5');
    selectUnit(fixture, 'kg');
    setPrice(fixture, '12,50');

    expect(priceValue(fixture)).toBe('R$ 12,50');

    submit(fixture);
    await flush();

    expect(store.createItem).toHaveBeenCalledWith({
      name: 'Arroz',
      plannedQuantity: 1.5,
      unit: 'kg',
      plannedPrice: 12.5,
    });
  });

  it('na criação, o 409 abre a pergunta de soma e confirmar reenvia a resolução (AC-07/CD-02)', async () => {
    store.createItem
      .mockResolvedValueOnce({ kind: 'duplicate', duplicateOf: { id: 'x', name: 'Café' } })
      .mockResolvedValueOnce({ kind: 'created' });

    const fixture = mount('create');
    const saved = savedCount(fixture);
    setName(fixture, 'cafe');
    setQuantity(fixture, '2');
    submit(fixture);
    await flush();
    fixture.detectChanges();

    expect(topSheetTitle(fixture)).toBe('Item já existe');
    expect(query(fixture, '.duplicate__text').textContent).toContain('Café');
    expect(saved()).toBe(0);

    buttonByText(fixture, 'Somar quantidade').click();
    await flush();
    fixture.detectChanges();

    expect(store.createItem).toHaveBeenCalledTimes(2);
    expect(store.createItem.mock.calls[1][0]).toEqual({
      name: 'cafe',
      plannedQuantity: 2,
      unit: null,
      plannedPrice: null,
      duplicateResolution: 'sum-planned-quantity',
    });
    expect(saved()).toBe(1);
  });

  it('na criação, recusar a soma não muda o digitado e não faz nova requisição (AC-07)', async () => {
    store.createItem.mockResolvedValueOnce({
      kind: 'duplicate',
      duplicateOf: { id: 'x', name: 'Café' },
    });

    const fixture = mount('create');
    setName(fixture, 'cafe');
    setQuantity(fixture, '2');
    submit(fixture);
    await flush();
    fixture.detectChanges();

    buttonByText(fixture, 'Não somar').click();
    fixture.detectChanges();

    expect(store.createItem).toHaveBeenCalledTimes(1);
    expect(query<HTMLInputElement>(fixture, '#item-name').value).toBe('cafe');
    expect(query<HTMLInputElement>(fixture, '#item-quantity').value).toBe('2');
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')).map((button) =>
      (button as HTMLButtonElement).textContent?.trim(),
    );
    expect(buttons).not.toContain('Somar quantidade');
  });

  it('na edição, o 409 é conflito no formulário: não aplica e não soma (AC-08/CD-13)', async () => {
    store.updateItem.mockResolvedValueOnce({
      kind: 'conflict',
      duplicateOf: { id: 'a', name: 'Café' },
    });

    const fixture = mount('edit', item({ id: 'b', name: 'Arroz' }));
    const saved = savedCount(fixture);
    setName(fixture, 'cafe');
    submit(fixture);
    await flush();
    fixture.detectChanges();

    expect(store.updateItem).toHaveBeenCalledTimes(1);
    expect(saved()).toBe(0);
    expect(query(fixture, '.item-form__conflict').textContent?.trim()).toBe(
      'Já existe um item com esse nome',
    );
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')).map((button) =>
      (button as HTMLButtonElement).textContent?.trim(),
    );
    expect(buttons).not.toContain('Somar quantidade');
  });

  it('renomear para o próprio nome normalizado aplica a edição (AC-08)', async () => {
    const fixture = mount('edit', item({ id: 'a', name: 'Café' }));
    const saved = savedCount(fixture);
    setName(fixture, 'cafe');
    submit(fixture);
    await flush();

    expect(store.updateItem).toHaveBeenCalledWith('a', {
      name: 'cafe',
      plannedQuantity: null,
      unit: null,
      plannedPrice: null,
    });
    expect(saved()).toBe(1);
  });

  it('prefill da edição na máscara e limpar os opcionais envia null (RN-03/AC-10)', async () => {
    const fixture = mount(
      'edit',
      item({ id: 'a', name: 'Arroz', plannedQuantity: 2, unit: 'kg', plannedPrice: 12.5 }),
    );

    expect(query<HTMLInputElement>(fixture, '#item-quantity').value).toBe('2');
    expect(query<HTMLSelectElement>(fixture, '#item-unit').value).toBe('kg');
    expect(priceValue(fixture)).toBe('R$ 12,50');

    setQuantity(fixture, '');
    setPrice(fixture, '');
    submit(fixture);
    await flush();

    expect(store.updateItem).toHaveBeenCalledWith('a', {
      name: 'Arroz',
      plannedQuantity: null,
      unit: 'kg',
      plannedPrice: null,
    });
  });

  it('mostra "Salvando…" e desabilita; toques repetidos geram uma única requisição (AC-26)', async () => {
    let resolveCreate: (outcome: CreateItemOutcome) => void = () => undefined;
    store.createItem.mockImplementation(
      () =>
        new Promise<CreateItemOutcome>((resolve) => {
          resolveCreate = resolve;
        }),
    );

    const fixture = mount('create');
    setName(fixture, 'Café');
    const form = query<HTMLFormElement>(fixture, 'form');
    form.dispatchEvent(new Event('submit'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(store.createItem).toHaveBeenCalledTimes(1);
    const saveButton = query<HTMLButtonElement>(fixture, 'button[type="submit"]');
    expect(saveButton.disabled).toBe(true);
    expect(saveButton.textContent).toContain('Salvando…');

    resolveCreate({ kind: 'created' });
    await flush();
  });

  it('falha de rede mantém o formulário aberto com o digitado (AC-23)', async () => {
    store.createItem.mockResolvedValueOnce({
      kind: 'error',
      message: 'Falha de rede. Verifique a conexão e tente novamente.',
    });

    const fixture = mount('create');
    const saved = savedCount(fixture);
    setName(fixture, 'Café');
    submit(fixture);
    await flush();
    fixture.detectChanges();

    expect(saved()).toBe(0);
    expect(query<HTMLInputElement>(fixture, '#item-name').value).toBe('Café');
    expect(query<HTMLFormElement>(fixture, 'form')).toBeTruthy();
  });
});

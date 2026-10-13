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

  it('valida quantidade > 0 e preço >= 0 sem enviar requisição (RN-06)', async () => {
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
    setPrice(fixture, '-1');
    submit(fixture);
    await flush();

    expect(store.createItem).not.toHaveBeenCalled();
    expect(query(fixture, '#item-price-error').textContent?.trim()).toBe(
      'O preço não pode ser negativo.',
    );
  });

  it('adiciona só com o nome, com os opcionais vazios (AC-04)', async () => {
    const fixture = mount('create');
    const saved = savedCount(fixture);
    setName(fixture, 'Café');
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

  it('aceita decimais com vírgula e envia número no payload (RN-06)', async () => {
    const fixture = mount('create');
    setName(fixture, 'Arroz');
    setQuantity(fixture, '1,5');
    selectUnit(fixture, 'kg');
    setPrice(fixture, '12,50');
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

  it('prefill da edição e limpar um opcional envia null (RN-03/AC-10)', async () => {
    const fixture = mount(
      'edit',
      item({ id: 'a', name: 'Arroz', plannedQuantity: 2, unit: 'kg', plannedPrice: 12.5 }),
    );

    expect(query<HTMLInputElement>(fixture, '#item-quantity').value).toBe('2');
    expect(query<HTMLSelectElement>(fixture, '#item-unit').value).toBe('kg');
    expect(query<HTMLInputElement>(fixture, '#item-price').value).toBe('12,5');

    setQuantity(fixture, '');
    submit(fixture);
    await flush();

    expect(store.updateItem).toHaveBeenCalledWith('a', {
      name: 'Arroz',
      plannedQuantity: null,
      unit: 'kg',
      plannedPrice: 12.5,
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

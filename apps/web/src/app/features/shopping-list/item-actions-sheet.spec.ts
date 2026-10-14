import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PurchasedDetails, ShoppingListItem } from '@lista/contracts';
import { ItemActionsSheet } from './item-actions-sheet';

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

function buttonByText(fixture: ComponentFixture<unknown>, text: string): HTMLButtonElement {
  const buttons = Array.from(
    fixture.nativeElement.querySelectorAll('button'),
  ) as HTMLButtonElement[];
  const button = buttons.find((candidate) => candidate.textContent?.trim() === text);
  if (!button) throw new Error(`Botão não encontrado: ${text}`);
  return button;
}

describe('ItemActionsSheet', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  function mount(target: ShoppingListItem): ComponentFixture<ItemActionsSheet> {
    const fixture = TestBed.createComponent(ItemActionsSheet);
    fixture.componentRef.setInput('item', target);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    return fixture;
  }

  function track<T>(source: { subscribe: (fn: () => void) => T }): () => number {
    let count = 0;
    source.subscribe(() => {
      count += 1;
    });
    return () => count;
  }

  it('concentra as três ações fora da linha, com o item como contexto (guia §5)', () => {
    const fixture = mount(item({ name: 'Café' }));

    expect(fixture.nativeElement.querySelector('.bottom-sheet__title').textContent?.trim()).toBe(
      'Ações do item',
    );
    expect(fixture.nativeElement.querySelector('.actions-sheet__item').textContent?.trim()).toBe(
      'Café',
    );
    expect(buttonByText(fixture, 'Marcar como comprado')).toBeDefined();
    expect(buttonByText(fixture, 'Editar')).toBeDefined();
    expect(buttonByText(fixture, 'Excluir')).toBeDefined();
  });

  it('item pendente oferece marcar como comprado, com a ação de destaque (AC-12)', () => {
    const fixture = mount(item());
    const toggle = buttonByText(fixture, 'Marcar como comprado');

    expect(toggle.classList.contains('actions-sheet__action--primary')).toBe(true);
    expect(buttonByText(fixture, 'Excluir').classList.contains('actions-sheet__action--danger')).toBe(
      true,
    );
    expect(fixture.nativeElement.querySelectorAll('.actions-sheet__action--primary')).toHaveLength(1);
  });

  it('item comprado continua editável e excluível, e a ação vira desmarcar (AC-17)', () => {
    const fixture = mount(item({ purchased: PURCHASED }));
    const toggle = buttonByText(fixture, 'Desmarcar como comprado');

    expect(toggle.classList.contains('actions-sheet__action--danger')).toBe(true);
    expect(buttonByText(fixture, 'Editar')).toBeDefined();
    expect(buttonByText(fixture, 'Excluir')).toBeDefined();
  });

  it('emite a intenção de cada ação sem mudar estado por conta própria', () => {
    const fixture = mount(item());
    const toggled = track(fixture.componentInstance.togglePurchased);
    const edited = track(fixture.componentInstance.edit);
    const removed = track(fixture.componentInstance.remove);

    buttonByText(fixture, 'Marcar como comprado').click();
    buttonByText(fixture, 'Editar').click();
    buttonByText(fixture, 'Excluir').click();

    expect(toggled()).toBe(1);
    expect(edited()).toBe(1);
    expect(removed()).toBe(1);
  });

  it('fecha pelo botão visível do sheet (guia §5)', () => {
    const fixture = mount(item());
    const closed = track(fixture.componentInstance.closed);

    (fixture.nativeElement.querySelector('.bottom-sheet__close') as HTMLButtonElement).click();

    expect(closed()).toBe(1);
  });

  it('todas as ações têm alvo ≥44px (AC-25)', () => {
    const fixture = mount(item());
    const actions = Array.from(
      fixture.nativeElement.querySelectorAll('.actions-sheet__action'),
    ) as HTMLElement[];

    expect(actions).toHaveLength(3);
    for (const action of actions) {
      // O jsdom devolve o valor declarado (não resolve `var()`): é o token de 44px.
      expect(getComputedStyle(action).minHeight).toBe('var(--touch-target-min)');
    }
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ShoppingListItem } from '@lista/contracts';
import { ItemRow } from './item-row';

const PURCHASED = {
  quantity: 2,
  unit: 'pacote',
  unitPrice: 12.5,
  purchasedAt: '2026-10-13T11:00:00.000Z',
} as const;

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

function mount(value: ShoppingListItem): ComponentFixture<ItemRow> {
  const fixture = TestBed.createComponent(ItemRow);
  fixture.componentRef.setInput('item', value);
  fixture.detectChanges();
  return fixture;
}

function text(fixture: ComponentFixture<ItemRow>, selector: string): string {
  return fixture.nativeElement.querySelector(selector)?.textContent?.trim() ?? '';
}

describe('ItemRow', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('mostra nome e metadados planejados do item pendente (AC-04/AC-10)', () => {
    const fixture = mount(
      item({ name: 'Café', plannedQuantity: 1.5, unit: 'kg', plannedPrice: 5 }),
    );

    expect(text(fixture, '.item-row__name')).toBe('Café');
    expect(text(fixture, '.item-row__meta')).toBe('1,5 kg · R$ 5,00');
    expect(text(fixture, '.item-row__toggle')).toBe('');
  });

  it('não inventa metadados quando os opcionais estão vazios (RN-03)', () => {
    const fixture = mount(item({ name: 'Cebola' }));

    expect(text(fixture, '.item-row__name')).toBe('Cebola');
    expect(fixture.nativeElement.querySelector('.item-row__meta')).toBeNull();
  });

  it('expõe o alvo de marcar e as ações do item com nome acessível (guia §5)', () => {
    const fixture = mount(item({ name: 'Café' }));

    const toggle = fixture.nativeElement.querySelector(
      '.item-row__toggle',
    ) as HTMLButtonElement;
    const actions = fixture.nativeElement.querySelector(
      '.item-row__actions',
    ) as HTMLButtonElement;

    expect(toggle.getAttribute('aria-label')).toBe('Marcar Café como comprado');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(actions.getAttribute('aria-label')).toBe('Ações de Café');
    // Ícones são decorativos: o nome acessível é do botão.
    expect(toggle.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('mantém o alvo de marcar ≥44px em ambos os estados (AC-12/AC-25)', () => {
    const pending = mount(item({ name: 'Café' }));
    const purchased = mount(item({ name: 'Arroz', purchased: { ...PURCHASED } }));

    for (const fixture of [pending, purchased]) {
      const target = fixture.nativeElement.querySelector('.item-row__toggle') as HTMLElement;
      const style = getComputedStyle(target);
      // O jsdom devolve o valor declarado (não resolve `var()`): é o token de
      // 44px do design system (`--touch-target-min`, guia §2).
      expect(style.height).toBe('var(--touch-target-min)');
      expect(style.width).toBe('var(--touch-target-min)');
    }
  });

  it('emite o item ao tocar no alvo de marcar (wiring da tela)', () => {
    const fixture = mount(item({ id: 'item-7', name: 'Café' }));
    const emitted: ShoppingListItem[] = [];
    fixture.componentInstance.togglePurchased.subscribe((value) => emitted.push(value));

    (fixture.nativeElement.querySelector('.item-row__toggle') as HTMLButtonElement).click();

    expect(emitted.map((value) => value.id)).toEqual(['item-7']);
  });

  it('emite o item ao abrir as ações secundárias (wiring da tela)', () => {
    const fixture = mount(item({ id: 'item-9', name: 'Café' }));
    const emitted: ShoppingListItem[] = [];
    fixture.componentInstance.openActions.subscribe((value) => emitted.push(value));

    (fixture.nativeElement.querySelector('.item-row__actions') as HTMLButtonElement).click();

    expect(emitted.map((value) => value.id)).toEqual(['item-9']);
  });

  it('comprado fica riscado e atenuado, com os dados da compra (AC-12)', () => {
    const fixture = mount(
      item({ name: 'Arroz', plannedQuantity: 1, unit: 'kg', purchased: { ...PURCHASED } }),
    );

    const name = fixture.nativeElement.querySelector('.item-row__name') as HTMLElement;
    const toggle = fixture.nativeElement.querySelector('.item-row__toggle') as HTMLElement;

    expect(name.textContent?.trim()).toBe('Arroz');
    expect(name.classList.contains('item-row__name--purchased')).toBe(true);
    expect(getComputedStyle(name).textDecoration).toContain('line-through');
    expect(getComputedStyle(name).color).toBe('var(--color-ink-faint)');
    // Comprado mostra a compra, não o planejado.
    expect(text(fixture, '.item-row__meta')).toBe('2 pacote · R$ 12,50');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Desmarcar Arroz');
    expect(toggle.classList.contains('item-row__toggle--checked')).toBe(true);
  });
});

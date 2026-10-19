import { describe, expect, it } from 'vitest';
import { planPurchaseCompletion } from './purchase-completion';
import { createShoppingListItem } from './shopping-list-item';
import type { ShoppingListItem } from './shopping-list-item';

const NOW = new Date('2026-10-16T15:00:00.000Z');
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function item(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  const name = overrides.name ?? 'Café';
  const base = createShoppingListItem({
    id: overrides.id ?? 'item-1',
    name,
    plannedQuantity: overrides.plannedQuantity ?? null,
    unit: overrides.unit ?? null,
    plannedPrice: overrides.plannedPrice ?? null,
    createdAt: overrides.createdAt ?? NOW,
  });
  return { ...base, ...overrides, name };
}

describe('planPurchaseCompletion (price-history RN-03/RN-09; AC-04/AC-05/AC-07)', () => {
  it('0 comprados: sem payload e sem exigir mercado/data (AC-07/RN-09)', () => {
    const plan = planPurchaseCompletion(
      [item({ id: 'pendente-a' }), item({ id: 'pendente-b' })],
      { market: '', purchaseDate: '2099-01-01' },
      NOW,
    );

    expect(plan).toEqual({ kind: 'no-purchased-items' });
  });

  it('≥1 comprado com mercado só espaços ou data futura: invalid, sem payload (AC-04)', () => {
    const pending = item({ id: 'pendente' });
    const bought = item({
      id: 'comprado',
      purchased: { quantity: 2, unit: 'kg', unitPrice: 9.9, purchasedAt: NOW },
    });
    const items = [pending, bought];

    expect(
      planPurchaseCompletion(
        items,
        { market: '   ', purchaseDate: '2026-10-16' },
        NOW,
      ),
    ).toEqual({ kind: 'invalid', error: 'market-required' });
    expect(
      planPurchaseCompletion(
        items,
        { market: 'Mercado Central', purchaseDate: '2026-10-17' },
        NOW,
      ),
    ).toEqual({ kind: 'invalid', error: 'purchase-date-future' });
    // Recusa é pura: nada sai da lista nem vira payload.
    expect(items.map((current) => current.id)).toEqual(['pendente', 'comprado']);
    expect(bought.purchased).not.toBeNull();
  });

  it('válido: completionId UUID + payload só com os comprados (AC-05/AC-16)', () => {
    const items = [
      item({ id: 'pendente', name: 'Arroz' }),
      item({
        id: 'c1',
        name: 'Café Gourmet',
        purchased: { quantity: 2.5, unit: 'kg', unitPrice: 9.9, purchasedAt: NOW },
      }),
      item({
        id: 'c2',
        name: 'Leite',
        purchased: { quantity: 1, unit: 'L', unitPrice: 5.5, purchasedAt: NOW },
      }),
    ];

    const plan = planPurchaseCompletion(
      items,
      { market: '  Mercado Central  ', purchaseDate: '2026-10-15' },
      NOW,
    );

    expect(plan.kind).toBe('ready');
    if (plan.kind !== 'ready') {
      return;
    }
    expect(plan.completionId).toMatch(UUID_V4);
    expect(plan.payload).toEqual({
      completionId: plan.completionId,
      market: 'Mercado Central',
      purchaseDate: '2026-10-15',
      items: [
        // `name` como digitado (sem normalizar — consumidor agrega depois).
        { name: 'Café Gourmet', quantity: 2.5, unit: 'kg', unitPrice: 9.9 },
        { name: 'Leite', quantity: 1, unit: 'L', unitPrice: 5.5 },
      ],
    });
  });

  it('gera completionId distinto a cada conclusão (chave de idempotência — AC-16)', () => {
    const bought = item({
      id: 'comprado',
      purchased: { quantity: 1, unit: 'unidade', unitPrice: 3, purchasedAt: NOW },
    });
    const input = { market: 'Mercado Central', purchaseDate: '2026-10-16' };

    const first = planPurchaseCompletion([bought], input, NOW);
    const second = planPurchaseCompletion([bought], input, NOW);

    expect(first.kind).toBe('ready');
    expect(second.kind).toBe('ready');
    if (first.kind !== 'ready' || second.kind !== 'ready') {
      return;
    }
    expect(first.completionId).not.toBe(second.completionId);
    expect(first.payload.completionId).toBe(first.completionId);
    expect(second.payload.completionId).toBe(second.completionId);
  });
});

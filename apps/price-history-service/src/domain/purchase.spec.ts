import { describe, expect, it } from 'vitest';
import type { ItemUnit } from '@lista/contracts';
import { createPriceHistoryPurchase } from './purchase';

const COMPLETION_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function payloadItem(
  name: string,
  unitPrice: number,
  unit: ItemUnit = 'unidade',
) {
  return { name, quantity: 2, unit, unitPrice };
}

describe('createPriceHistoryPurchase (RN-05/RN-06)', () => {
  it('monta a compra com id, mercado aparado e datas repassadas', () => {
    const purchase = createPriceHistoryPurchase({
      payload: {
        completionId: COMPLETION_ID,
        market: '  Padaria Central  ',
        purchaseDate: '2026-10-10',
        items: [payloadItem('Café', 19.9)],
      },
      createdAt: '2026-10-10T12:00:00.000Z',
    });

    expect(purchase.id).toBe(COMPLETION_ID);
    expect(purchase.market).toBe('Padaria Central');
    expect(purchase.purchaseDate).toBe('2026-10-10');
    expect(purchase.createdAt).toBe('2026-10-10T12:00:00.000Z');
    expect(purchase.items).toHaveLength(1);
  });

  it('deriva nameNormalized por item mantendo o nome como digitado (trim)', () => {
    const purchase = createPriceHistoryPurchase({
      payload: {
        completionId: COMPLETION_ID,
        market: 'Mercado Sul',
        purchaseDate: '2026-10-10',
        items: [payloadItem('  Arroz  integral ', 8.5, 'kg')],
      },
      createdAt: '2026-10-10T12:00:00.000Z',
    });

    const [item] = purchase.items;
    expect(item.name).toBe('Arroz  integral');
    expect(item.nameNormalized).toBe('arroz  integral');
    expect(item.quantity).toBe(2);
    expect(item.unit).toBe('kg');
    expect(item.unitPrice).toBe(8.5);
  });

  it('normaliza acentos e maiúsculas na chave (café → cafe)', () => {
    const purchase = createPriceHistoryPurchase({
      payload: {
        completionId: COMPLETION_ID,
        market: 'Mercado Sul',
        purchaseDate: '2026-10-10',
        items: [payloadItem('CAFE', 10)],
      },
      createdAt: '2026-10-10T12:00:00.000Z',
    });

    expect(purchase.items[0].nameNormalized).toBe('cafe');
  });
});

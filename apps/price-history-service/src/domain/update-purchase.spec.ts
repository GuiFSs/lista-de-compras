import { describe, expect, it } from 'vitest';
import { aggregateLowestPricesByItem } from './lowest-price-by-item';
import { aggregateLowestPrices, groupByMarket } from './lowest-prices';
import {
  createPriceHistoryPurchase,
  type PriceHistoryPurchase,
} from './purchase';
import { parsePurchaseUpdate, purchaseFromUpdate } from './update-purchase';

const NOW = new Date('2026-11-07T15:00:00.000Z');

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

function purchase(
  items: readonly { name: string; unitPrice: number; quantity?: number; unit?: 'kg' | 'unidade' }[],
  options: { id: string; purchaseDate: string; market: string },
): PriceHistoryPurchase {
  return createPriceHistoryPurchase({
    payload: {
      completionId: options.id,
      market: options.market,
      purchaseDate: options.purchaseDate,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity ?? 1,
        unit: item.unit ?? 'unidade',
        unitPrice: item.unitPrice,
      })),
    },
    createdAt: `${options.purchaseDate}T12:00:00.000Z`,
  });
}

function edited(
  current: PriceHistoryPurchase,
  body: {
    market?: string;
    purchaseDate?: string;
    items: PriceHistoryPurchase['items'];
  },
): PriceHistoryPurchase {
  const parsed = parsePurchaseUpdate(
    {
      market: body.market ?? current.market,
      purchaseDate: body.purchaseDate ?? current.purchaseDate,
      items: body.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
      })),
    },
    NOW,
  );
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return purchaseFromUpdate(current, parsed.update);
}

describe('parsePurchaseUpdate', () => {
  const current = purchase([{ name: 'Café', unitPrice: 8 }], {
    id: uuid(1),
    purchaseDate: '2026-10-01',
    market: 'Feira',
  });

  it('aceita preço zero, apara mercado e nome e preserva id e createdAt', () => {
    const parsed = parsePurchaseUpdate(
      {
        market: '  Mercado Sul  ',
        purchaseDate: '2026-11-07',
        items: [{ name: '  Café  ', quantity: 2, unit: 'kg', unitPrice: 0 }],
      },
      NOW,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const next = purchaseFromUpdate(current, parsed.update);
    expect(next.id).toBe(current.id);
    expect(next.createdAt).toBe(current.createdAt);
    expect(next.market).toBe('Mercado Sul');
    expect(next.purchaseDate).toBe('2026-11-07');
    expect(next.items).toEqual([
      {
        name: 'Café',
        nameNormalized: 'cafe',
        quantity: 2,
        unit: 'kg',
        unitPrice: 0,
      },
    ]);
  });

  it('recusa mercado vazio, data futura, lista vazia e nome repetido na compra', () => {
    expect(
      parsePurchaseUpdate(
        { market: '   ', purchaseDate: '2026-10-01', items: [{ name: 'Café', quantity: 1, unit: 'kg', unitPrice: 1 }] },
        NOW,
      ),
    ).toEqual({ ok: false, error: 'market-required' });
    expect(
      parsePurchaseUpdate(
        { market: 'Feira', purchaseDate: '2026-11-08', items: [{ name: 'Café', quantity: 1, unit: 'kg', unitPrice: 1 }] },
        NOW,
      ),
    ).toEqual({ ok: false, error: 'purchase-date-future' });
    expect(
      parsePurchaseUpdate({ market: 'Feira', purchaseDate: '2026-10-01', items: [] }, NOW),
    ).toEqual({ ok: false, error: 'items-empty' });
    expect(
      parsePurchaseUpdate(
        {
          market: 'Feira',
          purchaseDate: '2026-10-01',
          items: [
            { name: 'Café', quantity: 1, unit: 'kg', unitPrice: 8 },
            { name: 'cafe', quantity: 1, unit: 'unidade', unitPrice: 9 },
          ],
        },
        NOW,
      ),
    ).toEqual({ ok: false, error: 'duplicate-item-name' });
  });
});

describe('menor preço depois da edição', () => {
  const cheaper = purchase([{ name: 'Arroz', unitPrice: 8, quantity: 2, unit: 'kg' }], {
    id: uuid(1),
    purchaseDate: '2026-10-01',
    market: 'Atacadão',
  });
  const other = purchase([{ name: 'Arroz', unitPrice: 10, quantity: 1, unit: 'kg' }], {
    id: uuid(2),
    purchaseDate: '2026-10-10',
    market: 'Feira',
  });

  it('preço que passa a ser o menor leva mercado, data, quantidade e unidade desta compra', () => {
    const lowered = edited(other, {
      items: [{ name: 'Arroz', nameNormalized: 'arroz', quantity: 3, unit: 'kg', unitPrice: 6 }],
    });
    const prices = aggregateLowestPrices([cheaper, lowered]);
    expect(prices).toEqual([
      {
        name: 'Arroz',
        nameNormalized: 'arroz',
        lowestUnitPrice: 6,
        market: 'Feira',
        purchaseDate: '2026-10-10',
        quantity: 3,
        unit: 'kg',
      },
    ]);
    expect(groupByMarket(prices).map((group) => group.market)).toEqual(['Feira']);
    expect(aggregateLowestPricesByItem([cheaper, lowered], 'arroz').markets).toEqual([
      {
        market: 'Atacadão',
        lowestUnitPrice: 8,
        purchaseDate: '2026-10-01',
        quantity: 2,
        unit: 'kg',
      },
      {
        market: 'Feira',
        lowestUnitPrice: 6,
        purchaseDate: '2026-10-10',
        quantity: 3,
        unit: 'kg',
      },
    ]);
  });

  it('subir o preço vencedor faz a outra compra assumir', () => {
    const raised = edited(cheaper, {
      items: [{ name: 'Arroz', nameNormalized: 'arroz', quantity: 2, unit: 'kg', unitPrice: 12 }],
    });
    expect(aggregateLowestPrices([raised, other])).toMatchObject([
      { nameNormalized: 'arroz', lowestUnitPrice: 10, market: 'Feira' },
    ]);
  });

  it('remover a linha vencedora, restando outra compra do nome, troca o vencedor', () => {
    const withTwo = purchase(
      [
        { name: 'Arroz', unitPrice: 8, quantity: 2, unit: 'kg' },
        { name: 'Feijão', unitPrice: 4, quantity: 1 },
      ],
      { id: uuid(1), purchaseDate: '2026-10-01', market: 'Atacadão' },
    );
    const withoutRice = edited(withTwo, {
      items: [{ name: 'Feijão', nameNormalized: 'feijao', quantity: 1, unit: 'unidade', unitPrice: 4 }],
    });
    const prices = aggregateLowestPrices([withoutRice, other]);
    expect(prices.find((item) => item.nameNormalized === 'arroz')).toMatchObject({
      lowestUnitPrice: 10,
      market: 'Feira',
    });
    expect(prices.find((item) => item.nameNormalized === 'feijao')).toMatchObject({
      lowestUnitPrice: 4,
      market: 'Atacadão',
    });
  });

  it('renomear tira o nome antigo da agregação quando não resta outro registro e inclui o nome novo', () => {
    const only = purchase([{ name: 'Arroz', unitPrice: 8, quantity: 2, unit: 'kg' }], {
      id: uuid(1),
      purchaseDate: '2026-10-01',
      market: 'Atacadão',
    });
    const renamed = edited(only, {
      items: [{ name: 'Feijão', nameNormalized: 'feijao', quantity: 2, unit: 'kg', unitPrice: 8 }],
    });
    const prices = aggregateLowestPrices([renamed]);
    expect(prices.map((item) => item.nameNormalized)).toEqual(['feijao']);
    expect(aggregateLowestPricesByItem([renamed], 'arroz').markets).toEqual([]);
  });

  it('linha nova entra na agregação do nome dela', () => {
    const added = edited(cheaper, {
      items: [
        { name: 'Arroz', nameNormalized: 'arroz', quantity: 2, unit: 'kg', unitPrice: 8 },
        { name: 'Leite', nameNormalized: 'leite', quantity: 1, unit: 'unidade', unitPrice: 4.5 },
      ],
    });
    expect(aggregateLowestPrices([added, other]).map((item) => item.nameNormalized).sort()).toEqual([
      'arroz',
      'leite',
    ]);
  });

  it('mudar só a quantidade de quem não vence deixa o vencedor igual', () => {
    const before = aggregateLowestPrices([cheaper, other]);
    const tweaked = edited(other, {
      items: [{ name: 'Arroz', nameNormalized: 'arroz', quantity: 9, unit: 'kg', unitPrice: 10 }],
    });
    expect(aggregateLowestPrices([cheaper, tweaked])).toEqual(before);
  });
});

import { describe, expect, it } from 'vitest';
import type { ItemUnit } from '@lista/contracts';
import { aggregateLowestPricesByItem } from './lowest-price-by-item';
import {
  createPriceHistoryPurchase,
  type PriceHistoryPurchase,
} from './purchase';

interface ItemFixture {
  name: string;
  unitPrice: number;
  unit?: ItemUnit;
  quantity?: number;
}

function purchase(
  items: readonly ItemFixture[],
  options: {
    id: string;
    purchaseDate: string;
    market: string;
  },
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

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

describe('aggregateLowestPricesByItem (RN-06; AC-06, AC-07, AC-08)', () => {
  it('devolve uma linha por mercado em A→Z, ignorando caixa e acentos (AC-06)', () => {
    const result = aggregateLowestPricesByItem(
      [
        purchase([{ name: 'Café', unitPrice: 9, quantity: 2, unit: 'kg' }], {
          id: uuid(1),
          purchaseDate: '2026-09-01',
          market: 'zaffari',
        }),
        purchase([{ name: 'CAFE', unitPrice: 7, quantity: 3 }], {
          id: uuid(2),
          purchaseDate: '2026-10-01',
          market: 'Atacadão',
        }),
        purchase([{ name: 'café', unitPrice: 8, quantity: 1 }], {
          id: uuid(3),
          purchaseDate: '2026-08-01',
          market: 'mercado',
        }),
      ],
      'cafe',
    );

    expect(result.markets.map((line) => line.market)).toEqual([
      'Atacadão',
      'mercado',
      'zaffari',
    ]);
  });

  it('desempata mercados pelo texto cru quando a normalização empata (AC-06)', () => {
    const result = aggregateLowestPricesByItem(
      [
        purchase([{ name: 'Café', unitPrice: 9 }], {
          id: uuid(1),
          purchaseDate: '2026-09-01',
          market: 'mercado',
        }),
        purchase([{ name: 'Café', unitPrice: 8 }], {
          id: uuid(2),
          purchaseDate: '2026-10-01',
          market: 'Mercado',
        }),
      ],
      'cafe',
    );

    expect(result.markets.map((line) => line.market)).toEqual([
      'Mercado',
      'mercado',
    ]);
  });

  it('duas compras no mesmo mercado: vale a de menor preço, com a data e a quantidade dela (AC-07)', () => {
    const result = aggregateLowestPricesByItem(
      [
        purchase([{ name: 'Café', unitPrice: 9, quantity: 2 }], {
          id: uuid(1),
          purchaseDate: '2026-09-01',
          market: 'Zaffari',
        }),
        purchase([{ name: 'Café', unitPrice: 6, quantity: 3, unit: 'kg' }], {
          id: uuid(2),
          purchaseDate: '2026-10-01',
          market: 'Zaffari',
        }),
      ],
      'cafe',
    );

    expect(result.markets).toEqual([
      {
        market: 'Zaffari',
        lowestUnitPrice: 6,
        purchaseDate: '2026-10-01',
        quantity: 3,
        unit: 'kg',
      },
    ]);
  });

  it('aplica a cadeia completa dentro do mercado: empate → mais recente → menor id', () => {
    const result = aggregateLowestPricesByItem(
      [
        purchase([{ name: 'Café', unitPrice: 8, quantity: 1 }], {
          id: uuid(2),
          purchaseDate: '2026-09-01',
          market: 'Atacadão',
        }),
        purchase([{ name: 'Café', unitPrice: 8, quantity: 4 }], {
          id: uuid(9),
          purchaseDate: '2026-10-01',
          market: 'Atacadão',
        }),
        purchase([{ name: 'Café', unitPrice: 8, quantity: 5 }], {
          id: uuid(3),
          purchaseDate: '2026-10-01',
          market: 'Atacadão',
        }),
      ],
      'cafe',
    );

    expect(result.markets[0]).toMatchObject({ quantity: 5 });
  });

  it('item em um único mercado gera uma única linha (AC-08)', () => {
    const result = aggregateLowestPricesByItem(
      [
        purchase(
          [{ name: 'Batata', unitPrice: 4.5, quantity: 2, unit: 'kg' }],
          {
            id: uuid(1),
            purchaseDate: '2026-10-01',
            market: 'Zaffari',
          },
        ),
      ],
      'batata',
    );

    expect(result.markets).toEqual([
      {
        market: 'Zaffari',
        lowestUnitPrice: 4.5,
        purchaseDate: '2026-10-01',
        quantity: 2,
        unit: 'kg',
      },
    ]);
  });

  it('item sem histórico devolve markets vazio (o 404 é da borda — RN-08)', () => {
    const result = aggregateLowestPricesByItem(
      [
        purchase([{ name: 'Café', unitPrice: 8 }], {
          id: uuid(1),
          purchaseDate: '2026-10-01',
          market: 'Atacadão',
        }),
      ],
      'batata',
    );

    expect(result).toEqual({ name: '', nameNormalized: 'batata', markets: [] });
  });

  it('usa o nome de exibição do item vencedor entre todos os mercados (CD-07)', () => {
    const result = aggregateLowestPricesByItem(
      [
        purchase([{ name: 'café', unitPrice: 9.5 }], {
          id: uuid(1),
          purchaseDate: '2026-10-01',
          market: 'Zaffari',
        }),
        purchase([{ name: 'CAFÉ', unitPrice: 7 }], {
          id: uuid(2),
          purchaseDate: '2026-10-01',
          market: 'Atacadão',
        }),
      ],
      'cafe',
    );

    expect(result.name).toBe('CAFÉ');
    expect(result.nameNormalized).toBe('cafe');
  });

  it('cada linha carrega os dados da compra vencedora do próprio mercado', () => {
    const result = aggregateLowestPricesByItem(
      [
        purchase([{ name: 'Café', unitPrice: 9, quantity: 2 }], {
          id: uuid(1),
          purchaseDate: '2026-09-01',
          market: 'Zaffari',
        }),
        purchase([{ name: 'Café', unitPrice: 7, quantity: 3, unit: 'kg' }], {
          id: uuid(2),
          purchaseDate: '2026-10-01',
          market: 'Atacadão',
        }),
        purchase([{ name: 'Arroz', unitPrice: 5 }], {
          id: uuid(3),
          purchaseDate: '2026-10-05',
          market: 'Zaffari',
        }),
      ],
      'cafe',
    );

    const byMarket = new Map(result.markets.map((line) => [line.market, line]));

    expect(byMarket.get('Zaffari')).toEqual({
      market: 'Zaffari',
      lowestUnitPrice: 9,
      purchaseDate: '2026-09-01',
      quantity: 2,
      unit: 'unidade',
    });
    expect(byMarket.get('Atacadão')).toEqual({
      market: 'Atacadão',
      lowestUnitPrice: 7,
      purchaseDate: '2026-10-01',
      quantity: 3,
      unit: 'kg',
    });
  });
});

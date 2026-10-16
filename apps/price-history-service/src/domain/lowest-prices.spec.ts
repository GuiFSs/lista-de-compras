import { describe, expect, it } from 'vitest';
import type { ItemUnit } from '@lista/contracts';
import { aggregateLowestPrices } from './lowest-prices';
import { createPriceHistoryPurchase } from './purchase';

interface ItemFixture {
  name: string;
  unitPrice: number;
  unit?: ItemUnit;
  quantity?: number;
}

function purchase(
  items: readonly ItemFixture[],
  options: { id: string; purchaseDate: string },
) {
  return createPriceHistoryPurchase({
    payload: {
      completionId: options.id,
      market: 'Mercado Central',
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

describe('aggregateLowestPrices (RN-06/RN-07a; AC-08, AC-10)', () => {
  it('expõe o menor preço por unidade, sem média nem último preço (AC-10)', () => {
    const prices = aggregateLowestPrices([
      purchase([{ name: 'Café', unitPrice: 10 }], {
        id: uuid(1),
        purchaseDate: '2026-09-01',
      }),
      purchase([{ name: 'Café', unitPrice: 7.5 }], {
        id: uuid(2),
        purchaseDate: '2026-10-01',
      }),
    ]);

    expect(prices).toEqual([
      { name: 'Café', nameNormalized: 'cafe', lowestUnitPrice: 7.5 },
    ]);
  });

  it('ordem de chegada não importa para o menor preço', () => {
    const prices = aggregateLowestPrices([
      purchase([{ name: 'Café', unitPrice: 7.5 }], {
        id: uuid(1),
        purchaseDate: '2026-10-01',
      }),
      purchase([{ name: 'Café', unitPrice: 10 }], {
        id: uuid(2),
        purchaseDate: '2026-09-01',
      }),
    ]);

    expect(prices).toEqual([
      { name: 'Café', nameNormalized: 'cafe', lowestUnitPrice: 7.5 },
    ]);
  });

  it('une registros com acento e maiúsculas em um único item (AC-08)', () => {
    const prices = aggregateLowestPrices([
      purchase([{ name: 'café', unitPrice: 12 }], {
        id: uuid(1),
        purchaseDate: '2026-09-01',
      }),
      purchase([{ name: 'CAFE', unitPrice: 9 }], {
        id: uuid(2),
        purchaseDate: '2026-10-01',
      }),
      purchase([{ name: ' Café ', unitPrice: 11 }], {
        id: uuid(3),
        purchaseDate: '2026-11-01',
      }),
    ]);

    expect(prices).toEqual([
      { name: 'CAFE', nameNormalized: 'cafe', lowestUnitPrice: 9 },
    ]);
  });

  it('mantém sinônimos como itens distintos (cebola ≠ cebola branca)', () => {
    const prices = aggregateLowestPrices([
      purchase(
        [
          { name: 'cebola', unitPrice: 5 },
          { name: 'Cebola Branca', unitPrice: 6 },
        ],
        { id: uuid(1), purchaseDate: '2026-10-01' },
      ),
    ]);

    expect(prices).toEqual([
      { name: 'cebola', nameNormalized: 'cebola', lowestUnitPrice: 5 },
      {
        name: 'Cebola Branca',
        nameNormalized: 'cebola branca',
        lowestUnitPrice: 6,
      },
    ]);
  });

  it('empate de preço exibe o nome do item da compra mais recente', () => {
    // Mesmo grupo (cafe), mesmo preço: o nome exibido vem do registro mais novo.
    const prices = aggregateLowestPrices([
      purchase([{ name: 'café', unitPrice: 8 }], {
        id: uuid(1),
        purchaseDate: '2026-09-01',
      }),
      purchase([{ name: 'Cafe', unitPrice: 8 }], {
        id: uuid(2),
        purchaseDate: '2026-10-01',
      }),
    ]);

    expect(prices).toEqual([
      { name: 'Cafe', nameNormalized: 'cafe', lowestUnitPrice: 8 },
    ]);
  });

  it('ordena por nameNormalized asc para a lista ser estável', () => {
    const prices = aggregateLowestPrices([
      purchase(
        [
          { name: 'Café', unitPrice: 10 },
          { name: 'Arroz', unitPrice: 8 },
        ],
        { id: uuid(1), purchaseDate: '2026-10-01' },
      ),
    ]);

    expect(prices.map((item) => item.nameNormalized)).toEqual([
      'arroz',
      'cafe',
    ]);
  });

  it('sem histórico devolve lista vazia', () => {
    expect(aggregateLowestPrices([])).toEqual([]);
  });
});

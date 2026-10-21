import { describe, expect, it } from 'vitest';
import type { ItemUnit, LowestPriceItem } from '@lista/contracts';
import { aggregateLowestPrices, groupByMarket } from './lowest-prices';
import { normalizeItemName } from './item-name';
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
    market?: string;
    createdAt?: string;
  },
): PriceHistoryPurchase {
  return createPriceHistoryPurchase({
    payload: {
      completionId: options.id,
      market: options.market ?? 'Mercado Central',
      purchaseDate: options.purchaseDate,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity ?? 1,
        unit: item.unit ?? 'unidade',
        unitPrice: item.unitPrice,
      })),
    },
    createdAt: options.createdAt ?? `${options.purchaseDate}T12:00:00.000Z`,
  });
}

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

function lowestPriceItem(name: string, market: string): LowestPriceItem {
  return {
    name,
    nameNormalized: normalizeItemName(name),
    lowestUnitPrice: 5,
    market,
    purchaseDate: '2026-10-01',
    quantity: 1,
    unit: 'unidade',
  };
}

describe('aggregateLowestPrices (RN-02/RN-03/RN-04; AC-01, AC-03, AC-04)', () => {
  it('expõe o menor preço por unidade com os dados da compra vencedora (AC-03)', () => {
    const prices = aggregateLowestPrices([
      purchase([{ name: 'Café', unitPrice: 10, quantity: 2, unit: 'kg' }], {
        id: uuid(1),
        purchaseDate: '2026-09-01',
        market: 'Zaffari',
      }),
      purchase([{ name: 'Café', unitPrice: 7.5, quantity: 3 }], {
        id: uuid(2),
        purchaseDate: '2026-10-01',
        market: 'Atacadão',
      }),
    ]);

    expect(prices).toEqual([
      {
        name: 'Café',
        nameNormalized: 'cafe',
        lowestUnitPrice: 7.5,
        market: 'Atacadão',
        purchaseDate: '2026-10-01',
        quantity: 3,
        unit: 'unidade',
      },
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
      {
        name: 'Café',
        nameNormalized: 'cafe',
        lowestUnitPrice: 7.5,
        market: 'Mercado Central',
        purchaseDate: '2026-10-01',
        quantity: 1,
        unit: 'unidade',
      },
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
      {
        name: 'CAFE',
        nameNormalized: 'cafe',
        lowestUnitPrice: 9,
        market: 'Mercado Central',
        purchaseDate: '2026-10-01',
        quantity: 1,
        unit: 'unidade',
      },
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

    expect(prices.map((item) => item.nameNormalized)).toEqual([
      'cebola',
      'cebola branca',
    ]);
  });

  it('empate de preço credita a compra mais recente (RN-04/AC-04)', () => {
    const prices = aggregateLowestPrices([
      purchase([{ name: 'Café', unitPrice: 8, quantity: 1 }], {
        id: uuid(1),
        purchaseDate: '2026-09-01',
        market: 'Zaffari',
      }),
      purchase([{ name: 'Café', unitPrice: 8, quantity: 4, unit: 'kg' }], {
        id: uuid(2),
        purchaseDate: '2026-10-01',
        market: 'Atacadão',
      }),
    ]);

    expect(prices[0]).toMatchObject({
      market: 'Atacadão',
      purchaseDate: '2026-10-01',
      quantity: 4,
      unit: 'kg',
    });
  });

  it('empate de preço e data decide pelo menor id, sem createdAt e independente da ordem (RN-04/AC-04)', () => {
    // O id menor é o da compra criada por último (createdAt maior): se a cadeia
    // ainda usasse createdAt, o vencedor seria outro.
    const winner = purchase([{ name: 'Café', unitPrice: 8, quantity: 2 }], {
      id: uuid(3),
      purchaseDate: '2026-10-01',
      market: 'Atacadão',
      createdAt: '2026-10-01T10:00:00.000Z',
    });
    const loser = purchase([{ name: 'Café', unitPrice: 8, quantity: 5 }], {
      id: uuid(9),
      purchaseDate: '2026-10-01',
      market: 'Zaffari',
      createdAt: '2026-10-01T23:00:00.000Z',
    });
    const expected = [
      {
        name: 'Café',
        nameNormalized: 'cafe',
        lowestUnitPrice: 8,
        market: 'Atacadão',
        purchaseDate: '2026-10-01',
        quantity: 2,
        unit: 'unidade',
      },
    ];

    expect(aggregateLowestPrices([loser, winner])).toEqual(expected);
    expect(aggregateLowestPrices([winner, loser])).toEqual(expected);
  });

  it('empate exibe o nome do item da compra vencedora', () => {
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

    expect(prices[0].name).toBe('Cafe');
  });

  it('preserva a barra no nameNormalized para o round-trip da rota (R-2)', () => {
    // A barra sobrevive à normalização; os acentos caem como em `café` → `cafe`.
    const prices = aggregateLowestPrices([
      purchase([{ name: 'Leite/Açúcar', unitPrice: 5 }], {
        id: uuid(1),
        purchaseDate: '2026-10-01',
      }),
    ]);

    expect(prices[0].nameNormalized).toBe('leite/acucar');
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

describe('groupByMarket (RN-05/CD-04/CD-09; AC-01, AC-02)', () => {
  it('ordena mercados A→Z ignorando caixa e acentos (AC-02)', () => {
    const groups = groupByMarket([
      lowestPriceItem('Café', 'zaffari'),
      lowestPriceItem('Arroz', 'Atacadão'),
      lowestPriceItem('Feijão', 'Mercado Central'),
    ]);

    expect(groups.map((group) => group.market)).toEqual([
      'Atacadão',
      'Mercado Central',
      'zaffari',
    ]);
  });

  it('desempata mercados pelo texto cru quando a normalização empata (AC-02)', () => {
    const groups = groupByMarket([
      lowestPriceItem('Café', 'mercado'),
      lowestPriceItem('Arroz', 'Mercado'),
    ]);

    expect(groups.map((group) => group.market)).toEqual(['Mercado', 'mercado']);
  });

  it('ordena itens A→Z por nameNormalized dentro do grupo (AC-02)', () => {
    const groups = groupByMarket([
      lowestPriceItem('Café', 'Atacadão'),
      lowestPriceItem('Banana', 'Atacadão'),
      lowestPriceItem('Arroz', 'Atacadão'),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((item) => item.nameNormalized)).toEqual([
      'arroz',
      'banana',
      'cafe',
    ]);
  });

  it('não cria grupo vazio: só mercados com item vencedor entram na lista (CD-09)', () => {
    expect(groupByMarket([])).toEqual([]);

    const groups = groupByMarket([lowestPriceItem('Café', 'Atacadão')]);

    expect(groups).toEqual([
      { market: 'Atacadão', items: [lowestPriceItem('Café', 'Atacadão')] },
    ]);
  });

  it('mantém group.market igual ao market de cada linha (R-6b)', () => {
    const groups = groupByMarket([
      lowestPriceItem('Café', 'Atacadão'),
      lowestPriceItem('Arroz', 'Atacadão'),
      lowestPriceItem('Feijão', 'Zaffari'),
    ]);

    for (const group of groups) {
      expect(group.items.length).toBeGreaterThan(0);
      for (const item of group.items) {
        expect(item.market).toBe(group.market);
      }
    }
  });

  it('resultado não depende da ordem de entrada dos itens', () => {
    const items = [
      lowestPriceItem('Café', 'Zaffari'),
      lowestPriceItem('Arroz', 'Atacadão'),
      lowestPriceItem('Banana', 'Atacadão'),
    ];

    expect(groupByMarket([...items].reverse())).toEqual(groupByMarket(items));
  });
});

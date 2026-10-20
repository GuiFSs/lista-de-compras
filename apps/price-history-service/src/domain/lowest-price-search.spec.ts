import { describe, expect, it } from 'vitest';
import type { LowestPriceItem } from '@lista/contracts';
import { filterLowestPrices } from './lowest-price-search';
import { normalizeItemName } from './item-name';

const ITEMS: LowestPriceItem[] = [
  {
    name: 'café',
    nameNormalized: normalizeItemName('café'),
    lowestUnitPrice: 9,
    market: 'Zaffari',
    purchaseDate: '2026-10-01',
    quantity: 2,
    unit: 'kg',
  },
  {
    name: 'Cebola Branca',
    nameNormalized: normalizeItemName('Cebola Branca'),
    lowestUnitPrice: 6,
    market: 'Atacadão',
    purchaseDate: '2026-09-20',
    quantity: 1,
    unit: 'unidade',
  },
  {
    name: 'cebola',
    nameNormalized: normalizeItemName('cebola'),
    lowestUnitPrice: 5,
    market: 'Mercado Central',
    purchaseDate: '2026-09-15',
    quantity: 500,
    unit: 'g',
  },
  {
    name: 'Arroz integral',
    nameNormalized: normalizeItemName('Arroz integral'),
    lowestUnitPrice: 8,
    market: 'Atacadão',
    purchaseDate: '2026-08-30',
    quantity: 1,
    unit: 'kg',
  },
];

describe('filterLowestPrices (RN-07b; AC-09)', () => {
  it('busca sem acento encontra o item registrado com acento (AC-09)', () => {
    expect(filterLowestPrices(ITEMS, 'cafe')).toEqual([ITEMS[0]]);
    expect(filterLowestPrices(ITEMS, 'Cafe')).toEqual([ITEMS[0]]);
  });

  it('busca com acento e caixa mista também encontra', () => {
    expect(filterLowestPrices(ITEMS, 'CAFÉ')).toEqual([ITEMS[0]]);
  });

  it('substring alcança vários itens (ceb → cebola e cebola branca)', () => {
    expect(filterLowestPrices(ITEMS, 'ceb')).toEqual([ITEMS[1], ITEMS[2]]);
  });

  it('busca vazia ou só espaços devolve a lista completa (sem filtro)', () => {
    expect(filterLowestPrices(ITEMS, '')).toEqual(ITEMS);
    expect(filterLowestPrices(ITEMS, '   ')).toEqual(ITEMS);
  });

  it('sem correspondência devolve lista vazia (AC-09)', () => {
    expect(filterLowestPrices(ITEMS, 'leite')).toEqual([]);
  });

  it('não altera a ordem dos itens filtrados', () => {
    const filtered = filterLowestPrices(ITEMS, 'c');

    expect(filtered.map((item) => item.nameNormalized)).toEqual([
      'cafe',
      'cebola branca',
      'cebola',
    ]);
  });

  it('preserva mercado, data, quantidade e unidade do item vencedor', () => {
    expect(filterLowestPrices(ITEMS, 'cafe')).toEqual([
      {
        name: 'café',
        nameNormalized: 'cafe',
        lowestUnitPrice: 9,
        market: 'Zaffari',
        purchaseDate: '2026-10-01',
        quantity: 2,
        unit: 'kg',
      },
    ]);
  });

  it('não muta a lista nem os itens recebidos', () => {
    const snapshot = structuredClone(ITEMS);

    filterLowestPrices(ITEMS, 'ceb');
    filterLowestPrices(ITEMS, '');

    expect(ITEMS).toEqual(snapshot);
  });
});

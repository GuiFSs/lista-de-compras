import { describe, expect, it } from 'vitest';
import type { LowestPriceItem } from '@lista/contracts';
import { filterLowestPrices } from './lowest-price-search';

const ITEMS: LowestPriceItem[] = [
  { name: 'café', nameNormalized: 'cafe', lowestUnitPrice: 9 },
  { name: 'Cebola Branca', nameNormalized: 'cebola branca', lowestUnitPrice: 6 },
  { name: 'cebola', nameNormalized: 'cebola', lowestUnitPrice: 5 },
  { name: 'Arroz integral', nameNormalized: 'arroz integral', lowestUnitPrice: 8 },
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
});

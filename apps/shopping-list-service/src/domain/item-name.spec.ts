import { describe, expect, it } from 'vitest';
import {
  isBlankItemName,
  itemNamesMatch,
  normalizeItemName,
} from './item-name';

describe('normalizeItemName (RN-02/CD-12)', () => {
  it('une maiúsculas/minúsculas, acentos e espaços nas extremidades', () => {
    const same = ['café', 'CAFE', 'Cafe ', '  cafe', 'Café'];

    const keys = same.map(normalizeItemName);

    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe('cafe');
  });

  it('remove diacríticos de vogais, cedilha e til', () => {
    expect(normalizeItemName('Açaí')).toBe('acai');
    expect(normalizeItemName('PÃO')).toBe('pao');
  });

  it('mantém sinônimos distintos (cebola branca ≠ cebola)', () => {
    expect(normalizeItemName('cebola branca')).toBe('cebola branca');
    expect(normalizeItemName('cebola branca')).not.toBe(
      normalizeItemName('cebola'),
    );
  });

  it('preserva espaços internos e apenas apara as extremidades', () => {
    expect(normalizeItemName('  Arroz  integral ')).toBe('arroz  integral');
  });
});

describe('isBlankItemName (RN-02)', () => {
  it('trata vazio e só espaços como em branco', () => {
    expect(isBlankItemName('')).toBe(true);
    expect(isBlankItemName('   ')).toBe(true);
    expect(isBlankItemName('\t\n')).toBe(true);
    expect(isBlankItemName('a')).toBe(false);
    expect(isBlankItemName('  a  ')).toBe(false);
  });
});

describe('itemNamesMatch (RN-02)', () => {
  it('compara pela mesma chave normalizada', () => {
    expect(itemNamesMatch('Café', 'cafe')).toBe(true);
    expect(itemNamesMatch('cebola', 'cebola branca')).toBe(false);
  });
});

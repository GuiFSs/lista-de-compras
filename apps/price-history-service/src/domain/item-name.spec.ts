import { describe, expect, it } from 'vitest';
import { normalizeItemName } from './item-name';

describe('normalizeItemName (RN-06/CD-05)', () => {
  it('une maiúsculas/minúsculas, acentos e espaços nas extremidades', () => {
    const same = ['café', 'CAFE', 'Cafe ', '  cafe', 'Café'];

    const keys = same.map(normalizeItemName);

    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe('cafe');
  });

  it('remove diacríticos de vogais, cedilha e til', () => {
    expect(normalizeItemName('Açaí')).toBe('acai');
    expect(normalizeItemName('PÃO')).toBe('pao');
    expect(normalizeItemName('Água de coco')).toBe('agua de coco');
  });

  it('mantém sinônimos distintos (cebola branca ≠ cebola)', () => {
    expect(normalizeItemName('cebola branca')).not.toBe(
      normalizeItemName('cebola'),
    );
  });

  it('preserva espaços internos e apenas apara as extremidades', () => {
    expect(normalizeItemName('  Arroz  integral ')).toBe('arroz  integral');
  });
});

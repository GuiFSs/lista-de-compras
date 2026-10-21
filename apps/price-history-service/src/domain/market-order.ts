import { normalizeItemName } from './item-name';

/**
 * Ordem canônica dos mercados na lista principal (RN-05/CD-04): A→Z pela
 * normalização de nomes — caixa e acentos ignorados. Quando dois nomes
 * normalizam igual (`Mercado` × `mercado`), o texto cru decide, para a saída
 * não depender da ordem de entrada das compras.
 */
export function compareMarketNames(left: string, right: string): number {
  const leftNormalized = normalizeItemName(left);
  const rightNormalized = normalizeItemName(right);
  if (leftNormalized !== rightNormalized) {
    return leftNormalized < rightNormalized ? -1 : 1;
  }
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

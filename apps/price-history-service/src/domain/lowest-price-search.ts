import type { LowestPriceItem } from '@lista/contracts';
import { normalizeItemName } from './item-name';

/**
 * Busca por nome na lista de menores preços (RN-07b; AC-09): casamento por
 * substring sob a mesma normalização do agrupamento — `cafe` encontra `café`.
 * A consulta é tratada como texto digitado; aparada e normalizada aqui para o
 * caller não precisar repetir a regra.
 */
export function filterLowestPrices(
  items: readonly LowestPriceItem[],
  query: string,
): LowestPriceItem[] {
  const normalizedQuery = normalizeItemName(query);
  // Busca vazia (ou só espaços) devolve a lista completa: "sem filtro".
  if (normalizedQuery.length === 0) {
    return [...items];
  }
  return items.filter((item) => item.nameNormalized.includes(normalizedQuery));
}

import type { ItemUnit } from '@lista/contracts';

/**
 * Formatação das compras do histórico. `purchaseDate` chega do serviço como
 * `YYYY-MM-DD` (data de calendário, sem fuso) e preço é sempre R$ (ADR 0002).
 * Sem `Intl`: o texto não muda com o locale do runtime (testes e PWA iguais).
 */

/** `YYYY-MM-DD` → `DD/MM/AAAA`; entrada fora do formato volta como veio. */
export function formatPurchaseDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match === null ? value : `${match[3]}/${match[2]}/${match[1]}`;
}

/** Quantidade com vírgula decimal, sem zeros à direita (mesma regra da lista). */
export function formatQuantity(value: number): string {
  return String(value).replace('.', ',');
}

/** Quantidade com a unidade, como o serviço registrou: "2 kg", "3 unidade". */
export function formatQuantityWithUnit(
  quantity: number,
  unit: ItemUnit,
): string {
  return `${formatQuantity(quantity)} ${unit}`;
}

/** Preço por unidade em R$, sempre com centavos. */
export function formatUnitPrice(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

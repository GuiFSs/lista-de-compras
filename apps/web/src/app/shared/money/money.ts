/**
 * Preços e decimais da PWA, sem framework. A fonte de verdade do preço é a
 * string de dígitos (centavos): exibição, payload e prefill derivam dela, para
 * máscara e número não divergirem.
 */

/** Só os dígitos do texto digitado ou colado — descarta `R$`, separadores, sinal e letras. */
export function digitsFromInput(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Centavos em BRL, sem separador de milhar (CD-15); sem dígitos, string vazia. */
export function formatBrlFromDigits(digits: string): string {
  if (digits === '') return '';

  const centavos = digits.padStart(3, '0');
  const reais = centavos.slice(0, -2).replace(/^0+(?=\d)/, '');
  return `R$ ${reais},${centavos.slice(-2)}`;
}

/** Número enviado ao serviço; `null` quando não há dígitos (ausência, não zero). */
export function numberFromDigits(digits: string): number | null {
  if (digits === '') return null;
  return Number(digits) / 100;
}

/** Prefill: número → dígitos, arredondando os centavos. */
export function digitsFromNumber(value: number): string {
  // `9.9 * 100` não é exato em ponto flutuante (990.0000000000001).
  return String(Math.round(value * 100));
}

/** Decimal digitado com vírgula ou ponto (RN-06), para a quantidade; `null` no campo vazio. */
export function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  return normalized === '' ? null : Number(normalized);
}

/** Mesmo formato aceito na digitação, para o prefill (vírgula decimal). */
export function formatDecimal(value: number): string {
  return String(value).replace('.', ',');
}

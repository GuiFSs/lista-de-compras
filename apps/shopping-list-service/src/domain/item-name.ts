/**
 * Marcas combinantes que NFKD deixa ao decompor letras acentuadas
 * (`café` → `cafe` + U+0301). Removê-las dá a comparação sem acentos do RN-02.
 */
const COMBINING_DIACRITICS = /[\u0300-\u036f]/g;

/**
 * Chave de comparação e de unicidade do nome (RN-02/CD-12): ignora espaços nas
 * extremidades, acentos e maiúsculas/minúsculas. `café`, `CAFE`, `Cafe ` e
 * `cafe` produzem a mesma chave; `cebola branca` e `cebola` não.
 */
export function normalizeItemName(name: string): string {
  return name
    .trim()
    .normalize('NFKD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase();
}

/** Nome vazio ou só com espaços não é nome válido (RN-02). */
export function isBlankItemName(name: string): boolean {
  return name.trim().length === 0;
}

/** Igualdade de nomes pela comparação do RN-02 (serve para o predicado de colisão). */
export function itemNamesMatch(left: string, right: string): boolean {
  return normalizeItemName(left) === normalizeItemName(right);
}

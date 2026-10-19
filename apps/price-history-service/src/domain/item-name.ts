/**
 * Marcas combinantes que NFKD deixa ao decompor letras acentuadas
 * (`café` → `cafe` + U+0301). Removê-las dá a comparação sem acentos (CD-05).
 */
const COMBINING_DIACRITICS = /[\u0300-\u036f]/g;

/**
 * Chave de agrupamento/comparação do histórico (RN-06/CD-05): `café`, `CAFE` e
 * `cafe` são o mesmo item; `cebola branca` e `cebola` não. Paridade com a
 * lista ativa — cada serviço mantém a própria cópia, sem lib de domínio
 * compartilhada.
 */
export function normalizeItemName(name: string): string {
  return name
    .trim()
    .normalize('NFKD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase();
}

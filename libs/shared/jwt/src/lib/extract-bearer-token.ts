// Extração do token do header `Authorization: Bearer <jwt>` (ADR 0007).
//
// Função pura e framework-free: não conhece NestJS, Fastify nem HTTP — recebe
// o valor do header (string) e devolve o JWT, ou `null` quando o header está
// ausente ou malformado. O guard da borda (Nest) mapeia `null` para o 401
// uniforme; esta função nunca decide autorização.

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

/**
 * Extrai o token de um header `Authorization`.
 *
 * - `Authorization: Bearer <jwt>` → o JWT (uma única string sem espaços).
 * - Header ausente (`undefined`/`null`) ou vazio → `null`.
 * - Malformado (esquema diferente de Bearer, token vazio ou com espaços,
 *   ex.: `Basic xxx`, `Bearer`, `Bearer a b`) → `null`.
 *
 * O esquema é comparado sem diferenciar maiúsculas (`bearer`/`Bearer`),
 * conforme RFC 7235 §5.1 — o esquema de autenticação é case-insensitive.
 */
export function extractBearerToken(
  header: string | null | undefined,
): string | null {
  if (header == null) {
    return null;
  }
  const match = BEARER_PATTERN.exec(header.trim());
  return match ? match[1] : null;
}
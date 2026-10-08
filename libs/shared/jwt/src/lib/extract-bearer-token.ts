const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

/**
 * Extrai o JWT de `Authorization: Bearer <jwt>`.
 * Ausente/malformado → `null` (esquema case-insensitive, RFC 7235).
 * Não decide autorização — o guard mapeia `null` para 401.
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

/**
 * Aceita só paths internos absolutos (`/…`, não `//…`) — evita open redirect.
 * Inválido → `null` (chamador usa o default).
 */
export function sanitizeReturnUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith('/') || url.startsWith('//')) return null;
  return url;
}

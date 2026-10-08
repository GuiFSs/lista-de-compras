// Helpers do `returnUrl` — a rota que a pessoa tentava acessar antes de ser
// levada ao login (RN10/AC12: guard de retorno, deep links e recarga passam
// pelo login e voltam à rota original).

/**
 * Valida uma URL de retorno antes de navegar a ela.
 *
 * Aceita apenas **caminhos absolutos internos** da PWA: começa com `/` mas
 * não com `//`. Rejeitar `//` (e qualquer string sem `/` inicial) impede
 * redirecionamento para host externo (open redirect) via `returnUrl` forjado
 * na query string. Retorna `null` para valores inválidos — o chamador usa a
 * rota default (`''`).
 */
export function sanitizeReturnUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith('/') || url.startsWith('//')) return null;
  return url;
}
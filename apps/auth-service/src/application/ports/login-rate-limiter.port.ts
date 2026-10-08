/**
 * Rate limit de login por cliente (janela fixa).
 * Adaptadores futuros (Redis/gateway) substituem só a implementação.
 */
export abstract class LoginRateLimiter {
  /** `true` se bloqueado na janela — checar antes das credenciais. */
  abstract isBlocked(clientId: string): Promise<boolean>;

  /** Registra falha (inclui usuário inexistente). */
  abstract registerFailure(clientId: string): Promise<void>;

  /** Zera o contador após login bem-sucedido. */
  abstract reset(clientId: string): Promise<void>;

  /** Segundos restantes da janela (header `Retry-After` no 429). */
  abstract retryAfterSeconds(clientId: string): Promise<number>;
}

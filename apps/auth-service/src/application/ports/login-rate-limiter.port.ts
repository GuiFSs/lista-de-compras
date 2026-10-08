// Port do rate limit do login (lado da aplicação).
//
// RN13/AC-14: limite de tentativas de login com falha por janela (5 falhas /
// 60s por IP na v1, definido no PLAN.md), respondendo 429 genérico. A política
// vive no domínio; o adaptador concreto (em memória por IP, relógio injetável)
// é entregue na tarefa T7 — esta port já nasce aqui (T6) para que o
// LoginUseCase e o controller tenham o ponto de injeção pronto.
//
// ADR 0006 §5: qualquer implementação futura (Redis/distribuído ou gateway)
// substitui apenas o adaptador, sem tocar no caso de uso.
export abstract class LoginRateLimiter {
  /**
   * `true` quando o cliente está bloqueado na janela (>= max falhas).
   * A checagem acontece ANTES de validar credenciais (AC-14: mesmo com
   * credenciais corretas, bloqueado até a janela expirar).
   */
  abstract isBlocked(clientId: string): Promise<boolean>;

  /** Registra uma falha de credenciais (inclui usuário inexistente — 🟡-3). */
  abstract registerFailure(clientId: string): Promise<void>;

  /** Zera o contador do cliente após login bem-sucedido. */
  abstract reset(clientId: string): Promise<void>;

  /**
   * Segundos restantes da janela para o cliente — usados pelo controller no
   * header `Retry-After` do 429 (arredondado para cima; T7).
   */
  abstract retryAfterSeconds(clientId: string): Promise<number>;
}
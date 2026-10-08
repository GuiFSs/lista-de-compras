// Adaptador concreto do rate limit do login em memória por IP.
//
// Implementa a port `LoginRateLimiter` usando apenas Map puro, sem dependências
// novas (sem Redis, sem broker). Política: máximo 5 falhas/60s por IP, janela fixa
// a partir da 1ª falha, contador zera no sucesso e expira com a janela.
// Relógio injetável (parâmetro opcional; default Date.now).
//
// ADR 0006 §5: qualquer implementação futura (Redis/distribuído ou gateway)
// substitui apenas este adaptador, sem tocar no caso de uso ou no controller.
//
// A poĺgica de "janela fixa a partir da 1ª falha" significa:
// - A janela começa na primeira falha do cliente.
// - Até a janela expirar (60s), contagem acumulada de falhas determina o bloqueio.
// - Após a janela expirar, o contador zera e um novo login é permitido.
import { LoginRateLimiter } from '../application/ports/login-rate-limiter.port';

// Padrões do PLAN.md / RN13-AC14
const DEFAULT_MAX_FAILURES = 5;
const DEFAULT_WINDOW_MS = 60_000; // 60 segundos

export interface MemoryRateLimiterConfig {
  maxFailures?: number;
  windowMs?: number;
  clock?: () => number;
}

export class MemoryRateLimiter implements LoginRateLimiter {
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private readonly clock: () => number;

  // Map: clientId -> { count: number, windowStart: number }
  private readonly store: Map<
    string,
    { count: number; windowStart: number }
  >;

  constructor(config: MemoryRateLimiterConfig = {}) {
    this.maxFailures =
      config.maxFailures ?? DEFAULT_MAX_FAILURES ?? Number(process.env['AUTH_RATE_LIMIT_MAX_FAILURES'] ?? DEFAULT_MAX_FAILURES);
    this.windowMs =
      config.windowMs ?? DEFAULT_WINDOW_MS ?? Number(process.env['AUTH_RATE_LIMIT_WINDOW_MS'] ?? DEFAULT_WINDOW_MS);
    this.clock = config.clock ?? (() => Date.now());
    this.store = new Map();
  }

  /**
   * Retorna `true` quando o cliente está bloqueado na janela (>= max falhas).
   * A checagem acontece ANTES de validar credenciais (RN13/AC14: mesmo com
   * credenciais corretas, bloqueado até a janela expirar).
   */
  async isBlocked(clientId: string): Promise<boolean> {
    const entry = this.store.get(clientId);
    if (!entry) return false;

    const now = this.clock();
    // Se a janela já expirou, remove a entrada e permite novo login
    if (now - entry.windowStart >= this.windowMs) {
      this.store.delete(clientId);
      return false;
    }

    return entry.count >= this.maxFailures;
  }

  /** Registra uma falha de credenciais (inclui usuário inexistente — 🟡-3). */
  async registerFailure(clientId: string): Promise<void> {
    const now = this.clock();
    const entry = this.store.get(clientId);

    if (entry) {
      // Já existe uma entrada — verifica se a janela ainda está ativa
      if (now - entry.windowStart >= this.windowMs) {
        // Janela expirou, reinicia com esta falha como a 1ª
        this.store.set(clientId, { count: 1, windowStart: now });
      } else {
        // Ainda na mesma janela, incrementa a contagem
        this.store.set(clientId, { count: entry.count + 1, windowStart: entry.windowStart });
      }
    } else {
      // Primeira falha, inicia a janela
      this.store.set(clientId, { count: 1, windowStart: now });
    }
  }

  /** Zera o contador do cliente após login bem-sucedido. */
  async reset(clientId: string): Promise<void> {
    this.store.delete(clientId);
  }

  /**
   * Segundos restantes da janela para o cliente — usados pelo controller no
   * header `Retry-After` do 429 (arredondado para cima).
   *
   * Retorna 0 se não houver entrada ativa ou se a janela já tivesse expirado.
   */
  async retryAfterSeconds(clientId: string): Promise<number> {
    const entry = this.store.get(clientId);
    if (!entry) return 0;

    const now = this.clock();
    const remaining = entry.windowStart + this.windowMs - now;

    if (remaining <= 0) {
      // Janela expirou, limpa a entrada
      this.store.delete(clientId);
      return 0;
    }

    // Arredondar para cima em segundos
    return Math.ceil(remaining / 1000);
  }
}
import { LoginRateLimiter } from '../application/ports/login-rate-limiter.port';

const DEFAULT_MAX_FAILURES = 5;
const DEFAULT_WINDOW_MS = 60_000;

export interface MemoryRateLimiterConfig {
  maxFailures?: number;
  windowMs?: number;
  /** Relógio injetável para testes; default `Date.now`. */
  clock?: () => number;
}

/**
 * Rate limit em memória por `clientId` (janela fixa a partir da 1ª falha).
 * Troca futura por Redis/gateway não altera o caso de uso.
 */
export class MemoryRateLimiter implements LoginRateLimiter {
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private readonly clock: () => number;
  private readonly store: Map<
    string,
    { count: number; windowStart: number }
  >;

  constructor(config: MemoryRateLimiterConfig = {}) {
    this.maxFailures =
      config.maxFailures ??
      Number(
        process.env['AUTH_RATE_LIMIT_MAX_FAILURES'] ?? DEFAULT_MAX_FAILURES,
      );
    this.windowMs =
      config.windowMs ??
      Number(process.env['AUTH_RATE_LIMIT_WINDOW_MS'] ?? DEFAULT_WINDOW_MS);
    this.clock = config.clock ?? (() => Date.now());
    this.store = new Map();
  }

  async isBlocked(clientId: string): Promise<boolean> {
    const entry = this.store.get(clientId);
    if (!entry) return false;

    const now = this.clock();
    if (now - entry.windowStart >= this.windowMs) {
      this.store.delete(clientId);
      return false;
    }

    return entry.count >= this.maxFailures;
  }

  async registerFailure(clientId: string): Promise<void> {
    const now = this.clock();
    const entry = this.store.get(clientId);

    if (entry) {
      if (now - entry.windowStart >= this.windowMs) {
        this.store.set(clientId, { count: 1, windowStart: now });
      } else {
        this.store.set(clientId, {
          count: entry.count + 1,
          windowStart: entry.windowStart,
        });
      }
    } else {
      this.store.set(clientId, { count: 1, windowStart: now });
    }
  }

  async reset(clientId: string): Promise<void> {
    this.store.delete(clientId);
  }

  /** Segundos restantes da janela (ceil); 0 se sem entrada ativa. */
  async retryAfterSeconds(clientId: string): Promise<number> {
    const entry = this.store.get(clientId);
    if (!entry) return 0;

    const remainingMs = this.windowMs - (this.clock() - entry.windowStart);
    if (remainingMs <= 0) {
      this.store.delete(clientId);
      return 0;
    }
    return Math.ceil(remainingMs / 1000);
  }
}

import { describe, expect, it } from 'vitest';
import { MemoryRateLimiter } from './memory-rate-limiter';

describe('MemoryRateLimiter (AC-14)', () => {
  it('bloqueia após cinco falhas e informa o Retry-After', async () => {
    let now = 1_000;
    const limiter = new MemoryRateLimiter({
      maxFailures: 5,
      windowMs: 60_000,
      clock: () => now,
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(await limiter.isBlocked('client-1')).toBe(false);
      await limiter.registerFailure('client-1');
    }

    expect(await limiter.isBlocked('client-1')).toBe(true);
    expect(await limiter.retryAfterSeconds('client-1')).toBe(60);

    now += 1_500;
    expect(await limiter.retryAfterSeconds('client-1')).toBe(59);
  });

  it('libera o cliente quando a janela expira', async () => {
    let now = 0;
    const limiter = new MemoryRateLimiter({
      maxFailures: 1,
      windowMs: 1_000,
      clock: () => now,
    });

    await limiter.registerFailure('client-1');
    expect(await limiter.isBlocked('client-1')).toBe(true);

    now = 1_000;
    expect(await limiter.isBlocked('client-1')).toBe(false);
    expect(await limiter.retryAfterSeconds('client-1')).toBe(0);
  });

  it('zera as falhas após login bem-sucedido', async () => {
    const limiter = new MemoryRateLimiter({ maxFailures: 1 });

    await limiter.registerFailure('client-1');
    expect(await limiter.isBlocked('client-1')).toBe(true);

    await limiter.reset('client-1');
    expect(await limiter.isBlocked('client-1')).toBe(false);
  });

  it('lê os limites do ambiente quando não há override de teste', async () => {
    const previousMax = process.env['AUTH_RATE_LIMIT_MAX_FAILURES'];
    const previousWindow = process.env['AUTH_RATE_LIMIT_WINDOW_MS'];
    process.env['AUTH_RATE_LIMIT_MAX_FAILURES'] = '1';
    process.env['AUTH_RATE_LIMIT_WINDOW_MS'] = '1000';

    try {
      const limiter = new MemoryRateLimiter({ clock: () => 0 });
      await limiter.registerFailure('client-1');
      expect(await limiter.isBlocked('client-1')).toBe(true);
    } finally {
      if (previousMax === undefined) {
        delete process.env['AUTH_RATE_LIMIT_MAX_FAILURES'];
      } else {
        process.env['AUTH_RATE_LIMIT_MAX_FAILURES'] = previousMax;
      }
      if (previousWindow === undefined) {
        delete process.env['AUTH_RATE_LIMIT_WINDOW_MS'];
      } else {
        process.env['AUTH_RATE_LIMIT_WINDOW_MS'] = previousWindow;
      }
    }
  });
});

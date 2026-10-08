// Testes da política do rate limit do login em memória (RN13/AC14, T7).
//
// Política do PLAN.md ("número exato do rate limit"): máximo de 5 tentativas
// com falha por janela de 60 segundos, por clientId (IP na v1), janela fixa a
// partir da 1ª falha, contador zera no sucesso e expira com a janela.
//
// O relógio é controlado com fake timers do Vitest (`vi.useFakeTimers()` +
// `vi.setSystemTime`) — nenhum teste espera tempo real (PLAN.md: "relógio
// injetável/fake timers").
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRateLimiter } from './memory-rate-limiter';

// Números exatos fechados no PLAN.md (RN13/AC14).
const MAX_FAILURES = 5;
const WINDOW_MS = 60_000;

const CLIENT = '203.0.113.10';
const OTHER_CLIENT = '203.0.113.11';

describe('MemoryRateLimiter — 5 falhas / 60s por clientId (RN13/AC14)', () => {
  let limiter: MemoryRateLimiter;
  let now: number;

  beforeEach(() => {
    vi.useFakeTimers();
    now = Date.parse('2026-10-08T12:00:00.000Z');
    vi.setSystemTime(now);
    limiter = new MemoryRateLimiter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Avança o relógio fake de teste. */
  function advance(ms: number): void {
    now += ms;
    vi.setSystemTime(now);
  }

  /** Registra `count` falhas do CLIENT (sem avançar o relógio). */
  async function registerFailures(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await limiter.registerFailure(CLIENT);
    }
  }

  it('sem falhas o cliente nunca está bloqueado', async () => {
    expect(await limiter.isBlocked(CLIENT)).toBe(false);
    expect(await limiter.retryAfterSeconds(CLIENT)).toBe(0);
  });

  it('bloqueia somente ao atingir o limite de 5 falhas na janela (PLAN.md 5/60s)', async () => {
    await registerFailures(4);
    expect(await limiter.isBlocked(CLIENT)).toBe(false);

    await limiter.registerFailure(CLIENT); // 5ª falha
    expect(await limiter.isBlocked(CLIENT)).toBe(true);
  });

  it('Retry-After devolve o restante da janela arredondado para cima (RN13)', async () => {
    await registerFailures(MAX_FAILURES); // janela inicia em `now`

    advance(19_500); // restam 40,5s → ceil → 41
    expect(await limiter.retryAfterSeconds(CLIENT)).toBe(41);

    advance(500); // restam exatamente 40s
    expect(await limiter.retryAfterSeconds(CLIENT)).toBe(40);

    // Bloqueado durante todo o restante da janela.
    expect(await limiter.isBlocked(CLIENT)).toBe(true);
  });

  it('expiração da janela reabre o login e zera a contagem (AC14: expirada a janela, volta a ser aceito)', async () => {
    await registerFailures(MAX_FAILURES);
    expect(await limiter.isBlocked(CLIENT)).toBe(true);

    advance(WINDOW_MS - 1); // um ms antes do fim: ainda bloqueado
    expect(await limiter.isBlocked(CLIENT)).toBe(true);

    advance(1); // janela completa (>= windowMs) → bloqueio encerra
    expect(await limiter.isBlocked(CLIENT)).toBe(false);

    // Contagem zerada: 4 falhas novas não bloqueiam; a 5ª bloqueia de novo.
    await registerFailures(4);
    expect(await limiter.isBlocked(CLIENT)).toBe(false);
    await limiter.registerFailure(CLIENT);
    expect(await limiter.isBlocked(CLIENT)).toBe(true);
  });

  it('sucesso (reset) zera o contador do cliente (RN13 — contador zera no sucesso)', async () => {
    await registerFailures(4);

    await limiter.reset(CLIENT); // login bem-sucedido

    expect(await limiter.isBlocked(CLIENT)).toBe(false);
    expect(await limiter.retryAfterSeconds(CLIENT)).toBe(0);
    // Recomeça do zero: 4 falhas seguem sem bloquear; a 5ª bloqueia.
    await registerFailures(4);
    expect(await limiter.isBlocked(CLIENT)).toBe(false);
    await limiter.registerFailure(CLIENT);
    expect(await limiter.isBlocked(CLIENT)).toBe(true);
  });

  it('isolamento por clientId: falhas de um IP não bloqueiam outro (AC14 por IP)', async () => {
    await registerFailures(MAX_FAILURES);
    expect(await limiter.isBlocked(CLIENT)).toBe(true);

    expect(await limiter.isBlocked(OTHER_CLIENT)).toBe(false);
    expect(await limiter.retryAfterSeconds(OTHER_CLIENT)).toBe(0);

    // O reset de um cliente não zera o contador do outro.
    for (let i = 0; i < MAX_FAILURES; i++) {
      await limiter.registerFailure(OTHER_CLIENT);
    }
    expect(await limiter.isBlocked(OTHER_CLIENT)).toBe(true);
    await limiter.reset(OTHER_CLIENT);
    expect(await limiter.isBlocked(OTHER_CLIENT)).toBe(false);
    expect(await limiter.isBlocked(CLIENT)).toBe(true);
  });

  it('janela fixa a partir da 1ª falha: novas falhas não deslizam a janela', async () => {
    await registerFailures(4); // janela [t0, t0+60s)

    advance(59_000);
    await limiter.registerFailure(CLIENT); // 5ª dentro da janela
    expect(await limiter.isBlocked(CLIENT)).toBe(true);

    advance(1_000); // t0+60s: janela encerra mesmo com a última falha há 1s
    expect(await limiter.isBlocked(CLIENT)).toBe(false);

    // A próxima falha inicia uma JANELA NOVA (contagem do zero, 60s cheios).
    await limiter.registerFailure(CLIENT);
    expect(await limiter.isBlocked(CLIENT)).toBe(false);
    expect(await limiter.retryAfterSeconds(CLIENT)).toBe(60);
  });

  it('retryAfterSeconds é 0 sem entrada ativa e após a janela expirar', async () => {
    expect(await limiter.retryAfterSeconds('cliente-sem-falhas')).toBe(0);

    await registerFailures(MAX_FAILURES);
    advance(WINDOW_MS); // janela expirou
    expect(await limiter.retryAfterSeconds(CLIENT)).toBe(0);
    // A leitura expirada também limpa a entrada: nova falha recomeça a janela.
    await limiter.registerFailure(CLIENT);
    expect(await limiter.retryAfterSeconds(CLIENT)).toBe(60);
  });

  it('config permite limite/janela menores em teste (relógio injetável é opcional)', async () => {
    const custom = new MemoryRateLimiter({ maxFailures: 2, windowMs: 1_000 });

    await custom.registerFailure(CLIENT);
    expect(await custom.isBlocked(CLIENT)).toBe(false);
    await custom.registerFailure(CLIENT);
    expect(await custom.isBlocked(CLIENT)).toBe(true);

    advance(1_000);
    expect(await custom.isBlocked(CLIENT)).toBe(false);
  });
});

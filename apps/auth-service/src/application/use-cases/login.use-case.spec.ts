// Testes do LoginUseCase — caso de uso puro com ports mockadas à mão
// (sem HTTP, NestJS ou banco — arquitetura hexagonal).
//
// Mapeamento AC → cenário:
// - AC2/RN5/RN11: credenciais válidas → token assinado, expiresIn 86400 (24h)
//   e contador do rate limiter zerado no sucesso;
// - AC3/RN7: senha errada → `invalid-credentials` genérico, falha registrada
//   no rate limiter, nenhuma sessão emitida;
// - AC3/RN7 + 🟡-3 (PLAN.md T7): usuário inexistente → MESMO resultado da
//   senha errada (não revela existência do usuário), comparado contra um hash
//   dummy gerado pelo `PasswordHasher` e contando como falha no rate limiter;
// - AC14/RN13: bloqueio do rate limiter vale ANTES das credenciais — nenhum
//   outro port é consultado e `retryAfterSeconds` é repassado no resultado
//   para o controller montar o header `Retry-After`.
import { describe, expect, it } from 'vitest';
import { User } from '../../domain/user';
import { LoginRateLimiter } from '../ports/login-rate-limiter.port';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenSigner } from '../ports/token-signer.port';
import { UserRepository } from '../ports/user-repository.port';
import { LoginCommand, LoginUseCase } from './login.use-case';

const USER: User = {
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  username: 'usuario-teste',
  passwordHash: '$2b$4$hash-estoque-do-usuario',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: null,
};

const COMMAND: LoginCommand = {
  username: USER.username,
  password: 'senha-certa',
  clientId: '198.51.100.7',
};

/** Hash "dummy" devolvido pelo hasher falso no caminho usuário-inexistente. */
const DUMMY_HASH = '$2b$4$hash-dummy-de-mesmo-custo';

/** Repositório fake: devolve o usuário configurado e registra as consultas. */
class FakeUserRepository extends UserRepository {
  readonly queried: string[] = [];

  constructor(private readonly user: User | null) {
    super();
  }

  async findByUsername(username: string): Promise<User | null> {
    this.queried.push(username);
    return this.user;
  }
}

/** Hasher fake: controla o resultado de `verify` e registra as chamadas. */
class FakePasswordHasher extends PasswordHasher {
  readonly hashed: string[] = [];
  readonly verified: Array<{ password: string; hash: string }> = [];
  verifyResult = false;

  async hash(password: string): Promise<string> {
    this.hashed.push(password);
    return DUMMY_HASH;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    this.verified.push({ password, hash });
    return this.verifyResult;
  }
}

/** Signer fake: registra para qual usuário o token foi assinado. */
class FakeTokenSigner extends TokenSigner {
  readonly signed: string[] = [];

  async sign(user: User): Promise<string> {
    this.signed.push(user.username);
    return 'jwt-de-teste';
  }
}

/** Rate limiter fake: controla o bloqueio e registra todas as chamadas. */
class FakeRateLimiter extends LoginRateLimiter {
  blocked = false;
  retryAfter = 0;
  readonly blockedChecks: string[] = [];
  readonly failures: string[] = [];
  readonly resets: string[] = [];

  async isBlocked(clientId: string): Promise<boolean> {
    this.blockedChecks.push(clientId);
    return this.blocked;
  }

  async registerFailure(clientId: string): Promise<void> {
    this.failures.push(clientId);
  }

  async reset(clientId: string): Promise<void> {
    this.resets.push(clientId);
  }

  async retryAfterSeconds(): Promise<number> {
    return this.retryAfter;
  }
}

describe('LoginUseCase', () => {
  const repo = (): FakeUserRepository => new FakeUserRepository(USER);
  const missingRepo = (): FakeUserRepository => new FakeUserRepository(null);
  const hasher = (): FakePasswordHasher => new FakePasswordHasher();
  const signer = (): FakeTokenSigner => new FakeTokenSigner();
  const limiter = (): FakeRateLimiter => new FakeRateLimiter();

  it('credenciais válidas → token assinado, TTL de 24h e contador zerado (AC2/RN5/RN11)', async () => {
    const userRepository = repo();
    const passwordHasher = hasher();
    const tokenSigner = signer();
    const rateLimiter = limiter();
    passwordHasher.verifyResult = true;
    const useCase = new LoginUseCase(
      userRepository,
      passwordHasher,
      tokenSigner,
      rateLimiter,
    );

    const result = await useCase.execute(COMMAND);

    // Sucesso: JWT emitido com validade de 24h em segundos (RN11).
    expect(result).toEqual({
      ok: true,
      accessToken: 'jwt-de-teste',
      expiresIn: 86400,
    });
    expect(userRepository.queried).toEqual([COMMAND.username]);
    expect(passwordHasher.verified).toEqual([
      { password: COMMAND.password, hash: USER.passwordHash },
    ]);
    expect(tokenSigner.signed).toEqual([USER.username]);
    // O bloqueio é consultado antes (clientId = IP informado) e o sucesso
    // zera o contador do cliente (RN13).
    expect(rateLimiter.blockedChecks).toEqual([COMMAND.clientId]);
    expect(rateLimiter.resets).toEqual([COMMAND.clientId]);
    expect(rateLimiter.failures).toEqual([]);
  });

  it('senha errada → invalid-credentials genérico, registra falha e não assina (AC3/RN7)', async () => {
    const userRepository = repo();
    const passwordHasher = hasher();
    const tokenSigner = signer();
    const rateLimiter = limiter();
    passwordHasher.verifyResult = false;
    const useCase = new LoginUseCase(
      userRepository,
      passwordHasher,
      tokenSigner,
      rateLimiter,
    );

    const result = await useCase.execute(COMMAND);

    // Resultado sem nenhuma informação extra (sem retryAfterSeconds, sem
    // campo, sem usuário) — a borda traduz em 401 genérico.
    expect(result).toEqual({ ok: false, reason: 'invalid-credentials' });
    expect(rateLimiter.failures).toEqual([COMMAND.clientId]);
    expect(rateLimiter.resets).toEqual([]);
    expect(tokenSigner.signed).toEqual([]);
    expect(userRepository.queried).toEqual([COMMAND.username]);
  });

  it('usuário inexistente → MESMO resultado da senha errada, sem revelar existência (AC3/RN7)', async () => {
    const passwordHasher = hasher();
    const tokenSigner = signer();
    const rateLimiter = limiter();

    // Caminho 1: usuário existe, senha errada.
    const withUser = new LoginUseCase(
      repo(),
      passwordHasher,
      tokenSigner,
      rateLimiter,
    );
    const wrongPassword = await withUser.execute(COMMAND);

    // Caminho 2: usuário não existe, MESMA senha.
    const withoutUser = new LoginUseCase(
      missingRepo(),
      passwordHasher,
      tokenSigner,
      rateLimiter,
    );
    const unknownUser = await withoutUser.execute(COMMAND);

    // Indistinguível: objetos idênticos (nenhum campo vaza o motivo).
    expect(wrongPassword).toEqual({ ok: false, reason: 'invalid-credentials' });
    expect(unknownUser).toEqual(wrongPassword);
    expect(JSON.stringify(unknownUser)).not.toContain(COMMAND.username);
    expect(tokenSigner.signed).toEqual([]);
  });

  it('usuário inexistente compara contra hash dummy e conta falha no rate limiter (🟡-3/PLAN T7)', async () => {
    const passwordHasher = hasher();
    const tokenSigner = signer();
    const rateLimiter = limiter();
    const useCase = new LoginUseCase(
      missingRepo(),
      passwordHasher,
      tokenSigner,
      rateLimiter,
    );

    const result = await useCase.execute(COMMAND);

    expect(result).toEqual({ ok: false, reason: 'invalid-credentials' });
    // Uniformização de tempo (RN7): um hash dummy é GERADO pelo hasher e a
    // comparação usa esse hash — não o hash do usuário (que não existe).
    expect(passwordHasher.hashed).toEqual([expect.any(String)]);
    expect(passwordHasher.hashed[0].length).toBeGreaterThan(0);
    expect(passwordHasher.verified).toHaveLength(1);
    expect(passwordHasher.verified[0]).toEqual({
      password: COMMAND.password,
      hash: DUMMY_HASH,
    });
    // Usuário inexistente registra falha como qualquer senha errada (🟡-3).
    expect(rateLimiter.failures).toEqual([COMMAND.clientId]);
    expect(tokenSigner.signed).toEqual([]);
  });

  it('bloqueio do rate limiter vale antes das credenciais e repassa retryAfterSeconds (AC14/RN13)', async () => {
    const userRepository = repo();
    const passwordHasher = hasher();
    const tokenSigner = signer();
    const rateLimiter = limiter();
    // Mesmo com credenciais corretas armadas, o bloqueio impede o login.
    passwordHasher.verifyResult = true;
    rateLimiter.blocked = true;
    rateLimiter.retryAfter = 42;
    const useCase = new LoginUseCase(
      userRepository,
      passwordHasher,
      tokenSigner,
      rateLimiter,
    );

    const result = await useCase.execute(COMMAND);

    expect(result).toEqual({
      ok: false,
      reason: 'rate-limited',
      retryAfterSeconds: 42,
    });
    // Nenhum outro port é consultado durante o bloqueio (AC14: "mesmo com
    // credenciais corretas" — nem repositório, nem hash, nem assinatura).
    expect(rateLimiter.blockedChecks).toEqual([COMMAND.clientId]);
    expect(userRepository.queried).toEqual([]);
    expect(passwordHasher.hashed).toEqual([]);
    expect(passwordHasher.verified).toEqual([]);
    expect(tokenSigner.signed).toEqual([]);
    expect(rateLimiter.failures).toEqual([]);
    expect(rateLimiter.resets).toEqual([]);
  });
});

// Caso de uso de login — puro (domínio/aplicação), sem HTTP, NestJS ou banco.
//
// Fluxo definido no PLAN.md ("Regras de domínio e casos de uso"):
//   1. LoginRateLimiter: bloqueado → erro genérico 429 (AC14 — vale antes da
//      validação de credenciais; a política real entra na T7, em T6 o limiter
//      é um no-op injetável).
//   2. UserRepository.findByUsername(username) → User | null.
//   3. `null` → MESMO erro genérico do passo 4 (RN7: não revela se o usuário
//      existe). A comparação contra hash dummy de mesmo custo + registro da
//      falha no rate limiter entram na T7 (🟡-3); em T6 registra-se no no-op.
//   4. PasswordHasher.verify — falha ⇒ registra falha e responde 401 genérico;
//      sucesso ⇒ zera o contador do cliente.
//   5. TokenSigner.sign(user) → JWT RS256 24h → 200.
//
// O resultado é uma união discriminada (result, não exceção): o domínio não
// conhece HTTP; o controller (borda) traduz cada razão de falha no envelope
// canônico de erro de `@lista/contracts`.
import { User } from '../../domain/user';
import { LoginRateLimiter } from '../ports/login-rate-limiter.port';
import { PasswordHasher } from '../ports/password-hasher.port';
import {
  JWT_TTL_SECONDS,
  TokenSigner,
} from '../ports/token-signer.port';
import { UserRepository } from '../ports/user-repository.port';

/** Entrada do caso de uso — comando de login. */
export interface LoginCommand {
  username: string;
  password: string;
  /**
   * Identificador do cliente para o rate limiter (ex.: `req.ip` na v1 local,
   * sem proxy — PLAN.md). Conceito puro: o caso de uso não conhece HTTP.
   */
  clientId: string;
}

export type LoginFailureReason = 'invalid-credentials' | 'rate-limited';

/**
 * Resultado do caso de uso de login.
 * `retryAfterSeconds` é preenchido quando `reason === 'rate-limited'` para
 * permitir que o controller inclua o header `Retry-After` no response 429.
 */
export type LoginUseCaseResult =
  | { ok: true; accessToken: string; expiresIn: number }
  | {
      ok: false;
      reason: LoginFailureReason;
      retryAfterSeconds?: number;
    };

/**
 * Implementação vazia do `LoginRateLimiter` usada em T6, quando o adaptador
 * real ainda não existe (T7). Mantém a estrutura do caso de uso final: o
 * limiter é sempre consultado/notificado, mas nunca bloqueia nesta tarefa.
 */
class NoopRateLimiter implements LoginRateLimiter {
  async isBlocked(_clientId: string): Promise<boolean> {
    return false;
  }
  async registerFailure(_clientId: string): Promise<void> {
    // No-op proposital (T6): a política real de rate limit entra na T7.
  }
  async reset(_clientId: string): Promise<void> {
    // No-op proposital (T6): sem contadores a zerar enquanto é no-op.
  }
  async retryAfterSeconds(_clientId: string): Promise<number> {
    return 0;
  }
}

export class LoginUseCase {
  rateLimiter: LoginRateLimiter;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenSigner: TokenSigner,
    rateLimiter?: LoginRateLimiter,
  ) {
    this.rateLimiter = rateLimiter ?? new NoopRateLimiter();
  }

  async execute(command: LoginCommand): Promise<LoginUseCaseResult> {
    // 1. Bloqueio da janela vale ANTES das credenciais (AC14/RN13).
    if (await this.rateLimiter.isBlocked(command.clientId)) {
      const retryAfter = await this.rateLimiter.retryAfterSeconds(
        command.clientId,
      );
      return {
        ok: false,
        reason: 'rate-limited',
        retryAfterSeconds: retryAfter,
      };
    }

    // 2. Busca do usuário (porta de persistência).
    const user: User | null = await this.userRepository.findByUsername(
      command.username,
    );

    // 3. Usuário inexistente — mesmo resultado genérico de senha errada (RN7).
    //    T7: comparar senha contra hash bcrypt real de um segredo aleatório
    //    fixo, gerado com o mesmo `AUTH_PASSWORD_HASH_COST` — tempo de comparação
    //    idêntico ao caminho real (🟡-3). Registrar a falha no rate limiter
    //    como qualquer outra senha errada.
    if (!user) {
      // Gera/hash dummy de um segredo fixo, usando o mesmo custo de bcrypt do
      // sistema. O segredo é lido de AUTH_DUMMY_PASSWORD_SECRET (ou fallback).
      const dummySecret = process.env['AUTH_DUMMY_PASSWORD_SECRET'] ?? 'lista-de-compras-dummy-secret-2026';
      const dummyHash = await this.passwordHasher.hash(dummySecret);
      await this.passwordHasher.verify(command.password, dummyHash);
      await this.rateLimiter.registerFailure(command.clientId);
      return { ok: false, reason: 'invalid-credentials' };
    }

    // 4. Comparação do hash (RN4: só hash é armazenado/verificado).
    const passwordMatches = await this.passwordHasher.verify(
      command.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      await this.rateLimiter.registerFailure(command.clientId);
      return { ok: false, reason: 'invalid-credentials' };
    }

    // 5. Sucesso: zera o contador do cliente e assina o JWT de 24h (RN5/RN11).
    await this.rateLimiter.reset(command.clientId);
    const accessToken = await this.tokenSigner.sign(user);
    return { ok: true, accessToken, expiresIn: JWT_TTL_SECONDS };
  }
}
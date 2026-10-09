import { User } from '../../domain/user';
import { LoginRateLimiter } from '../ports/login-rate-limiter.port';
import { PasswordHasher } from '../ports/password-hasher.port';
import {
  JWT_TTL_SECONDS,
  TokenSigner,
} from '../ports/token-signer.port';
import { UserRepository } from '../ports/user-repository.port';

export interface LoginCommand {
  username: string;
  password: string;
  /** Id do cliente no rate limiter (ex.: IP na v1 local). */
  clientId: string;
}

export type LoginFailureReason = 'invalid-credentials' | 'rate-limited';

/** `retryAfterSeconds` preenchido quando `reason === 'rate-limited'` (header Retry-After). */
export type LoginUseCaseResult =
  | { ok: true; accessToken: string; expiresIn: number }
  | {
      ok: false;
      reason: LoginFailureReason;
      retryAfterSeconds?: number;
    };

/** Fallback para testes unitários isolados que não exercitam rate limit. */
class NoopRateLimiter implements LoginRateLimiter {
  async isBlocked(_clientId: string): Promise<boolean> {
    return false;
  }
  async registerFailure(_clientId: string): Promise<void> {
    // no-op
  }
  async reset(_clientId: string): Promise<void> {
    // no-op
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
    // Bloqueio da janela vale antes das credenciais (AC-14).
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

    const user: User | null = await this.userRepository.findByUsername(
      command.username,
    );

    if (!user) {
      // Mesmo custo de verify + rate limit que senha errada (RN7 / anti-enumeração).
      const dummySecret =
        process.env['AUTH_DUMMY_PASSWORD_SECRET'] ??
        'lista-de-compras-dummy-secret-2026';
      const dummyHash = await this.passwordHasher.hash(dummySecret);
      await this.passwordHasher.verify(command.password, dummyHash);
      await this.rateLimiter.registerFailure(command.clientId);
      return { ok: false, reason: 'invalid-credentials' };
    }

    const passwordMatches = await this.passwordHasher.verify(
      command.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      await this.rateLimiter.registerFailure(command.clientId);
      return { ok: false, reason: 'invalid-credentials' };
    }

    await this.rateLimiter.reset(command.clientId);
    const accessToken = await this.tokenSigner.sign(user);
    return { ok: true, accessToken, expiresIn: JWT_TTL_SECONDS };
  }
}

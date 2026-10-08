// Módulo da feature login: wiring do controller (borda HTTP) com o caso de
// uso e as portas/adaptadores de T5. A política de rate limit (429) entra na
// T7 — o MemoryRateLimiter substitui o NoopRateLimiter do T6, implementando
// a port `LoginRateLimiter` com política em memória por IP, relógio injetável
// e configuração por env (AUTH_RATE_LIMIT_MAX_FAILURES / AUTH_RATE_LIMIT_WINDOW_MS).
// Quando a T7 estiver completa, este adaptador será injetado automaticamente no
// LoginUseCase, substituindo o no-op.
import { Module } from '@nestjs/common';
import { LoginRateLimiter } from '../application/ports/login-rate-limiter.port';
import { PasswordHasher } from '../application/ports/password-hasher.port';
import { TokenSigner } from '../application/ports/token-signer.port';
import { UserRepository } from '../application/ports/user-repository.port';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { MemoryRateLimiter } from '../infrastructure/memory-rate-limiter';
import { PasswordHasherModule } from '../infrastructure/auth/password-hasher.module';
import { TokenSignerModule } from '../infrastructure/auth/token-signer.module';
import { UserRepositoryModule } from '../infrastructure/persistence/user-repository.module';
import { AuthController } from './auth.controller';
import { HttpExceptionFilter } from './http-exception.filter';

@Module({
  imports: [UserRepositoryModule, PasswordHasherModule, TokenSignerModule],
  controllers: [AuthController],
  providers: [
    {
      provide: LoginRateLimiter,
      useClass: MemoryRateLimiter,
    },
    {
      provide: LoginUseCase,
      inject: [UserRepository, PasswordHasher, TokenSigner, LoginRateLimiter],
      useFactory: (
        userRepository: UserRepository,
        passwordHasher: PasswordHasher,
        tokenSigner: TokenSigner,
        rateLimiter: LoginRateLimiter,
      ) => new LoginUseCase(userRepository, passwordHasher, tokenSigner, rateLimiter),
    },
    // Filtro global para garantir envelope canônico de erro em JSON malformado
    // (T3/🟠-1): converte a mensagem do Fastify para o envelope canônico.
    HttpExceptionFilter,
  ],
})
export class AuthModule {}
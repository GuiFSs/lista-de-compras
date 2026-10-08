import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth.module';
import { PasswordHasherModule } from '../infrastructure/auth/password-hasher.module';
import { TokenSignerModule } from '../infrastructure/auth/token-signer.module';
import { UserRepositoryModule } from '../infrastructure/persistence/user-repository.module';

/**
 * Composition root do auth-service (microserviço de autenticação).
 *
 * T5 entregou a fundação: ports + adaptadores (UserRepository/Drizzle,
 * PasswordHasher/bcryptjs, TokenSigner/jose) e o núcleo de DI. T6 adiciona o
 * endpoint `POST /api/auth/login` (AuthModule: controller + LoginUseCase).
 * As tarefas seguintes usam esta base: T7 (rate limit) e T8 (seed). Os casos
 * de uso e o domínio ficam em `src/application` e `src/domain` e não dependem
 * do NestJS (hexagonal).
 */
@Module({
  imports: [
    // Lê variáveis de ambiente do `.env` da raiz do workspace (ver .env.example).
    // Variáveis do serviço são prefixadas AUTH_* (ADR 0006).
    ConfigModule.forRoot({ isGlobal: true }),
    // Persistência: cliente Drizzle + adaptador DrizzleUserRepository.
    UserRepositoryModule,
    // Hash de senha (bcryptjs, custo AUTH_PASSWORD_HASH_COST).
    PasswordHasherModule,
    // Assinatura de JWT (jose RS256, AUTH_JWT_ISSUER + AUTH_JWT_PRIVATE_KEY_B64).
    TokenSignerModule,
    // Endpoint de login (T6): controller + LoginUseCase.
    AuthModule,
  ],
})
export class AppModule {}
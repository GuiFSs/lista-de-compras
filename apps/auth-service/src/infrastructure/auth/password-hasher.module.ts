import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordHasher } from '../../application/ports/password-hasher.port';
import { BcryptPasswordHasher } from './password-hasher';

/**
 * Wiring do port PasswordHasher para o adaptador BcryptPasswordHasher.
 * O custo vem de AUTH_PASSWORD_HASH_COST (default 12 — PLAN.md); testes
 * usam custo baixo via test-setup.
 */
@Module({
  providers: [
    {
      provide: PasswordHasher,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new BcryptPasswordHasher(Number(config.get('AUTH_PASSWORD_HASH_COST') ?? 12)),
    },
  ],
  exports: [PasswordHasher],
})
export class PasswordHasherModule {}
// Módulo da borda HTTP de autenticação do shopping-list-service.
//
// Registra o `JwtAuthGuard` como APP_GUARD global: toda rota do serviço
// exige JWT válido (RN12/AC-15), exceto rotas anotadas com `@Public()` (na
// v1 nenhuma usa — 🟡-2). O guard lê `AUTH_JWT_PUBLIC_KEY_B64` e
// `AUTH_JWT_ISSUER` do `.env` da raiz (ConfigModule global, ADR 0004).
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class JwtAuthModule {}
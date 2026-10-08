import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrizzleModule } from '../infrastructure/persistence/drizzle/drizzle.module';
import { JwtAuthModule } from '../api/http/auth/jwt-auth.module';

/**
 * Composition root do serviço de lista de compras.
 * Os casos de uso e o domínio ficam em `src/application` e `src/domain`
 * e não dependem do NestJS (arquitetura hexagonal - ADR 0001/0004).
 *
 * `JwtAuthModule` registra o guard global de autenticação (RN12/AC15 —
 * ADR 0007): toda rota exige JWT válido; falha → 401 uniforme.
 */
@Module({
  imports: [
    // Lê variáveis de ambiente do `.env` da raiz do workspace (ver .env.example).
    ConfigModule.forRoot({ isGlobal: true }),
    DrizzleModule,
    // Borda HTTP de autenticação: APP_GUARD global (validação local do JWT).
    JwtAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

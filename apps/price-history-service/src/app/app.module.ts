import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrizzleModule } from '../infrastructure/persistence/drizzle/drizzle.module';
import { JwtAuthModule } from '../api/http/auth/jwt-auth.module';
import { PriceHistoryModule } from '../api/http/price-history/price-history.module';

/**
 * Composition root do price-history-service.
 * Domínio e casos de uso ficam em `src/domain` / `src/application`
 * sem depender do NestJS (ADR 0001).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DrizzleModule,
    // Guard global JWT (ADR 0007) — mesma chave pública do auth-service.
    JwtAuthModule,
    PriceHistoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

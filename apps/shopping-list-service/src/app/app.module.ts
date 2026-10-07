import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrizzleModule } from '../infrastructure/persistence/drizzle/drizzle.module';

/**
 * Composition root do serviço de lista de compras.
 * Os casos de uso e o domínio ficam em `src/application` e `src/domain`
 * e não dependem do NestJS (arquitetura hexagonal - ADR 0001/0004).
 */
@Module({
  imports: [
    // Lê variáveis de ambiente do `.env` da raiz do workspace (ver .env.example).
    ConfigModule.forRoot({ isGlobal: true }),
    DrizzleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

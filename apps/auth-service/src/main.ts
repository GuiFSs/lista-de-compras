import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app/app.module';
import { configureApp } from './app/configure-app';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  // Prefixo global `api` + CORS da PWA (ADR 0006) + parser JSON
  // que garante o envelope canônico em erros de parse do corpo
  // (T3/🟠-1) — mesma configuração usada nos testes (inject).
  await configureApp(app);
  const config = app.get(ConfigService);
  // AUTH_API_PORT e não PORT/API_PORT: variáveis de serviço têm prefixo
  // por serviço (ADR 0006); o Nx injeta o .env da raiz em todos os targets.
  const port = config.get<number>('AUTH_API_PORT') ?? 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/api`,
  );
}

bootstrap();
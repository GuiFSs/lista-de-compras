import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { config as loadEnv } from 'dotenv';
import { AppModule } from './app/app.module';
import { configureApp } from './app/configure-app';

// Nx injeta o `.env` no processo pai uma vez; sem override, mudar
// SHOPPING_LIST_GEMINI_* no arquivo não chega ao Nest no hot-reload.
loadEnv({ path: resolve(process.cwd(), '.env'), override: true });

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  // Prefixo global `api` + CORS da PWA (ADR 0009) — mesma configuração usada
  // pelos testes de integração (`inject`).
  await configureApp(app);
  const config = app.get(ConfigService);
  // API_PORT e não PORT: o Nx carrega o .env da raiz para todos os targets e
  // o dev server do Angular trata PORT como a própria porta (monorepo).
  const port = config.get<number>('API_PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(
    `🚀 Application is running on: http://0.0.0.0:${port}/api`,
  );
}

bootstrap();

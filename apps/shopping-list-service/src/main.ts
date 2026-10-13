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
  // Prefixo global `api` + CORS da PWA (ADR 0009) — mesma configuração usada
  // pelos testes de integração (`inject`).
  await configureApp(app);
  const config = app.get(ConfigService);
  // API_PORT e não PORT: o Nx carrega o .env da raiz para todos os targets e
  // o dev server do Angular trata PORT como a própria porta (monorepo).
  const port = config.get<number>('API_PORT') ?? 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/api`,
  );
}

bootstrap();

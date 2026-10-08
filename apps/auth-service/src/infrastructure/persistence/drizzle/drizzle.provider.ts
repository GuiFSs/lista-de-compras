import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDb } from './client';

/**
 * Token de injeção do cliente Drizzle.
 * Casos de uso recebem a port; a infraestrutura (Drizzle/Postgres)
 * é o adaptador que implementa essa port.
 */
export const DRIZZLE = Symbol('DRIZZLE');

export const drizzleProvider: Provider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    createDb(config.getOrThrow('AUTH_DATABASE_URL')),
};
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDb } from './client';

/** Token de injeção do cliente Drizzle. */
export const DRIZZLE = Symbol('DRIZZLE');

export const drizzleProvider: Provider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    createDb(config.getOrThrow('PRICE_HISTORY_DATABASE_URL')),
};

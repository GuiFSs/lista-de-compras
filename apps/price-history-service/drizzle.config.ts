import type { Config } from 'drizzle-kit';

export default {
  schema: './src/infrastructure/persistence/drizzle/schema/*',
  out: './src/infrastructure/persistence/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Prefixo por serviço (ADR 0006 / 0010): nunca DATABASE_URL genérico.
    url: process.env.PRICE_HISTORY_DATABASE_URL ?? '',
  },
} satisfies Config;

import type { Config } from 'drizzle-kit';

export default {
  schema: './src/infrastructure/persistence/drizzle/schema/*',
  out: './src/infrastructure/persistence/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Prefixo por serviço (ADR 0006): AUTH_DATABASE_URL, nunca DATABASE_URL.
    url: process.env.AUTH_DATABASE_URL ?? '',
  },
} satisfies Config;
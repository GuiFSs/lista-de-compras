import type { Config } from 'drizzle-kit';

export default {
  schema: './src/infrastructure/persistence/drizzle/schema/*',
  out: './src/infrastructure/persistence/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
} satisfies Config;

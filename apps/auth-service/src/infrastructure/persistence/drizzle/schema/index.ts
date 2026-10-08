// Schema Drizzle do auth-service — tabela `users` (banco lógico `auth`,
// dono exclusivo: auth-service — RN6/ADR 0001).
//
// Espelha o formato definido no PLAN.md (T5): id uuid pk default
// gen_random_uuid(), username text unique not null, password_hash text not
// null, created_at timestamptz default now(), updated_at timestamptz.
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  // RN4/AC8: apenas o hash bcrypt (nunca o valor puro).
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export type UserRow = typeof users.$inferSelect;
#!/usr/bin/env tsx
/**
 * Seed da conta única local (RN3/DE6 — PLAN T8), executado por
 * `nx run auth-service:seed` (target `seed` com runner tsx no project.json).
 *
 * - Fonte de verdade: o `.env` da RAIZ do monorepo (gitignored, ADR 0004),
 *   lido via `process.loadEnvFile` (Node >= 21 — sem dependência nova).
 * - `AUTH_SEED_USERNAME` (default `lista` no .env.example) e
 *   `AUTH_SEED_PASSWORD` definem a conta única v1 (RN8).
 * - Aborta com mensagem clara se `AUTH_SEED_PASSWORD` estiver vazia/ausente
 *   (proteção do AC7: nunca semear senha vazia nem `undefined`).
 * - Aplica bcrypt no custo `AUTH_PASSWORD_HASH_COST` (RN4/AC8) reutilizando o
 *   adaptador `BcryptPasswordHasher` de T5 — mesma regra do hash do login.
 * - Upsert idempotente por `username` (`ON CONFLICT (username) DO UPDATE`):
 *   re-executar reaplica o hash se a senha do `.env` mudou (`.env` é a fonte
 *   de verdade; o banco nunca guarda texto puro).
 * - Conta única v1 (RN8/🟡-4): também remove linhas `users` fora do usuário
 *   semeado, com log de aviso — evita linha órfã se o usuário mudar entre
 *   execuções.
 * - Logs informam o usuário e a ação; NUNCA a senha (nem o hash) — AC10.
 *
 * Script operacional fora das camadas hexagonais: não é serviço HTTP nem
 * broker (RN13), não roda dentro do Nest — compõe os adaptadores de `src/`
 * (schema Drizzle, cliente `createDb` e hasher) diretamente.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, ne } from 'drizzle-orm';
import { BcryptPasswordHasher } from '../src/infrastructure/auth/password-hasher';
import { createDb } from '../src/infrastructure/persistence/drizzle/client';
import { users } from '../src/infrastructure/persistence/drizzle/schema';

const SCRIPT = '[auth-seed]';

/** Erro fatal: mensagem clara no stderr e saída com código de erro. */
function fail(message: string): never {
  console.error(`${SCRIPT} ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  if (typeof process.loadEnvFile !== 'function') {
    fail(
      'requer Node >= 21 (process.loadEnvFile). Atualize o Node antes de rodar o seed.',
    );
  }

  // O `.env` é o da raiz do monorepo (será o mesmo arquivo que o Nx injeta
  // nos targets): apps/auth-service/scripts/seed.ts -> três pastas acima.
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) {
    fail(
      `não encontrei o .env na raiz do projeto (verifiquei em: ${envPath}). ` +
        'Copie .env.example para .env e defina AUTH_SEED_PASSWORD ' +
        '(senha local, nunca versionada — AC7).',
    );
  }
  // Carrega o `.env` da raiz. Variáveis já presentes no ambiente (ex.: as
  // injetadas pelo Nx) têm precedência — a origem é o mesmo arquivo.
  process.loadEnvFile(envPath);

  const username = (process.env.AUTH_SEED_USERNAME ?? '').trim() || 'lista';
  const password = process.env.AUTH_SEED_PASSWORD ?? '';
  const cost = Number.parseInt(process.env.AUTH_PASSWORD_HASH_COST ?? '12', 10);

  // AC7: senha vazia/ausente aborta — `.env` parcial não gera conta inútil.
  if (!password.trim()) {
    fail(
      'AUTH_SEED_PASSWORD está vazia ou ausente no `.env` da raiz. ' +
        'Defina uma senha local antes de semear (RN4/AC7).',
    );
  }
  if (!Number.isInteger(cost) || cost < 4 || cost > 31) {
    fail(
      `AUTH_PASSWORD_HASH_COST inválido no .env (recebido: "${process.env.AUTH_PASSWORD_HASH_COST}"). ` +
        'Use um inteiro entre 4 e 31 (default 12).',
    );
  }

  const databaseUrl = process.env.AUTH_DATABASE_URL;
  if (!databaseUrl) {
    fail(
      'AUTH_DATABASE_URL ausente no `.env` da raiz (banco lógico `auth` — RN6/ADR 0004).',
    );
  }

  const db = createDb(databaseUrl);
  try {
    // 1) Conta única v1 (RN8/🟡-4): remove linhas fora do usuário semeado,
    //    mantendo o `.env` como fonte de verdade — evita linha órfã se o
    //    usuário semeado mudar entre execuções.
    const removed = await db.delete(users).where(ne(users.username, username));
    if ((removed.rowCount ?? 0) > 0) {
      console.warn(
        `${SCRIPT} aviso: removidas ${removed.rowCount} linha(s) de usuário(s) ` +
          `fora de "${username}" (conta única v1 — RN8).`,
      );
    } else {
      console.log(`${SCRIPT} nenhuma linha fora de "${username}" para remover.`);
    }

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    // 2) RN4/AC8: para o banco vai apenas o hash bcrypt — nunca o valor puro.
    const passwordHash = await new BcryptPasswordHasher(cost).hash(password);

    // 3) Upsert idempotente por username: re-executar reaplica o hash se a
    //    senha do `.env` mudou (`.env` é a fonte de verdade local).
    await db
      .insert(users)
      .values({ username, passwordHash })
      .onConflictDoUpdate({
        target: users.username,
        set: { passwordHash, updatedAt: new Date() },
      });

    // AC10: log com o usuário e a ação — NUNCA a senha (nem o hash).
    console.log(
      `${SCRIPT} conta única semeada com sucesso ` +
        `(usuário: "${username}"; linha ${existing ? 'atualizada' : 'inserida'}).`,
    );
  } finally {
    await db.$client.end();
  }
}

main().catch((error: unknown) => {
  fail(
    `falha inesperada: ${error instanceof Error ? error.message : String(error)}`,
  );
});
// Entidade do domínio de autenticação — pura, sem dependência de framework,
// banco ou HTTP (ADR 0001: arquitetura hexagonal).
//
// Espelha a tabela `users` (infrastructure/persistence/drizzle/schema):
// o domínio define o formato, o adaptador Drizzle faz o mapeamento.

export interface User {
  /** uuid gerado pelo banco (`gen_random_uuid()`). */
  id: string;
  /** Nome de usuário único (RN1). */
  username: string;
  /** Hash bcrypt da senha — nunca o valor puro (RN4/AC8). */
  passwordHash: string;
  createdAt: Date;
  /** Atualizado pelo upsert do seed; nulo enquanto nunca atualizado. */
  updatedAt: Date | null;
}
export interface User {
  /** uuid gerado pelo banco (`gen_random_uuid()`). */
  id: string;
  username: string;
  /** Hash bcrypt — nunca a senha em texto puro. */
  passwordHash: string;
  createdAt: Date;
  /** Nulo enquanto nunca atualizado (ex.: seed). */
  updatedAt: Date | null;
}

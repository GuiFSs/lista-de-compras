// Port de hash de senha (lado da aplicação).
//
// RN4: a senha nunca é guardada em texto puro — apenas hash. O algoritmo
// concreto (bcryptjs, custo `AUTH_PASSWORD_HASH_COST`) é um adaptador em
// `src/infrastructure/auth`; trocar de algoritmo não toca nos casos de uso.
export abstract class PasswordHasher {
  /** Gera o hash de uma senha (uso: seed da conta única — T8). */
  abstract hash(password: string): Promise<string>;

  /**
   * Compara uma senha em texto puro com um hash armazenado.
   * Nunca deve distinguir "usuário inexistente" de "senha errada" por
   * timing: com usuário inexistente o caso de uso compara contra um
   * hash dummy do mesmo custo (RN7/🟡-3, T7).
   */
  abstract verify(password: string, hash: string): Promise<boolean>;
}
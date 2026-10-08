// Port da persistência de usuários (lado da aplicação).
//
// Port = contrato exigido pelos casos de uso; a implementação concreta
// (adaptador Drizzle) vive em `src/infrastructure`. A port é uma classe
// abstrata pura — sem importar NestJS — e também serve de token de
// injeção de dependência do Nest (padrão do ecossistema p/ interface-like).
import { User } from '../../domain/user';

export abstract class UserRepository {
  /**
   * Busca um usuário pelo nome de usuário (username é unique — RN8).
   * Retorna `null` quando não existe; o LoginUseCase trata o `null`
   * com o mesmo erro genérico de senha errada (RN7, hash dummy — T7).
   */
  abstract findByUsername(username: string): Promise<User | null>;
}
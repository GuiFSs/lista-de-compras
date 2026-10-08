// Adaptador do port PasswordHasher usando bcryptjs.
//
// bcryptjs é implementação 100% JavaScript (sem build nativo — lição do
// Windows/OneDrive) com o MESMO algoritmo/custo do bcrypt nativo (PLAN.md);
// o custo vem de `AUTH_PASSWORD_HASH_COST` (default 12, OWASP >= 10).
import * as bcrypt from 'bcryptjs';
import { PasswordHasher } from '../../application/ports/password-hasher.port';

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly cost: number) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.cost);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
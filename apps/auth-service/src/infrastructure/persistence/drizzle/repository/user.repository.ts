// Adaptador do port UserRepository usando Drizzle (banco lógico `auth`).
//
// O auth-service é dono exclusivo dos dados de autenticação (RN6/ADR 0001):
// nenhum outro serviço lê este banco. O domínio (src/domain) e os casos de
// uso (src/application) dependem da port, não deste adaptador.
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { User } from '../../../../domain/user';
import { UserRepository } from '../../../../application/ports/user-repository.port';
import { DRIZZLE } from '../drizzle.provider';
import { AuthDb } from '../client';
import { users } from '../schema';

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AuthDb) {}

  async findByUsername(username: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
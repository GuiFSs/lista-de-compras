import { Module } from '@nestjs/common';
import { UserRepository } from '../../application/ports/user-repository.port';
import { DrizzleModule } from './drizzle/drizzle.module';
import { DrizzleUserRepository } from './drizzle/repository/user.repository';

/**
 * Wiring do port UserRepository para o adaptador Drizzle.
 * Depende do DrizzleModule (cliente + schema do banco `auth`).
 */
@Module({
  imports: [DrizzleModule],
  providers: [
    { provide: UserRepository, useClass: DrizzleUserRepository },
  ],
  exports: [UserRepository],
})
export class UserRepositoryModule {}
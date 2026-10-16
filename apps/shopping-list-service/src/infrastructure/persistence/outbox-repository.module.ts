import { Module } from '@nestjs/common';
import { OutboxRepository } from '../../application/ports/outbox-repository.port';
import { DrizzleModule } from './drizzle/drizzle.module';
import { DrizzleOutboxRepository } from './drizzle/repository/outbox.repository';

/**
 * Wiring do port OutboxRepository para o adaptador Drizzle.
 * Depende do DrizzleModule (cliente do banco `shopping_list`).
 */
@Module({
  imports: [DrizzleModule],
  providers: [
    { provide: OutboxRepository, useClass: DrizzleOutboxRepository },
  ],
  exports: [OutboxRepository],
})
export class OutboxRepositoryModule {}

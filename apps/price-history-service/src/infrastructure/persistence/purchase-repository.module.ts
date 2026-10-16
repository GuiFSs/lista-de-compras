import { Module } from '@nestjs/common';
import { PurchaseRepository } from '../../application/ports/purchase-repository.port';
import { DrizzleModule } from './drizzle/drizzle.module';
import { DrizzlePurchaseRepository } from './drizzle/repository/purchase.repository';

/**
 * Wiring do port PurchaseRepository para o adaptador Drizzle.
 * Depende do DrizzleModule (cliente + schema do banco `price_history`).
 */
@Module({
  imports: [DrizzleModule],
  providers: [
    { provide: PurchaseRepository, useClass: DrizzlePurchaseRepository },
  ],
  exports: [PurchaseRepository],
})
export class PurchaseRepositoryModule {}

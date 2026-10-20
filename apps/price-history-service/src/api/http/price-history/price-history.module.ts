import { Module } from '@nestjs/common';
import {
  GetLowestPricesByItemUseCase,
  GetPurchaseUseCase,
  ListLowestPricesUseCase,
  ListPurchasesUseCase,
} from '../../../application';
import { PurchaseRepository } from '../../../application/ports/purchase-repository.port';
import { PurchaseRepositoryModule } from '../../../infrastructure/persistence/purchase-repository.module';
import { PriceHistoryController } from './price-history.controller';

/**
 * Borda HTTP do histórico. Prova os casos de uso (framework-free) via
 * `useFactory`, ligando-os ao port `PurchaseRepository` — mesmo padrão do
 * `ShoppingListModule`. `IngestPurchaseUseCase` fica para o módulo do
 * consumidor (T-09), que também injeta a própria port.
 */
@Module({
  imports: [PurchaseRepositoryModule],
  controllers: [PriceHistoryController],
  providers: [
    {
      provide: ListPurchasesUseCase,
      inject: [PurchaseRepository],
      useFactory: (repository: PurchaseRepository) =>
        new ListPurchasesUseCase(repository),
    },
    {
      provide: GetPurchaseUseCase,
      inject: [PurchaseRepository],
      useFactory: (repository: PurchaseRepository) =>
        new GetPurchaseUseCase(repository),
    },
    {
      provide: ListLowestPricesUseCase,
      inject: [PurchaseRepository],
      useFactory: (repository: PurchaseRepository) =>
        new ListLowestPricesUseCase(repository),
    },
    {
      provide: GetLowestPricesByItemUseCase,
      inject: [PurchaseRepository],
      useFactory: (repository: PurchaseRepository) =>
        new GetLowestPricesByItemUseCase(repository),
    },
  ],
})
export class PriceHistoryModule {}

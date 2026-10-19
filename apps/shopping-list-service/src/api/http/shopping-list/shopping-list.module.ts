import { Module } from '@nestjs/common';
import {
  CheckoutShoppingListUseCase,
  CreateShoppingListItemUseCase,
  DeleteShoppingListItemUseCase,
  GetShoppingListUseCase,
  MarkItemPurchasedUseCase,
  RestoreShoppingListItemUseCase,
  UnmarkItemPurchasedUseCase,
  UpdateShoppingListItemUseCase,
} from '../../../application';
import { OutboxRepository } from '../../../application/ports/outbox-repository.port';
import { ShoppingListRepository } from '../../../application/ports/shopping-list-repository.port';
import { MessagingModule } from '../../../infrastructure/messaging/messaging.module';
import { OutboxRepositoryModule } from '../../../infrastructure/persistence/outbox-repository.module';
import { ShoppingListRepositoryModule } from '../../../infrastructure/persistence/shopping-list-repository.module';
import { ShoppingListController } from './shopping-list.controller';

/**
 * Borda HTTP da lista ativa. Prova os casos de uso (framework-free) via
 * `useFactory`, ligando-os aos ports `ShoppingListRepository` e
 * `OutboxRepository` (checkout transacional — CD-06). `MessagingModule` entra
 * para o processo publique o outbox com retry (T-12); o checkout em si não
 * fala com o broker — broker fora não falha o HTTP.
 */
@Module({
  imports: [
    ShoppingListRepositoryModule,
    OutboxRepositoryModule,
    MessagingModule,
  ],
  controllers: [ShoppingListController],
  providers: [
    {
      provide: GetShoppingListUseCase,
      inject: [ShoppingListRepository],
      useFactory: (repository: ShoppingListRepository) =>
        new GetShoppingListUseCase(repository),
    },
    {
      provide: CreateShoppingListItemUseCase,
      inject: [ShoppingListRepository],
      useFactory: (repository: ShoppingListRepository) =>
        new CreateShoppingListItemUseCase(repository),
    },
    {
      provide: UpdateShoppingListItemUseCase,
      inject: [ShoppingListRepository],
      useFactory: (repository: ShoppingListRepository) =>
        new UpdateShoppingListItemUseCase(repository),
    },
    {
      provide: DeleteShoppingListItemUseCase,
      inject: [ShoppingListRepository],
      useFactory: (repository: ShoppingListRepository) =>
        new DeleteShoppingListItemUseCase(repository),
    },
    {
      provide: RestoreShoppingListItemUseCase,
      inject: [ShoppingListRepository],
      useFactory: (repository: ShoppingListRepository) =>
        new RestoreShoppingListItemUseCase(repository),
    },
    {
      provide: MarkItemPurchasedUseCase,
      inject: [ShoppingListRepository],
      useFactory: (repository: ShoppingListRepository) =>
        new MarkItemPurchasedUseCase(repository),
    },
    {
      provide: UnmarkItemPurchasedUseCase,
      inject: [ShoppingListRepository],
      useFactory: (repository: ShoppingListRepository) =>
        new UnmarkItemPurchasedUseCase(repository),
    },
    {
      provide: CheckoutShoppingListUseCase,
      inject: [ShoppingListRepository, OutboxRepository],
      useFactory: (
        repository: ShoppingListRepository,
        outbox: OutboxRepository,
      ) => new CheckoutShoppingListUseCase(repository, outbox),
    },
  ],
})
export class ShoppingListModule {}

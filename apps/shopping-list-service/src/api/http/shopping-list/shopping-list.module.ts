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
import { ShoppingListRepository } from '../../../application/ports/shopping-list-repository.port';
import { ShoppingListRepositoryModule } from '../../../infrastructure/persistence/shopping-list-repository.module';
import { ShoppingListController } from './shopping-list.controller';

/**
 * Borda HTTP da lista ativa. Prova os casos de uso (framework-free) via
 * `useFactory`, ligando-os ao port `ShoppingListRepository`.
 */
@Module({
  imports: [ShoppingListRepositoryModule],
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
      inject: [ShoppingListRepository],
      useFactory: (repository: ShoppingListRepository) =>
        new CheckoutShoppingListUseCase(repository),
    },
  ],
})
export class ShoppingListModule {}

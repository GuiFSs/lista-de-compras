import { Module } from '@nestjs/common';
import { ShoppingListRepository } from '../../application/ports/shopping-list-repository.port';
import { DrizzleModule } from './drizzle/drizzle.module';
import { DrizzleShoppingListRepository } from './drizzle/repository/shopping-list.repository';

/**
 * Wiring do port ShoppingListRepository para o adaptador Drizzle.
 * Depende do DrizzleModule (cliente + schema do banco `shopping_list`).
 */
@Module({
  imports: [DrizzleModule],
  providers: [
    { provide: ShoppingListRepository, useClass: DrizzleShoppingListRepository },
  ],
  exports: [ShoppingListRepository],
})
export class ShoppingListRepositoryModule {}

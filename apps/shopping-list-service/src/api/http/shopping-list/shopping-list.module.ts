import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApplyReceiptPurchaseUseCase,
  CheckoutShoppingListUseCase,
  CreateShoppingListItemUseCase,
  DeleteShoppingListItemUseCase,
  GetShoppingListUseCase,
  MarkItemPurchasedUseCase,
  RecognizeReceiptUseCase,
  RestoreShoppingListItemUseCase,
  UnmarkItemPurchasedUseCase,
  UpdateShoppingListItemUseCase,
} from '../../../application';
import { OutboxRepository } from '../../../application/ports/outbox-repository.port';
import { ReceiptRecognizer } from '../../../application/ports/receipt-recognizer.port';
import { ShoppingListRepository } from '../../../application/ports/shopping-list-repository.port';
import { GeminiReceiptRecognizer } from '../../../infrastructure/ai';
import { MessagingModule } from '../../../infrastructure/messaging/messaging.module';
import { OutboxRepositoryModule } from '../../../infrastructure/persistence/outbox-repository.module';
import { ShoppingListRepositoryModule } from '../../../infrastructure/persistence/shopping-list-repository.module';
import { ShoppingListController } from './shopping-list.controller';

@Module({
  imports: [
    ShoppingListRepositoryModule,
    OutboxRepositoryModule,
    MessagingModule,
  ],
  controllers: [ShoppingListController],
  providers: [
    {
      provide: ReceiptRecognizer,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new GeminiReceiptRecognizer({
          apiKey:
            config.get<string>('SHOPPING_LIST_GEMINI_API_KEY') ??
            config.get<string>('GEMINI_API_KEY') ??
            '',
          model: config.get<string>('SHOPPING_LIST_GEMINI_MODEL'),
        }),
    },
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
    {
      provide: RecognizeReceiptUseCase,
      inject: [ReceiptRecognizer],
      useFactory: (recognizer: ReceiptRecognizer) =>
        new RecognizeReceiptUseCase(recognizer),
    },
    {
      provide: ApplyReceiptPurchaseUseCase,
      inject: [ShoppingListRepository],
      useFactory: (repository: ShoppingListRepository) =>
        new ApplyReceiptPurchaseUseCase(repository),
    },
  ],
})
export class ShoppingListModule {}

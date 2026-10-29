import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  Patch,
  PayloadTooLargeException,
  Post,
  Put,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  RecognizeReceiptResponse,
  ShoppingListResponse,
} from '@lista/contracts';
import { RECEIPT_IMAGE_MAX_BYTES } from '@lista/contracts';
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
import type {
  RecognizeReceiptError,
  ShoppingListResult,
} from '../../../application';
import { canonicalError, toHttpException } from './shopping-list-errors';
import {
  INTERNAL_ERROR_MESSAGE,
  RECEIPT_IMAGE_REQUIRED_MESSAGE,
  RECEIPT_IMAGE_TOO_LARGE_MESSAGE,
  RECEIPT_IMAGE_TYPE_INVALID_MESSAGE,
  RECEIPT_MISCONFIGURED_MESSAGE,
  RECEIPT_UNAVAILABLE_MESSAGE,
  RECEIPT_UNREADABLE_MESSAGE,
} from './shopping-list-messages';
import {
  parseApplyReceiptCommand,
  parseCreateItemCommand,
  parseMarkPurchasedCommand,
  parseUpdateItemCommand,
  readCheckoutInput,
} from './shopping-list-request';
import { toShoppingListResponse } from './shopping-list-response.mapper';

/** Sucesso de uma operação: lista ativa completa já ordenada (RN-18). */
type ShoppingListSuccess = Extract<ShoppingListResult, { ok: true }>;

/**
 * Borda HTTP da lista ativa (prefixo global `api`). Só conhece HTTP: valida o
 * formato de entrada, chama os casos de uso e traduz o resultado de negócio no
 * status/envelope do contrato. Toda mutação devolve a lista ativa completa.
 */
@Controller('shopping-list')
export class ShoppingListController {
  private readonly logger = new Logger(ShoppingListController.name);

  constructor(
    private readonly getShoppingList: GetShoppingListUseCase,
    private readonly createItem: CreateShoppingListItemUseCase,
    private readonly updateItem: UpdateShoppingListItemUseCase,
    private readonly deleteItem: DeleteShoppingListItemUseCase,
    private readonly restoreItem: RestoreShoppingListItemUseCase,
    private readonly markItemPurchased: MarkItemPurchasedUseCase,
    private readonly unmarkItemPurchased: UnmarkItemPurchasedUseCase,
    private readonly checkout: CheckoutShoppingListUseCase,
    private readonly recognizeReceipt: RecognizeReceiptUseCase,
    private readonly applyReceiptPurchase: ApplyReceiptPurchaseUseCase,
  ) {}

  @Get()
  async list(): Promise<ShoppingListResponse> {
    try {
      return toShoppingListResponse(await this.getShoppingList.execute());
    } catch (error) {
      throw this.internalError(error);
    }
  }

  @Post('items')
  async create(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<ShoppingListResponse> {
    const command = parseCreateItemCommand(body);
    const result = await this.run(() => this.createItem.execute(command));
    // 201 ao inserir; 200 quando a soma foi aplicada a um item existente (CD-02).
    res.status(result.created === true ? HttpStatus.CREATED : HttpStatus.OK);
    return toShoppingListResponse(result.items);
  }

  @Patch('items/:id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ShoppingListResponse> {
    const command = parseUpdateItemCommand(body, id);
    const result = await this.run(() => this.updateItem.execute(command));
    return toShoppingListResponse(result.items);
  }

  @Delete('items/:id')
  async remove(@Param('id') id: string): Promise<ShoppingListResponse> {
    const result = await this.run(() => this.deleteItem.execute({ id }));
    return toShoppingListResponse(result.items);
  }

  @Post('items/:id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string): Promise<ShoppingListResponse> {
    const result = await this.run(() => this.restoreItem.execute({ id }));
    return toShoppingListResponse(result.items);
  }

  @Put('items/:id/purchase')
  async markPurchased(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ShoppingListResponse> {
    const command = parseMarkPurchasedCommand(body, id);
    const result = await this.run(() => this.markItemPurchased.execute(command));
    return toShoppingListResponse(result.items);
  }

  @Delete('items/:id/purchase')
  async unmarkPurchased(@Param('id') id: string): Promise<ShoppingListResponse> {
    const result = await this.run(() => this.unmarkItemPurchased.execute({ id }));
    return toShoppingListResponse(result.items);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  async concludeCheckout(@Body() body: unknown): Promise<ShoppingListResponse> {
    // Corpo com market/purchaseDate só é exigido pelo domínio quando há ≥1
    // comprado (RN-03); com 0 comprados corpo omitido segue aceito (RN-09).
    const result = await this.run(() =>
      this.checkout.execute(readCheckoutInput(body)),
    );
    return toShoppingListResponse(result.items);
  }

  @Post('receipts/recognize')
  @HttpCode(HttpStatus.OK)
  async recognize(
    @Req() req: FastifyRequest,
  ): Promise<RecognizeReceiptResponse> {
    try {
      const file = await req.file();
      if (file === undefined) {
        throw new BadRequestException(
          canonicalError(HttpStatus.BAD_REQUEST, RECEIPT_IMAGE_REQUIRED_MESSAGE),
        );
      }
      const bytes = await file.toBuffer();
      if (bytes.length > RECEIPT_IMAGE_MAX_BYTES) {
        throw new PayloadTooLargeException(
          canonicalError(HttpStatus.PAYLOAD_TOO_LARGE, RECEIPT_IMAGE_TOO_LARGE_MESSAGE),
        );
      }
      const result = await this.recognizeReceipt.execute({
        bytes,
        mimeType: file.mimetype,
      });
      if (!result.ok) {
        throw this.recognizeHttpError(result.error);
      }
      return result.receipt;
    } catch (error) {
      throw this.internalError(error);
    }
  }

  @Post('receipts/apply')
  @HttpCode(HttpStatus.OK)
  async applyReceipt(@Body() body: unknown): Promise<ShoppingListResponse> {
    const command = parseApplyReceiptCommand(body);
    const result = await this.run(() =>
      this.applyReceiptPurchase.execute(command),
    );
    return toShoppingListResponse(result.items);
  }

  private recognizeHttpError(error: RecognizeReceiptError): HttpException {
    switch (error) {
      case 'image-required':
        return new BadRequestException(
          canonicalError(HttpStatus.BAD_REQUEST, RECEIPT_IMAGE_REQUIRED_MESSAGE),
        );
      case 'image-type-invalid':
        return new BadRequestException(
          canonicalError(
            HttpStatus.BAD_REQUEST,
            RECEIPT_IMAGE_TYPE_INVALID_MESSAGE,
          ),
        );
      case 'image-too-large':
        return new PayloadTooLargeException(
          canonicalError(
            HttpStatus.PAYLOAD_TOO_LARGE,
            RECEIPT_IMAGE_TOO_LARGE_MESSAGE,
          ),
        );
      case 'recognizer-unreadable':
        return new BadRequestException(
          canonicalError(HttpStatus.BAD_REQUEST, RECEIPT_UNREADABLE_MESSAGE),
        );
      case 'recognizer-misconfigured':
        return new ServiceUnavailableException(
          canonicalError(
            HttpStatus.SERVICE_UNAVAILABLE,
            RECEIPT_MISCONFIGURED_MESSAGE,
          ),
        );
      case 'recognizer-unavailable':
        return new ServiceUnavailableException(
          canonicalError(
            HttpStatus.SERVICE_UNAVAILABLE,
            RECEIPT_UNAVAILABLE_MESSAGE,
          ),
        );
    }
  }

  /** Executa o caso de uso e converte falha de negócio em exceção HTTP. */
  private async run(
    operation: () => Promise<ShoppingListResult>,
  ): Promise<ShoppingListSuccess> {
    try {
      const result = await operation();
      if (!result.ok) {
        throw toHttpException(result.error);
      }
      return result;
    } catch (error) {
      throw this.internalError(error);
    }
  }

  private internalError(error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }
    // Detalhe só no log; o corpo 500 é genérico e sem stack (contrato).
    this.logger.error(
      'Falha inesperada na lista de compras',
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
    return new InternalServerErrorException(
      canonicalError(HttpStatus.INTERNAL_SERVER_ERROR, INTERNAL_ERROR_MESSAGE),
    );
  }
}

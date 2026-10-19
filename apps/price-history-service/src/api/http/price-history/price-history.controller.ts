import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  Query,
} from '@nestjs/common';
import type {
  LowestPricesResponse,
  PurchaseDetailResponse,
  PurchaseListResponse,
} from '@lista/contracts';
import {
  GetPurchaseUseCase,
  ListLowestPricesUseCase,
  ListPurchasesUseCase,
} from '../../../application';
import {
  INTERNAL_ERROR_MESSAGE,
  canonicalError,
  purchaseNotFound,
} from './price-history-errors';

/**
 * Borda HTTP do histórico (prefixo global `api`). Só conhece HTTP: chama os
 * casos de uso e traduz o resultado no status/envelope do contrato. Todas as
 * rotas passam pelo guard JWT global (ADR 0007) — nenhuma é `@Public`.
 */
@Controller('price-history')
export class PriceHistoryController {
  private readonly logger = new Logger(PriceHistoryController.name);

  constructor(
    private readonly listPurchases: ListPurchasesUseCase,
    private readonly getPurchase: GetPurchaseUseCase,
    private readonly listLowestPrices: ListLowestPricesUseCase,
  ) {}

  /** GET /purchases — 200 `PurchaseListResponse` (RN-08). */
  @Get('purchases')
  list(): Promise<PurchaseListResponse> {
    return this.safely(() => this.listPurchases.execute());
  }

  /** GET /purchases/:id — 200 detalhe; id inexistente → 404 canônico. */
  @Get('purchases/:id')
  async detail(@Param('id') id: string): Promise<PurchaseDetailResponse> {
    const purchase = await this.safely(() => this.getPurchase.execute(id));
    if (purchase === null) {
      throw purchaseNotFound();
    }
    return purchase;
  }

  /** GET /lowest-prices?q=... — 200 `LowestPricesResponse` (RN-07). */
  @Get('lowest-prices')
  lowest(@Query('q') rawQuery: unknown): Promise<LowestPricesResponse> {
    const query = parseSearchQuery(rawQuery);
    return this.safely(() => this.listLowestPrices.execute(query));
  }

  /** Falha de infra vira 500 canônico; o detalhe só vai para o log (contrato). */
  private async safely<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        'Falha inesperada no histórico de preços',
        error instanceof Error ? (error.stack ?? error.message) : String(error),
      );
      throw new InternalServerErrorException(
        canonicalError(HttpStatus.INTERNAL_SERVER_ERROR, INTERNAL_ERROR_MESSAGE),
      );
    }
  }
}

/**
 * `q` repetida na query chega como array no Fastify — o caso de uso aceita um
 * termo só, então a borda normaliza para `string` (nunca vaza `unknown`).
 */
function parseSearchQuery(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  const [first] = value as unknown[];
  return typeof first === 'string' ? first : undefined;
}

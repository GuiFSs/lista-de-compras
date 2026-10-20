// Mensagens PT do contrato HTTP do histórico (PLAN.md "Contratos" — a borda é
// a única que conhece o envelope; os casos de uso devolvem `null`/lançam).
import { HttpStatus, NotFoundException } from '@nestjs/common';
import type { ApiErrorResponse } from '@lista/contracts';

export const PURCHASE_NOT_FOUND_MESSAGE = 'Compra não encontrada';
export const ITEM_NOT_FOUND_MESSAGE = 'Item não encontrado no histórico';
export const INTERNAL_ERROR_MESSAGE = 'Erro interno';

/** Envelope canônico de erro: `statusCode` e `message` sempre presentes. */
export function canonicalError(
  statusCode: number,
  message: string,
): ApiErrorResponse {
  return { statusCode, message };
}

/** 404 canônico quando `GetPurchaseUseCase` devolve `null`. */
export function purchaseNotFound(): NotFoundException {
  return new NotFoundException(
    canonicalError(HttpStatus.NOT_FOUND, PURCHASE_NOT_FOUND_MESSAGE),
  );
}

/** 404 canônico quando `GetLowestPricesByItemUseCase` devolve `null` (RN-08). */
export function itemNotFound(): NotFoundException {
  return new NotFoundException(
    canonicalError(HttpStatus.NOT_FOUND, ITEM_NOT_FOUND_MESSAGE),
  );
}

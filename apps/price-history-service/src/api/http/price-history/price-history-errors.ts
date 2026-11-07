// Mensagens PT do contrato HTTP do histórico (PLAN.md "Contratos" — a borda é
// a única que conhece o envelope; os casos de uso devolvem `null`/lançam).
import { HttpStatus, NotFoundException, BadRequestException } from '@nestjs/common';
import type { ApiErrorResponse } from '@lista/contracts';
import type { UpdatePurchaseError } from '../../../domain/update-purchase';

export const PURCHASE_NOT_FOUND_MESSAGE = 'Compra não encontrada';
export const ITEM_NOT_FOUND_MESSAGE = 'Item não encontrado no histórico';
export const INTERNAL_ERROR_MESSAGE = 'Erro interno';

const UPDATE_PURCHASE_MESSAGES = {
  'market-required': 'Mercado é obrigatório',
  'purchase-date-required': 'Data da compra é obrigatória',
  'purchase-date-invalid': 'Data da compra inválida',
  'purchase-date-future': 'A data da compra não pode ser futura',
  'items-empty': 'A compra precisa ter pelo menos um item',
  'item-name-required': 'Informe o nome do item',
  'item-quantity-not-positive': 'A quantidade precisa ser maior que zero',
  'item-price-negative': 'O preço por unidade não pode ser negativo',
  'item-unit-invalid': 'Unidade inválida',
  'duplicate-item-name': 'Já existe um item com esse nome nesta compra',
} as const satisfies Record<UpdatePurchaseError, string>;

export function messageForUpdatePurchase(error: UpdatePurchaseError): string {
  return UPDATE_PURCHASE_MESSAGES[error];
}

export function purchaseUpdateRejected(error: UpdatePurchaseError): BadRequestException {
  return new BadRequestException(
    canonicalError(HttpStatus.BAD_REQUEST, messageForUpdatePurchase(error)),
  );
}

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

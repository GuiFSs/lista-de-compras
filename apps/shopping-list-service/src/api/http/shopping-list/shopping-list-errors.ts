import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import type { ApiErrorResponse, DuplicateItemErrorResponse } from '@lista/contracts';
import type { ShoppingListError } from '../../../application';
import {
  DUPLICATE_ITEM_ERROR_CODE,
  ITEM_DUPLICATE_NAME_MESSAGE,
  ITEM_NOT_FOUND_MESSAGE,
  messageForValidationError,
} from './shopping-list-messages';

/** Envelope canônico de erro: `statusCode` e `message` sempre presentes. */
export function canonicalError(
  statusCode: number,
  message: string,
): ApiErrorResponse {
  return { statusCode, message };
}

/**
 * Traduz a falha de negócio (sem status HTTP) no status/mensagem do contrato.
 * `duplicate-item-name` (criação, fluxo) e `name-conflict` (edição, terminal —
 * CD-13) compartilham o mesmo corpo 409 com `duplicateOf`.
 */
export function toHttpException(error: ShoppingListError): HttpException {
  if (error.code === 'validation') {
    return new BadRequestException(
      canonicalError(
        HttpStatus.BAD_REQUEST,
        messageForValidationError(error.error),
      ),
    );
  }
  if (error.code === 'not-found') {
    return new NotFoundException(
      canonicalError(HttpStatus.NOT_FOUND, ITEM_NOT_FOUND_MESSAGE),
    );
  }
  const body: DuplicateItemErrorResponse = {
    statusCode: HttpStatus.CONFLICT,
    message: ITEM_DUPLICATE_NAME_MESSAGE,
    error: DUPLICATE_ITEM_ERROR_CODE,
    duplicateOf: error.duplicateOf,
  };
  return new ConflictException(body);
}

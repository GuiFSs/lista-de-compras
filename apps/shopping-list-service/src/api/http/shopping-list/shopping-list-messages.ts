// Mensagens PT do contrato da lista de compras (fonte única: PLAN.md
// "Contratos", libs/contracts/README.md e `shopping-list.ts`). O domínio devolve
// códigos de validação sem saber HTTP; a borda traduz cada código na mensagem.
import type { ItemValidationError } from '../../../domain/item-validation';

export const ITEM_NAME_REQUIRED_MESSAGE = 'Nome do item é obrigatório';
export const ITEM_QUANTITY_POSITIVE_MESSAGE = 'Quantidade deve ser maior que zero';
export const ITEM_PRICE_NON_NEGATIVE_MESSAGE = 'Preço não pode ser negativo';
export const ITEM_UNIT_INVALID_MESSAGE = 'Unidade inválida';
export const ITEM_NOT_FOUND_MESSAGE = 'Item não encontrado';
export const ITEM_DUPLICATE_NAME_MESSAGE = 'Já existe um item com esse nome';
export const INTERNAL_ERROR_MESSAGE = 'Erro interno';

/** Discriminante do 409 de duplicidade — criação (fluxo) e edição (terminal). */
export const DUPLICATE_ITEM_ERROR_CODE = 'duplicate-item-name';

const VALIDATION_MESSAGES: Record<ItemValidationError, string> = {
  'name-required': ITEM_NAME_REQUIRED_MESSAGE,
  'quantity-not-positive': ITEM_QUANTITY_POSITIVE_MESSAGE,
  'price-negative': ITEM_PRICE_NON_NEGATIVE_MESSAGE,
  'unit-invalid': ITEM_UNIT_INVALID_MESSAGE,
};

export function messageForValidationError(error: ItemValidationError): string {
  return VALIDATION_MESSAGES[error];
}

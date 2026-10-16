import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse, DuplicateItemErrorResponse } from '@lista/contracts';

/** Item que já usa o nome tentado — `duplicateOf` do 409 (CD-02/CD-13). */
export type DuplicateOf = DuplicateItemErrorResponse['duplicateOf'];

const NETWORK_ERROR_MESSAGE = 'Falha de rede. Verifique a conexão e tente novamente.';
const FALLBACK_ERROR_MESSAGE = 'Erro inesperado. Tente novamente.';

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null) return false;
  const envelope = value as { statusCode?: unknown; message?: unknown };
  return typeof envelope.statusCode === 'number' && typeof envelope.message === 'string';
}

/** Mensagem do envelope canônico do serviço; sem detalhe interno (ADR 0007). */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return NETWORK_ERROR_MESSAGE;
    const body: unknown = error.error;
    if (isApiErrorResponse(body)) return body.message;
  }
  return FALLBACK_ERROR_MESSAGE;
}

/** Status 0 = sem resposta do servidor: a mutação pode ter sido aplicada. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 0;
}

/**
 * Extrai o `duplicateOf` do 409 `duplicate-item-name` (criação: pergunta
 * "somar?"; edição: conflito no formulário). `null` para qualquer outro erro —
 * inclusive um 409 que não seja de duplicidade.
 */
export function duplicateOfFromError(error: unknown): DuplicateOf | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null) return null;
  const candidate = body as { error?: unknown; duplicateOf?: unknown };
  if (candidate.error !== 'duplicate-item-name') return null;
  const duplicate = candidate.duplicateOf as { id?: unknown; name?: unknown } | null | undefined;
  if (!duplicate || typeof duplicate.id !== 'string' || typeof duplicate.name !== 'string') {
    return null;
  }
  return { id: duplicate.id, name: duplicate.name };
}

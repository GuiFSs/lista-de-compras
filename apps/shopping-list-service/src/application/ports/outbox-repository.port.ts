import type { PurchaseCompletedEventV1 } from '@lista/contracts';

/** Linha do outbox do ponto de vista da aplicação — o publisher (T-12) a lê. */
export interface OutboxMessage {
  /** UUID da linha — rastreio da tentativa. */
  id: string;
  /** Chave de negócio do evento: uma mensagem por conclusão. */
  completionId: string;
  eventType: string;
  eventVersion: number;
  /** Envelope v1 pronto para serializar no publish. */
  envelope: PurchaseCompletedEventV1;
  createdAt: Date;
  /** null ⇒ pendente de publicação. */
  publishedAt: Date | null;
  /** Tentativas que falharam; o sucesso só preenche `publishedAt`. */
  attempts: number;
  /** Erro da última tentativa falha; limpo quando a publicação tem sucesso. */
  lastError: string | null;
}

/**
 * Port do outbox transacional (lado da aplicação). O adaptador Drizzle vive em
 * `src/infrastructure/persistence`; o caso de uso e o publisher dependem só
 * desta abstração (ADR 0001).
 */
export abstract class OutboxRepository {
  /**
   * Remove os itens comprados e grava a mensagem pendente na MESMA transação
   * Postgres (CD-06 — ressalva da revisão arquitetural): ou os dois persistem,
   * ou nenhum — é o que impede o dual-write quando o banco falha no meio.
   * Chamado só no branch pronto do checkout (≥1 comprado); a publicação é
   * assíncrona e o broker fora não afeta a conclusão.
   *
   * @param purchasedIds ids a remover fisicamente da lista ativa.
   * @param envelope envelope v1; `payload.completionId` vira a chave única.
   */
  abstract deletePurchasedAndEnqueue(
    purchasedIds: readonly string[],
    envelope: PurchaseCompletedEventV1,
  ): Promise<void>;

  /** Pendentes (`publishedAt` null), mais antigas primeiro (FIFO best-effort). */
  abstract findPending(limit?: number): Promise<OutboxMessage[]>;

  /** Sucesso no publish: grava `publishedAt` e limpa `lastError`. */
  abstract markPublished(id: string, publishedAt: Date): Promise<void>;

  /** Falha no publish: incrementa `attempts` e grava `lastError`. */
  abstract recordFailure(id: string, lastError: string): Promise<void>;
}

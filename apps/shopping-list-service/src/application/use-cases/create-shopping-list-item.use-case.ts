import { randomUUID } from 'node:crypto';
import type { DuplicateResolution, ItemUnit } from '@lista/contracts';
import { normalizeItemName } from '../../domain/item-name';
import {
  addPlannedQuantity,
  createShoppingListItem,
} from '../../domain/shopping-list-item';
import type { ShoppingListItem } from '../../domain/shopping-list-item';
import { validateItemFields } from '../../domain/item-validation';
import { ActiveItemNameConflictError } from '../ports/shopping-list-repository.port';
import type { ShoppingListRepository } from '../ports/shopping-list-repository.port';
import { loadActiveItems } from './load-active-items';
import type { ShoppingListResult } from './shopping-list-result';

export interface CreateShoppingListItemCommand {
  name: string;
  plannedQuantity?: number | null;
  unit?: ItemUnit | null;
  plannedPrice?: number | null;
  /** Default `'reject'`; `'sum-planned-quantity'` soma ao item de mesmo nome (CD-02). */
  duplicateResolution?: DuplicateResolution;
}

/**
 * Criar item (`POST /api/shopping-list/items`). Nome existente não gera segundo
 * item: com `sum-planned-quantity` soma a quantidade ao existente; caso
 * contrário devolve conflito de duplicidade (RN-04/CD-02).
 */
export class CreateShoppingListItemUseCase {
  constructor(private readonly repository: ShoppingListRepository) {}

  async execute(
    command: CreateShoppingListItemCommand,
  ): Promise<ShoppingListResult> {
    const validation = validateItemFields(command);
    if (validation !== null) {
      return { ok: false, error: { code: 'validation', error: validation } };
    }

    const nameNormalized = normalizeItemName(command.name);
    const existing = await this.repository.findActiveByNameNormalized(
      nameNormalized,
    );
    if (existing !== null) {
      return this.resolveExisting(existing, command);
    }

    const now = new Date();
    try {
      await this.repository.insert(
        createShoppingListItem({
          id: randomUUID(),
          name: command.name,
          plannedQuantity: command.plannedQuantity ?? null,
          unit: command.unit ?? null,
          plannedPrice: command.plannedPrice ?? null,
          createdAt: now,
        }),
      );
    } catch (error) {
      if (!(error instanceof ActiveItemNameConflictError)) {
        throw error;
      }
      return this.recoverFromConcurrentCreate(nameNormalized, command);
    }
    return {
      ok: true,
      items: await loadActiveItems(this.repository),
      created: true,
    };
  }

  /**
   * Corrida na criação (RN-04/AC-09): entre a leitura e a escrita outro POST
   * gravou o mesmo nome, e o índice único parcial barrou este. Relê uma vez e
   * reaplica a decisão de duplicidade — soma (200) ou recusa (409) —, como no
   * caminho sequencial.
   */
  private async recoverFromConcurrentCreate(
    nameNormalized: string,
    command: CreateShoppingListItemCommand,
  ): Promise<ShoppingListResult> {
    const winner = await this.repository.findActiveByNameNormalized(
      nameNormalized,
    );
    if (winner !== null) {
      return this.resolveExisting(winner, command);
    }
    // Segunda colisão: o vencedor saiu na janela e não há item ativo para somar
    // nem `duplicateOf` real. Degrada para o 409 canônico com o nome pedido —
    // nunca para um 500 genérico (o cliente decide com `duplicateOf.name`).
    return {
      ok: false,
      error: {
        code: 'duplicate-item-name',
        duplicateOf: { id: '', name: command.name.trim() },
      },
    };
  }

  private async resolveExisting(
    existing: ShoppingListItem,
    command: CreateShoppingListItemCommand,
  ): Promise<ShoppingListResult> {
    if (command.duplicateResolution !== 'sum-planned-quantity') {
      return {
        ok: false,
        error: {
          code: 'duplicate-item-name',
          duplicateOf: { id: existing.id, name: existing.name },
        },
      };
    }

    const summed = addPlannedQuantity(
      existing,
      command.plannedQuantity ?? null,
      new Date(),
    );
    if (summed !== existing) {
      await this.repository.update(summed);
    }
    return {
      ok: true,
      items: await loadActiveItems(this.repository),
      created: false,
    };
  }
}

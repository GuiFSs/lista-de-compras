// Port da persistência da lista ativa (lado da aplicação).
//
// A implementação concreta (adaptador Drizzle) vive em `src/infrastructure`;
// o domínio e os casos de uso dependem só desta classe abstrata — que também
// serve de token de injeção do Nest (ADR 0001).
import type { ShoppingListItem } from '../../domain/shopping-list-item';

/**
 * Já existe item ativo com o nome normalizado informado. O adaptador traduz a
 * violação do índice único parcial do banco para este erro; o caso de uso o
 * trata na criação concorrente sem conhecer o driver (ADR 0001).
 */
export class ActiveItemNameConflictError extends Error {
  constructor() {
    super('Já existe um item ativo com este nome');
    this.name = 'ActiveItemNameConflictError';
  }
}

export abstract class ShoppingListRepository {
  /** Itens ativos (`removed_at` nulo) em ordem determinística de criação. */
  abstract findActive(): Promise<ShoppingListItem[]>;

  /**
   * Busca pelo id **incluindo** itens removidos: o Desfazer precisa do item
   * excluído para restaurá-lo com os mesmos dados (RN-08).
   */
  abstract findById(id: string): Promise<ShoppingListItem | null>;

  /**
   * Item ativo com o nome normalizado informado. A normalização é calculada no
   * domínio (RN-02/CD-12) e chega pronta aqui; atende à duplicidade na criação
   * (RN-04) e ao conflito da restauração.
   */
  abstract findActiveByNameNormalized(
    nameNormalized: string,
  ): Promise<ShoppingListItem | null>;

  /**
   * Insere um item já montado pelo domínio.
   * @throws {ActiveItemNameConflictError} quando já existe item ativo com o mesmo nome.
   */
  abstract insert(item: ShoppingListItem): Promise<void>;

  /**
   * Persiste o item inteiro — inclusive os dados de compra e `removed_at` —,
   * cobrindo editar, marcar/desmarcar e o soft delete.
   */
  abstract update(item: ShoppingListItem): Promise<void>;

  /** Hard delete por id; a conclusão remove somente os comprados (AC-21). */
  abstract deleteByIds(ids: readonly string[]): Promise<void>;
}

import type { PurchaseListResponse } from '@lista/contracts';
import type { PurchaseRepository } from '../ports/purchase-repository.port';

/**
 * Listagem do Histórico (RN-08; AC-06): a port devolve os resumos já ordenados
 * por `purchaseDate` desc (empate por `createdAt` desc) com `itemCount`. O shape
 * de saída é o do contrato HTTP — a borda (T-08) só serializa.
 */
export class ListPurchasesUseCase {
  constructor(private readonly repository: PurchaseRepository) {}

  async execute(): Promise<PurchaseListResponse> {
    return { purchases: await this.repository.listSummaries() };
  }
}

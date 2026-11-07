import { describe, expect, it } from 'vitest';
import { makePurchase, uuid } from './testing/purchase-fixtures';
import { InMemoryPurchaseRepository } from './testing/in-memory-purchase-repository';
import { UpdatePurchaseUseCase } from './update-purchase.use-case';

const NOW = new Date('2026-11-07T15:00:00.000Z');
const ID = uuid(1);

describe('UpdatePurchaseUseCase', () => {
  it('grava a compra editada, preserva createdAt e devolve o detalhe sem a chave normalizada', async () => {
    const repository = new InMemoryPurchaseRepository([
      makePurchase([{ name: 'Café', unitPrice: 8, quantity: 1, unit: 'kg' }], {
        id: ID,
        market: 'Feira',
        purchaseDate: '2026-10-01',
        createdAt: '2026-10-01T12:00:00.000Z',
      }),
    ]);
    const useCase = new UpdatePurchaseUseCase(repository);

    const result = await useCase.execute(
      ID,
      {
        market: ' Mercado Sul ',
        purchaseDate: '2026-10-02',
        items: [
          { name: 'Leite', quantity: 2, unit: 'L', unitPrice: 4.5 },
          { name: 'Café', quantity: 1, unit: 'kg', unitPrice: 7 },
        ],
      },
      NOW,
    );

    expect(result).toEqual({
      ok: true,
      purchase: {
        id: ID,
        market: 'Mercado Sul',
        purchaseDate: '2026-10-02',
        createdAt: '2026-10-01T12:00:00.000Z',
        items: [
          { name: 'Leite', quantity: 2, unit: 'L', unitPrice: 4.5 },
          { name: 'Café', quantity: 1, unit: 'kg', unitPrice: 7 },
        ],
      },
    });
    expect(repository.stored(ID)?.items.map((item) => item.name)).toEqual([
      'Leite',
      'Café',
    ]);
  });

  it('id inexistente é not-found e não cria registro', async () => {
    const repository = new InMemoryPurchaseRepository();
    const useCase = new UpdatePurchaseUseCase(repository);

    const result = await useCase.execute(
      ID,
      {
        market: 'Feira',
        purchaseDate: '2026-10-01',
        items: [{ name: 'Café', quantity: 1, unit: 'kg', unitPrice: 8 }],
      },
      NOW,
    );

    expect(result).toEqual({ ok: false, error: 'not-found' });
    expect(repository.count()).toBe(0);
  });

  it('corpo inválido não grava, mesmo quando o id existe', async () => {
    const repository = new InMemoryPurchaseRepository([
      makePurchase([{ name: 'Café', unitPrice: 8 }], {
        id: ID,
        purchaseDate: '2026-10-01',
      }),
    ]);
    const useCase = new UpdatePurchaseUseCase(repository);

    const result = await useCase.execute(
      ID,
      { market: 'Feira', purchaseDate: '2099-01-01', items: [] },
      NOW,
    );

    expect(result.ok).toBe(false);
    expect(repository.stored(ID)?.market).toBe('Mercado Central');
  });
});

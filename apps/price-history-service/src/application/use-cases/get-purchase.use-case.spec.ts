import { describe, expect, it } from 'vitest';
import { GetPurchaseUseCase } from './get-purchase.use-case';
import { InMemoryPurchaseRepository } from './testing/in-memory-purchase-repository';
import { makePurchase, uuid } from './testing/purchase-fixtures';

describe('GetPurchaseUseCase (RN-08; AC-11)', () => {
  it('devolve o detalhe com data, mercado e itens da compra', async () => {
    const repository = new InMemoryPurchaseRepository([
      makePurchase(
        [
          { name: 'Café', unitPrice: 9.9, quantity: 2, unit: 'kg' },
          { name: 'Arroz', unitPrice: 7.5 },
        ],
        {
          id: uuid(1),
          market: 'Atacadão',
          purchaseDate: '2026-10-05',
          createdAt: '2026-10-05T09:00:00.000Z',
        },
      ),
    ]);
    const useCase = new GetPurchaseUseCase(repository);

    const result = await useCase.execute(uuid(1));

    // `nameNormalized` é interno do domínio: não aparece no detalhe.
    expect(result).toEqual({
      id: uuid(1),
      market: 'Atacadão',
      purchaseDate: '2026-10-05',
      createdAt: '2026-10-05T09:00:00.000Z',
      items: [
        { name: 'Café', quantity: 2, unit: 'kg', unitPrice: 9.9 },
        { name: 'Arroz', quantity: 1, unit: 'unidade', unitPrice: 7.5 },
      ],
    });
  });

  it('id inexistente devolve null — a borda HTTP responde 404 (AC-11)', async () => {
    const useCase = new GetPurchaseUseCase(new InMemoryPurchaseRepository());

    await expect(
      useCase.execute('00000000-0000-4000-8000-0000000000ff'),
    ).resolves.toBeNull();
  });
});

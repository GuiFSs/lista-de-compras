import { createShoppingListItem } from '../../domain/shopping-list-item';
import { InMemoryShoppingListRepository } from './testing/in-memory-shopping-list-repository';
import { ApplyReceiptPurchaseUseCase } from './apply-receipt-purchase.use-case';

describe('ApplyReceiptPurchaseUseCase', () => {
  it('cria item novo já marcado como comprado (AC-05)', async () => {
    const repository = new InMemoryShoppingListRepository();
    const useCase = new ApplyReceiptPurchaseUseCase(repository);

    const result = await useCase.execute({
      lines: [
        {
          name: 'Arroz',
          quantity: 2,
          unit: 'kg',
          unitPrice: 5.5,
          include: true,
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe('Arroz');
    expect(result.items[0]?.purchased).toEqual({
      quantity: 2,
      unit: 'kg',
      unitPrice: 5.5,
      purchasedAt: expect.any(Date),
    });
  });

  it('substitui compra do item existente sem criar duplicata (AC-04)', async () => {
    const existing = createShoppingListItem({
      id: 'item-1',
      name: 'Café',
      plannedQuantity: 1,
      unit: 'pacote',
      plannedPrice: 10,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const repository = new InMemoryShoppingListRepository([existing]);
    const useCase = new ApplyReceiptPurchaseUseCase(repository);

    const result = await useCase.execute({
      lines: [
        {
          name: 'cafe',
          quantity: 3,
          unit: 'pacote',
          unitPrice: 12.9,
          include: true,
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('item-1');
    expect(result.items[0]?.purchased?.quantity).toBe(3);
    expect(result.items[0]?.purchased?.unitPrice).toBe(12.9);
  });

  it('não altera itens fora das linhas aplicadas (AC-06)', async () => {
    const keep = createShoppingListItem({
      id: 'keep',
      name: 'Leite',
      plannedQuantity: 1,
      unit: 'L',
      plannedPrice: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const repository = new InMemoryShoppingListRepository([keep]);
    const useCase = new ApplyReceiptPurchaseUseCase(repository);

    const result = await useCase.execute({
      lines: [
        {
          name: 'Pão',
          quantity: 1,
          unit: 'unidade',
          unitPrice: 8,
          include: true,
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const leite = result.items.find((item) => item.id === 'keep');
    expect(leite?.purchased).toBeNull();
    expect(leite?.plannedQuantity).toBe(1);
  });

  it('ignora linhas com include false', async () => {
    const repository = new InMemoryShoppingListRepository();
    const useCase = new ApplyReceiptPurchaseUseCase(repository);

    const result = await useCase.execute({
      lines: [
        {
          name: 'Ignorado',
          quantity: 1,
          unit: 'unidade',
          unitPrice: 1,
          include: false,
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(0);
  });

  it('rejeita linha incluída sem nome', async () => {
    const repository = new InMemoryShoppingListRepository();
    const useCase = new ApplyReceiptPurchaseUseCase(repository);

    const result = await useCase.execute({
      lines: [
        {
          name: '   ',
          quantity: 1,
          unit: 'unidade',
          unitPrice: 1,
          include: true,
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });
});

import { describe, expect, it } from 'vitest';
import type { PurchaseCompletedEventV1 } from '@lista/contracts';
import type { CheckoutInput } from '../../domain/checkout-validation';
import type { ShoppingListItem } from '../../domain/shopping-list-item';
import { CheckoutShoppingListUseCase } from './checkout-shopping-list.use-case';
import { InMemoryOutboxRepository } from './testing/in-memory-outbox-repository';
import { InMemoryShoppingListRepository } from './testing/in-memory-shopping-list-repository';
import { makeItem, purchasedItem } from './testing/item-fixtures';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Corpo omitido na rota (0 comprados): os dois campos chegam ausentes. */
const NO_BODY: CheckoutInput = { market: undefined, purchaseDate: undefined };

/** Calendário UTC, como o serviço compara a data pedida (CD-07). */
function utcDay(offsetDays = 0): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  return now.toISOString().slice(0, 10);
}

interface Fixture {
  readonly useCase: CheckoutShoppingListUseCase;
  readonly list: InMemoryShoppingListRepository;
  readonly outbox: InMemoryOutboxRepository;
}

function fixture(items: readonly ShoppingListItem[] = []): Fixture {
  const list = new InMemoryShoppingListRepository(items);
  const outbox = new InMemoryOutboxRepository(list);
  return { useCase: new CheckoutShoppingListUseCase(list, outbox), list, outbox };
}

/** Envelope gravado pelo checkout (único no cenário com comprados). */
function enqueued(outbox: InMemoryOutboxRepository): PurchaseCompletedEventV1 {
  const messages = outbox.all();
  expect(messages).toHaveLength(1);
  return messages[0].envelope;
}

describe('CheckoutShoppingListUseCase (RN-03/RN-04/RN-09/CD-06)', () => {
  const pending = makeItem({
    id: 'pendente',
    name: 'Arroz',
    plannedQuantity: 2,
    unit: 'kg',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });
  const bought = purchasedItem({
    id: 'comprado',
    name: 'Café',
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
  });

  it('com comprados grava o DELETE e o outbox na mesma operação atômica (AC-05)', async () => {
    const { useCase, list, outbox } = fixture([pending, bought]);

    const result = await useCase.execute({
      market: '  Mercado Central  ',
      purchaseDate: utcDay(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.items.map((item) => item.id)).toEqual(['pendente']);
    expect(list.stored('pendente')).toEqual(pending);
    expect(list.stored('comprado')).toBeNull();
    expect(outbox.all()).toHaveLength(1);
  });

  it('o envelope leva completionId, mercado trimado, data e itens comprados (AC-05)', async () => {
    const { useCase, outbox } = fixture([pending, bought]);

    await useCase.execute({
      market: '  Mercado Central  ',
      purchaseDate: utcDay(),
    });

    const envelope = enqueued(outbox);
    expect(envelope.eventType).toBe('shopping-list.purchase-completed');
    expect(envelope.eventVersion).toBe(1);
    expect(envelope.eventId).toMatch(UUID);
    expect(Number.isNaN(Date.parse(envelope.occurredAt))).toBe(false);
    expect(envelope.payload).toEqual({
      completionId: envelope.payload.completionId,
      market: 'Mercado Central',
      purchaseDate: utcDay(),
      items: [{ name: 'Café', quantity: 2, unit: 'kg', unitPrice: 9.9 }],
    });
    expect(envelope.payload.completionId).toMatch(UUID);
    // Chave única do outbox = chave de idempotência do consumidor (AC-16).
    expect(outbox.all()[0].completionId).toBe(envelope.payload.completionId);
  });

  it('sem comprados não grava outbox nem exige mercado/data (AC-07/RN-09)', async () => {
    const first = makeItem({ id: 'a', name: 'Arroz' });
    const second = makeItem({ id: 'b', name: 'Feijão' });
    const { useCase, list, outbox } = fixture([first, second]);

    const result = await useCase.execute(NO_BODY);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.items.map((item) => item.id)).toEqual(['a', 'b']);
    expect(list.stored('a')).toEqual(first);
    expect(list.stored('b')).toEqual(second);
    expect(outbox.all()).toHaveLength(0);
  });

  it.each([
    { input: { market: '   ', purchaseDate: utcDay() }, code: 'market-required' },
    { input: { market: 'Mercado', purchaseDate: '' }, code: 'purchase-date-required' },
    { input: { market: 'Mercado', purchaseDate: '2026-02-30' }, code: 'purchase-date-invalid' },
    { input: { market: 'Mercado', purchaseDate: utcDay(1) }, code: 'purchase-date-future' },
  ])(
    'com comprados e entrada inválida devolve $code sem tocar na lista (AC-04)',
    async ({ input, code }) => {
      const { useCase, list, outbox } = fixture([pending, bought]);

      const result = await useCase.execute(input);

      expect(result).toEqual({
        ok: false,
        error: { code: 'checkout-validation', error: code },
      });
      expect(list.stored('comprado')).toEqual(bought);
      expect(outbox.all()).toHaveLength(0);
    },
  );

  it('falha da gravação atômica não deixa efeito parcial (CD-06)', async () => {
    const { useCase, list, outbox } = fixture([pending, bought]);
    outbox.failNextWrite(new Error('transação abortada'));

    await expect(
      useCase.execute({ market: 'Mercado', purchaseDate: utcDay() }),
    ).rejects.toThrow('transação abortada');

    // Nem o DELETE nem o INSERT: o caso de uso só escreve pelo passo atômico.
    expect(list.stored('comprado')).toEqual(bought);
    expect(outbox.all()).toHaveLength(0);
  });

  it('cada conclusão gera um completionId novo (idempotência do consumidor)', async () => {
    const { useCase, list, outbox } = fixture([bought]);

    await useCase.execute({ market: 'Mercado', purchaseDate: utcDay() });
    await list.insert(
      purchasedItem({
        id: 'comprado-2',
        name: 'Leite',
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
      }),
    );
    await useCase.execute({ market: 'Mercado', purchaseDate: utcDay() });

    const completionIds = outbox.all().map((message) => message.completionId);
    expect(new Set(completionIds).size).toBe(2);
    expect(list.stored('comprado')).toBeNull();
    expect(list.stored('comprado-2')).toBeNull();
  });
});

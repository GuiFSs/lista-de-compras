import { describe, expect, it } from 'vitest';
import { normalizeItemName } from './item-name';
import {
  addPlannedQuantity,
  applyItemChanges,
  createShoppingListItem,
  findNameConflict,
  markItemPurchased,
  sortItemsForList,
  splitForCheckout,
  unmarkItemPurchased,
} from './shopping-list-item';
import type { PurchasedDetails, ShoppingListItem } from './shopping-list-item';

const BASE_TIME = new Date('2026-01-01T00:00:00.000Z');
const LATER = new Date('2026-02-01T00:00:00.000Z');

function makeItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  const name = overrides.name ?? 'Café';
  const base = createShoppingListItem({
    id: overrides.id ?? 'item-1',
    name,
    plannedQuantity: overrides.plannedQuantity ?? null,
    unit: overrides.unit ?? null,
    plannedPrice: overrides.plannedPrice ?? null,
    createdAt: overrides.createdAt ?? BASE_TIME,
  });
  return {
    ...base,
    ...overrides,
    name,
    nameNormalized: overrides.nameNormalized ?? normalizeItemName(name),
  };
}

function purchasedItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  const purchased: PurchasedDetails = {
    quantity: 2,
    unit: 'kg',
    unitPrice: 9.9,
    purchasedAt: BASE_TIME,
  };
  return makeItem({ ...overrides, purchased });
}

describe('createShoppingListItem', () => {
  it('apara o nome e deriva a chave normalizada no domínio (RN-02)', () => {
    const item = createShoppingListItem({
      id: 'abc',
      name: '  Café  ',
      plannedQuantity: null,
      unit: null,
      plannedPrice: null,
      createdAt: BASE_TIME,
    });

    expect(item.name).toBe('Café');
    expect(item.nameNormalized).toBe('cafe');
    expect(item.purchased).toBeNull();
    expect(item.removedAt).toBeNull();
    expect(item.updatedAt).toBe(BASE_TIME);
  });
});

describe('addPlannedQuantity (RN-04/CD-02)', () => {
  it('soma a quantidade informada à existente', () => {
    const item = makeItem({ plannedQuantity: 3 });

    const result = addPlannedQuantity(item, 2, LATER);

    expect(result.plannedQuantity).toBe(5);
    expect(result.updatedAt).toBe(LATER);
  });

  it('usa a informada quando não havia quantidade planejada', () => {
    const item = makeItem({ plannedQuantity: null });

    expect(addPlannedQuantity(item, 2.5, LATER).plannedQuantity).toBe(2.5);
  });

  it('mantém o item como estava sem quantidade informada', () => {
    const item = makeItem({ plannedQuantity: 3 });

    expect(addPlannedQuantity(item, null, LATER)).toBe(item);
    expect(addPlannedQuantity(item, undefined, LATER)).toBe(item);
  });
});

describe('markItemPurchased (RN-09/RN-11/AC-12)', () => {
  it('guarda os três dados e mantém o item na lista', () => {
    const item = makeItem({ plannedQuantity: 2, unit: 'kg', plannedPrice: 8 });

    const result = markItemPurchased(
      item,
      { purchasedQuantity: 2.4, unit: 'kg', unitPrice: 9.9 },
      LATER,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.item.id).toBe(item.id);
    expect(result.item.name).toBe('Café');
    expect(result.item.plannedQuantity).toBe(2);
    expect(result.item.purchased).toEqual({
      quantity: 2.4,
      unit: 'kg',
      unitPrice: 9.9,
      purchasedAt: LATER,
    });
    expect(result.item.updatedAt).toBe(LATER);
    // Continua sendo o mesmo item da lista (não removido, sem alterar `removedAt`).
    expect(result.item.removedAt).toBeNull();
  });

  it('recusa quantidade zero/negativa, preço negativo ou unidade inválida', () => {
    const item = makeItem();

    const zero = markItemPurchased(
      item,
      { purchasedQuantity: 0, unit: 'kg', unitPrice: 1 },
      LATER,
    );
    const negativePrice = markItemPurchased(
      item,
      { purchasedQuantity: 1, unit: 'kg', unitPrice: -1 },
      LATER,
    );
    const badUnit = markItemPurchased(
      item,
      { purchasedQuantity: 1, unit: 'litro' as never, unitPrice: 1 },
      LATER,
    );

    expect(zero).toEqual({ ok: false, error: 'quantity-not-positive' });
    expect(negativePrice).toEqual({ ok: false, error: 'price-negative' });
    expect(badUnit).toEqual({ ok: false, error: 'unit-invalid' });
    // Função pura: a falha não muta o item original.
    expect(item.purchased).toBeNull();
  });
});

describe('unmarkItemPurchased (RN-12/AC-16)', () => {
  it('volta a pendente e limpa os dados da compra', () => {
    const item = purchasedItem();

    const result = unmarkItemPurchased(item, LATER);

    expect(result.purchased).toBeNull();
    expect(result.updatedAt).toBe(LATER);
    expect(result.name).toBe(item.name);
  });

  it('é idempotente em item já pendente', () => {
    const item = makeItem();

    expect(unmarkItemPurchased(item, LATER)).toBe(item);
  });
});

describe('sortItemsForList (RN-18/AC-18)', () => {
  it('coloca pendentes primeiro e comprados depois', () => {
    const purchasedOlder = purchasedItem({
      id: 'comprado',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const pendingNewer = makeItem({
      id: 'pendente',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
    });

    const sorted = sortItemsForList([purchasedOlder, pendingNewer]);

    expect(sorted.map((item) => item.id)).toEqual(['pendente', 'comprado']);
  });

  it('dentro do grupo, ordena pela criação', () => {
    const first = makeItem({ id: 'a', createdAt: new Date('2026-01-01T00:00:00.000Z') });
    const second = makeItem({ id: 'b', createdAt: new Date('2026-01-02T00:00:00.000Z') });
    const boughtFirst = purchasedItem({
      id: 'c',
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
    });
    const boughtSecond = purchasedItem({
      id: 'd',
      createdAt: new Date('2026-01-04T00:00:00.000Z'),
    });

    const sorted = sortItemsForList([boughtSecond, second, boughtFirst, first]);

    expect(sorted.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('não muta a lista recebida', () => {
    const items = [purchasedItem({ id: 'x' }), makeItem({ id: 'y' })];

    sortItemsForList(items);

    expect(items.map((item) => item.id)).toEqual(['x', 'y']);
  });
});

describe('splitForCheckout (RN-14/RN-15/AC-19/AC-20)', () => {
  it('separa somente os comprados para sair', () => {
    const pending = makeItem({ id: 'pendente' });
    const bought = purchasedItem({ id: 'comprado' });

    const split = splitForCheckout([pending, bought]);

    expect(split.removed.map((item) => item.id)).toEqual(['comprado']);
    expect(split.remaining.map((item) => item.id)).toEqual(['pendente']);
  });

  it('sem comprados, nada sai da lista', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })];

    const split = splitForCheckout(items);

    expect(split.removed).toEqual([]);
    expect(split.remaining).toEqual(items);
  });

  it('com tudo comprado, nada permanece', () => {
    const split = splitForCheckout([
      purchasedItem({ id: 'a' }),
      purchasedItem({ id: 'b' }),
    ]);

    expect(split.remaining).toEqual([]);
    expect(split.removed).toHaveLength(2);
  });
});

describe('findNameConflict (RN-04/CD-13/AC-08/AC-09)', () => {
  it('encontra outro item pelo nome normalizado (sem acentos/maiúsculas)', () => {
    const existing = makeItem({ id: 'existente', name: 'Café' });
    const items = [existing, makeItem({ id: 'outro', name: 'Cebola' })];

    expect(findNameConflict(items, 'CAFE', null)).toBe(existing);
  });

  it('não é conflito renomear para o próprio nome normalizado', () => {
    const item = makeItem({ id: 'eu', name: 'cafe' });

    expect(findNameConflict([item], 'Café', item.id)).toBeNull();
  });

  it('ignora itens removidos', () => {
    const removed = makeItem({
      id: 'removido',
      name: 'Café',
      removedAt: LATER,
    });

    expect(findNameConflict([removed], 'cafe', null)).toBeNull();
  });
});

describe('applyItemChanges (RN-03/RN-04/CD-13/AC-08)', () => {
  it('em conflito com outro item, não aplica e não soma nada', () => {
    const target = makeItem({ id: 'alvo', name: 'Café', plannedQuantity: 1 });
    const other = makeItem({ id: 'outro', name: 'Cebola', plannedQuantity: 5 });
    const items = [target, other];

    const result = applyItemChanges(
      target,
      { name: 'CEBOLA', plannedQuantity: 3 },
      items,
      LATER,
    );

    expect(result).toEqual({
      ok: false,
      reason: 'name-conflict',
      conflictingItemId: 'outro',
    });
    // Item permanece exatamente como estava e nada foi somado a ninguém.
    expect(target.name).toBe('Café');
    expect(target.plannedQuantity).toBe(1);
    expect(other.plannedQuantity).toBe(5);
  });

  it('aplica a edição quando o nome é o próprio normalizado', () => {
    const item = makeItem({ id: 'eu', name: 'cafe' });

    const result = applyItemChanges(item, { name: 'Café' }, [item], LATER);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.item.name).toBe('Café');
    expect(result.item.nameNormalized).toBe('cafe');
    expect(result.item.updatedAt).toBe(LATER);
  });

  it('mantém campos ausentes e limpa os enviados como null', () => {
    const item = makeItem({
      id: 'eu',
      name: 'Arroz',
      plannedQuantity: 2,
      unit: 'kg',
      plannedPrice: 10,
    });
    const items = [item];

    const kept = applyItemChanges(item, { name: 'Arroz integral' }, items, LATER);
    const cleared = applyItemChanges(
      item,
      { plannedQuantity: null, unit: null, plannedPrice: null },
      items,
      LATER,
    );

    expect(kept.ok).toBe(true);
    if (kept.ok) {
      expect(kept.item.plannedQuantity).toBe(2);
      expect(kept.item.unit).toBe('kg');
      expect(kept.item.plannedPrice).toBe(10);
    }
    expect(cleared.ok).toBe(true);
    if (cleared.ok) {
      expect(cleared.item.plannedQuantity).toBeNull();
      expect(cleared.item.unit).toBeNull();
      expect(cleared.item.plannedPrice).toBeNull();
    }
  });

  it('recusa valores inválidos com o código correspondente', () => {
    const item = makeItem({ id: 'eu', name: 'Arroz' });
    const items = [item];

    expect(applyItemChanges(item, { name: '  ' }, items, LATER)).toEqual({
      ok: false,
      reason: 'invalid',
      error: 'name-required',
    });
    expect(applyItemChanges(item, { plannedQuantity: 0 }, items, LATER)).toEqual({
      ok: false,
      reason: 'invalid',
      error: 'quantity-not-positive',
    });
    expect(
      applyItemChanges(item, { plannedPrice: -1 }, items, LATER),
    ).toEqual({ ok: false, reason: 'invalid', error: 'price-negative' });
    expect(
      applyItemChanges(item, { unit: 'litro' as never }, items, LATER),
    ).toEqual({ ok: false, reason: 'invalid', error: 'unit-invalid' });
  });

  it('preserva o estado comprado ao editar (RN-07/AC-17)', () => {
    const item = purchasedItem({ id: 'eu', name: 'Café' });

    const result = applyItemChanges(item, { plannedQuantity: 3 }, [item], LATER);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.purchased).toEqual(item.purchased);
      expect(result.item.plannedQuantity).toBe(3);
    }
  });
});

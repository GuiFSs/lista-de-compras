import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MarkItemPurchasedRequest, PurchasedDetails, ShoppingListItem } from '@lista/contracts';
import { ShoppingListStore, UNDO_WINDOW_MS } from './shopping-list-store';

const BASE_URL = 'http://localhost:3000/api/shopping-list';
const url = (path = ''): string => `${BASE_URL}${path}`;

const PURCHASED: PurchasedDetails = {
  quantity: 2,
  unit: 'pacote',
  unitPrice: 12.5,
  purchasedAt: '2026-10-13T11:00:00.000Z',
};

function item(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    id: 'item-1',
    name: 'Café',
    plannedQuantity: null,
    unit: null,
    plannedPrice: null,
    purchased: null,
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z',
    ...overrides,
  };
}

/** Deixa as microtasks drenarem: a releitura após a falha nasce fora do `flush`. */
const flushMicrotasks = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('ShoppingListStore', () => {
  let store: ShoppingListStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(ShoppingListStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('começa em loading e, após a resposta, aplica a ordem recebida do serviço (AC-02/RN-18)', async () => {
    expect(store.status()).toBe('loading');

    const load = store.load();
    expect(store.status()).toBe('loading');
    http.expectOne(BASE_URL).flush({
      items: [item({ id: 'comprado', purchased: PURCHASED }), item({ id: 'pendente' })],
    });
    await load;

    expect(store.status()).toBe('loaded');
    // Sem reordenação no cliente: o serviço é dono da ordem (pendentes → comprados).
    expect(store.items().map((i) => i.id)).toEqual(['comprado', 'pendente']);
    expect(store.pendingCount()).toBe(1);
    expect(store.purchasedCount()).toBe(1);
  });

  it('falha ao carregar: erro visível com a mensagem do envelope e nova tentativa (AC-22)', async () => {
    const failing = store.load();
    http
      .expectOne(BASE_URL)
      .flush(
        { statusCode: 500, message: 'Erro interno' },
        { status: 500, statusText: 'Internal Server Error' },
      );
    await failing;

    expect(store.status()).toBe('error');
    expect(store.loadError()).toBe('Erro interno');

    const retry = store.load();
    expect(store.status()).toBe('loading');
    http.expectOne(BASE_URL).flush({ items: [item()] });
    await retry;

    expect(store.status()).toBe('loaded');
    expect(store.loadError()).toBeNull();
    expect(store.items()).toHaveLength(1);
  });

  it('erro de rede na carga usa mensagem própria (sem detalhe interno)', async () => {
    const failing = store.load();
    http.expectOne(BASE_URL).error(new ProgressEvent('error'));

    await failing;

    expect(store.status()).toBe('error');
    expect(store.loadError()).toBe('Falha de rede. Verifique a conexão e tente novamente.');
  });

  it('cria item e aplica a lista ativa completa devolvida (AC-04)', async () => {
    const create = store.createItem({ name: 'Café' });

    const req = http.expectOne(url('/items'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Café' });
    req.flush({ items: [item()] });

    await expect(create).resolves.toEqual({ kind: 'created' });
    expect(store.items()).toEqual([item()]);
    expect(store.mutationError()).toBeNull();
  });

  it('409 na criação é duplicidade de fluxo: sem erro visível e sem estado aplicado (AC-07)', async () => {
    const create = store.createItem({ name: 'cafe', plannedQuantity: 2 });
    http
      .expectOne(url('/items'))
      .flush(
        {
          statusCode: 409,
          message: 'Já existe um item com esse nome',
          error: 'duplicate-item-name',
          duplicateOf: { id: 'item-1', name: 'Café' },
        },
        { status: 409, statusText: 'Conflict' },
      );

    await expect(create).resolves.toEqual({
      kind: 'duplicate',
      duplicateOf: { id: 'item-1', name: 'Café' },
    });
    expect(store.mutationError()).toBeNull();
    expect(store.items()).toEqual([]);
  });

  it('confirmar a soma reenvia a criação com duplicateResolution (CD-02)', async () => {
    const create = store.createItem({
      name: 'café',
      plannedQuantity: 2,
      duplicateResolution: 'sum-planned-quantity',
    });

    const req = http.expectOne(url('/items'));
    expect(req.request.body).toEqual({
      name: 'café',
      plannedQuantity: 2,
      duplicateResolution: 'sum-planned-quantity',
    });
    req.flush({ items: [item({ plannedQuantity: 4 })] });

    await expect(create).resolves.toEqual({ kind: 'created' });
    expect(store.items()).toEqual([item({ plannedQuantity: 4 })]);
  });

  it('409 na edição é conflito de formulário: não aplica, não soma e não gera erro visível (AC-08/CD-13)', async () => {
    const load = store.load();
    http
      .expectOne(BASE_URL)
      .flush({ items: [item({ id: 'a', name: 'Café' }), item({ id: 'b', name: 'Arroz' })] });
    await load;

    const update = store.updateItem('b', { name: 'cafe' });
    const req = http.expectOne(url('/items/b'));
    expect(req.request.method).toBe('PATCH');
    req.flush(
      {
        statusCode: 409,
        message: 'Já existe um item com esse nome',
        error: 'duplicate-item-name',
        duplicateOf: { id: 'a', name: 'Café' },
      },
      { status: 409, statusText: 'Conflict' },
    );

    await expect(update).resolves.toEqual({
      kind: 'conflict',
      duplicateOf: { id: 'a', name: 'Café' },
    });
    expect(store.mutationError()).toBeNull();
    expect(store.items().map((i) => i.name)).toEqual(['Café', 'Arroz']);
  });

  it('edita item e aplica a lista devolvida (AC-10)', async () => {
    const update = store.updateItem('a', { name: 'Arroz', plannedQuantity: 3 });
    http.expectOne(url('/items/a')).flush({ items: [item({ id: 'a', name: 'Arroz', plannedQuantity: 3 })] });

    await expect(update).resolves.toEqual({ kind: 'updated' });
    expect(store.items()).toEqual([item({ id: 'a', name: 'Arroz', plannedQuantity: 3 })]);
  });

  it('falha de mutação: erro visível, releitura para não deixar fantasma (AC-23)', async () => {
    const load = store.load();
    http.expectOne(BASE_URL).flush({ items: [item()] });
    await load;

    const create = store.createItem({ name: 'Arroz' });
    http.expectOne(url('/items')).error(new ProgressEvent('error'));

    await flushMicrotasks();
    // Rede caiu: a resposta não voltou, então o store confere o estado real (lista vazia).
    http.expectOne(BASE_URL).flush({ items: [] });

    await expect(create).resolves.toEqual({
      kind: 'error',
      message: 'Falha de rede. Verifique a conexão e tente novamente.',
    });
    expect(store.mutationError()).toBe('Falha de rede. Verifique a conexão e tente novamente.');
    expect(store.items()).toEqual([]);
    expect(store.status()).toBe('loaded');
  });

  it('erro de validação da mutação não dispara releitura: nada mudou no serviço', async () => {
    const update = store.updateItem('a', { plannedQuantity: 0 });
    http
      .expectOne(url('/items/a'))
      .flush(
        { statusCode: 400, message: 'Quantidade deve ser maior que zero' },
        { status: 400, statusText: 'Bad Request' },
      );

    await expect(update).resolves.toEqual({
      kind: 'error',
      message: 'Quantidade deve ser maior que zero',
    });
    expect(store.mutationError()).toBe('Quantidade deve ser maior que zero');
    http.expectNone(BASE_URL);
  });

  it('descarta a mensagem de erro de mutação (toast persistente até o descarte — AC-23)', async () => {
    const create = store.createItem({ name: 'Café' });
    http
      .expectOne(url('/items'))
      .flush(
        { statusCode: 500, message: 'Erro interno' },
        { status: 500, statusText: 'Internal Server Error' },
      );
    await create;

    expect(store.mutationError()).toBe('Erro interno');
    store.clearMutationError();
    expect(store.mutationError()).toBeNull();
  });

  it('double submit do formulário gera uma única requisição (AC-26, single-flight)', async () => {
    const first = store.createItem({ name: 'Café' });
    const second = store.createItem({ name: 'Café' });
    expect(store.saving()).toBe(true);

    http.expectOne(url('/items')).flush({ items: [item()] });

    await expect(first).resolves.toEqual({ kind: 'created' });
    await expect(second).resolves.toEqual({ kind: 'created' });
    http.expectNone(url('/items'));
    expect(store.saving()).toBe(false);
  });

  it('single-flight por operação: excluir o mesmo item duas vezes pede uma requisição', async () => {
    const load = store.load();
    http.expectOne(BASE_URL).flush({ items: [item({ id: 'a', name: 'Café' })] });
    await load;

    const first = store.removeItem('a');
    const second = store.removeItem('a');

    http.expectOne(url('/items/a')).flush({ items: [] });

    await expect(first).resolves.toEqual({ kind: 'ok' });
    await expect(second).resolves.toEqual({ kind: 'ok' });
    http.expectNone(url('/items/a'));
    expect(store.pendingUndo()).toEqual({ id: 'a', name: 'Café' });
  });

  it('marca como comprado com o payload do contrato e aplica a lista (AC-12)', async () => {
    const request: MarkItemPurchasedRequest = { purchasedQuantity: 2, unit: 'pacote', unitPrice: 12.5 };
    const mark = store.markItemPurchased('a', request);

    const req = http.expectOne(url('/items/a/purchase'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush({ items: [item({ id: 'a', purchased: PURCHASED })] });

    await expect(mark).resolves.toEqual({ kind: 'ok' });
    expect(store.purchasedCount()).toBe(1);
    expect(store.items()[0].purchased).toEqual(PURCHASED);
  });

  it('desmarca com DELETE .../purchase e aplica a lista devolvida (AC-16)', async () => {
    const unmark = store.unmarkItemPurchased('a');

    const req = http.expectOne(url('/items/a/purchase'));
    expect(req.request.method).toBe('DELETE');
    req.flush({ items: [item({ id: 'a' })] });

    await expect(unmark).resolves.toEqual({ kind: 'ok' });
    expect(store.items()).toEqual([item({ id: 'a' })]);
  });

  it('conclui a compra sem corpo e aplica só o que permanece (AC-19/AC-20)', async () => {
    const checkout = store.checkout();

    const req = http.expectOne(url('/checkout'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ items: [item({ id: 'b', name: 'Arroz' })] });

    await expect(checkout).resolves.toEqual({ kind: 'ok' });
    expect(store.items().map((i) => i.name)).toEqual(['Arroz']);
  });

  it('falha ao restaurar: erro visível e releitura do serviço (AC-23, sem fantasma)', async () => {
    const load = store.load();
    http.expectOne(BASE_URL).flush({ items: [item({ id: 'a', name: 'Café' })] });
    await load;

    const remove = store.removeItem('a');
    http.expectOne(url('/items/a')).flush({ items: [] });
    await remove;

    const undo = store.undoRemove();
    http
      .expectOne(url('/items/a/restore'))
      .flush(
        { statusCode: 409, message: 'Já existe um item com esse nome' },
        { status: 409, statusText: 'Conflict' },
      );

    await flushMicrotasks();
    http.expectOne(BASE_URL).flush({ items: [item({ id: 'b', name: 'Arroz' })] });

    await expect(undo).resolves.toEqual({
      kind: 'error',
      message: 'Já existe um item com esse nome',
    });
    expect(store.mutationError()).toBe('Já existe um item com esse nome');
    expect(store.items().map((i) => i.id)).toEqual(['b']);
  });

  describe('janela de "Desfazer" (AC-11/RN-08)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('exclui na hora e, sem desfazer, a janela expira sem restaurar nada', async () => {
      const load = store.load();
      http.expectOne(BASE_URL).flush({ items: [item({ id: 'a', name: 'Café' })] });
      await load;

      const remove = store.removeItem('a');
      http.expectOne(url('/items/a')).flush({ items: [] });
      await expect(remove).resolves.toEqual({ kind: 'ok' });

      expect(store.items()).toEqual([]);
      expect(store.pendingUndo()).toEqual({ id: 'a', name: 'Café' });

      vi.advanceTimersByTime(UNDO_WINDOW_MS - 1);
      expect(store.pendingUndo()).not.toBeNull();

      vi.advanceTimersByTime(1);
      expect(store.pendingUndo()).toBeNull();
      http.expectNone(url('/items/a/restore'));
    });

    it('"Desfazer" cancela a janela e restaura o item com os mesmos dados', async () => {
      const load = store.load();
      http.expectOne(BASE_URL).flush({ items: [item({ id: 'a', name: 'Café', purchased: PURCHASED })] });
      await load;

      const remove = store.removeItem('a');
      http.expectOne(url('/items/a')).flush({ items: [] });
      await remove;

      const undo = store.undoRemove();
      const restore = http.expectOne(url('/items/a/restore'));
      expect(restore.request.method).toBe('POST');
      restore.flush({ items: [item({ id: 'a', name: 'Café', purchased: PURCHASED })] });
      await expect(undo).resolves.toEqual({ kind: 'ok' });

      expect(store.items()).toEqual([item({ id: 'a', name: 'Café', purchased: PURCHASED })]);
      expect(store.pendingUndo()).toBeNull();

      // Timer cancelado: nenhuma restauração extra sai depois da janela.
      vi.advanceTimersByTime(UNDO_WINDOW_MS * 2);
      http.expectNone(url('/items/a/restore'));
    });

    it('sem janela pendente, "Desfazer" não chama o serviço', async () => {
      await expect(store.undoRemove()).resolves.toEqual({ kind: 'ok' });
      http.expectNone(url('/items/a/restore'));
    });

    it('excluir de novo substitui a janela pendente: só o último item pode voltar', async () => {
      const load = store.load();
      http
        .expectOne(BASE_URL)
        .flush({ items: [item({ id: 'a', name: 'Café' }), item({ id: 'b', name: 'Arroz' })] });
      await load;

      const firstRemove = store.removeItem('a');
      http.expectOne(url('/items/a')).flush({ items: [item({ id: 'b', name: 'Arroz' })] });
      await firstRemove;

      const secondRemove = store.removeItem('b');
      http.expectOne(url('/items/b')).flush({ items: [] });
      await secondRemove;

      expect(store.pendingUndo()).toEqual({ id: 'b', name: 'Arroz' });

      const undo = store.undoRemove();
      http.expectOne(url('/items/b/restore')).flush({ items: [item({ id: 'b', name: 'Arroz' })] });
      await expect(undo).resolves.toEqual({ kind: 'ok' });

      // A janela do primeiro item foi substituída e não gera restauração.
      http.expectNone(url('/items/a/restore'));
      expect(store.pendingUndo()).toBeNull();
    });
  });
});

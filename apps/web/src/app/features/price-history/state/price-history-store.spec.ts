import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  LowestPriceByMarketResponse,
  LowestPriceMarketGroup,
  LowestPricesResponse,
  PurchaseDetailResponse,
  PurchaseListResponse,
} from '@lista/contracts';
import { PriceHistoryStore } from './price-history-store';

const BASE_URL = 'http://localhost:3002/api/price-history';
const url = (path = ''): string => `${BASE_URL}${path}`;

function coffeeGroup(): LowestPriceMarketGroup {
  return {
    market: 'Mercado Central',
    items: [
      {
        name: 'Café',
        nameNormalized: 'cafe',
        lowestUnitPrice: 7.5,
        market: 'Mercado Central',
        purchaseDate: '2026-10-15',
        quantity: 2,
        unit: 'pacote',
      },
    ],
  };
}

function lowestPrices(): LowestPricesResponse {
  return {
    markets: [
      {
        market: 'Atacadão',
        items: [
          {
            name: 'Arroz',
            nameNormalized: 'arroz',
            lowestUnitPrice: 21.9,
            market: 'Atacadão',
            purchaseDate: '2026-10-02',
            quantity: 5,
            unit: 'kg',
          },
        ],
      },
      coffeeGroup(),
    ],
  };
}

function itemPrices(): LowestPriceByMarketResponse {
  return {
    name: 'Café',
    nameNormalized: 'cafe',
    markets: [
      {
        market: 'Atacadão',
        lowestUnitPrice: 6.9,
        purchaseDate: '2026-10-12',
        quantity: 1,
        unit: 'pacote',
      },
      {
        market: 'Mercado Central',
        lowestUnitPrice: 7.5,
        purchaseDate: '2026-10-15',
        quantity: 2,
        unit: 'pacote',
      },
    ],
  };
}

function purchase(overrides: Partial<PurchaseDetailResponse> = {}): PurchaseDetailResponse {
  return {
    id: 'c1',
    market: 'Mercado Central',
    purchaseDate: '2026-10-15',
    items: [{ name: 'Café', quantity: 2, unit: 'pacote', unitPrice: 7.5 }],
    createdAt: '2026-10-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('PriceHistoryStore', () => {
  let store: PriceHistoryStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(PriceHistoryStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('lista de compras', () => {
    it('começa em loading e aplica a ordem recebida do serviço (AC-06)', async () => {
      expect(store.purchases().status).toBe('loading');

      const load = store.loadPurchases();
      expect(store.purchases().status).toBe('loading');

      const response: PurchaseListResponse = {
        purchases: [
          {
            id: 'b',
            market: 'Rede Norte',
            purchaseDate: '2026-10-10',
            itemCount: 2,
            createdAt: '2026-10-10T18:00:00.000Z',
          },
          {
            id: 'a',
            market: 'Mercado Central',
            purchaseDate: '2026-10-01',
            itemCount: 1,
            createdAt: '2026-10-01T09:00:00.000Z',
          },
        ],
      };
      http.expectOne(url('/purchases')).flush(response);
      await load;

      expect(store.purchases().status).toBe('loaded');
      expect(store.purchases().error).toBeNull();
      // Cliente não reordena nem reconta: data/mercado/itemCount vêm prontos (RN-08).
      expect(store.purchases().data).toEqual(response.purchases);
    });

    it('falha vira erro visível e a nova tentativa refaz o GET (AC-14)', async () => {
      const failing = store.loadPurchases();
      http
        .expectOne(url('/purchases'))
        .flush(
          { statusCode: 500, message: 'Erro interno' },
          { status: 500, statusText: 'Internal Server Error' },
        );
      await failing;

      expect(store.purchases().status).toBe('error');
      expect(store.purchases().error).toBe('Erro interno');

      const retry = store.loadPurchases();
      expect(store.purchases().status).toBe('loading');
      http.expectOne(url('/purchases')).flush({ purchases: [] } satisfies PurchaseListResponse);
      await retry;

      expect(store.purchases().status).toBe('loaded');
      expect(store.purchases().error).toBeNull();
      // Lista vazia chega como `loaded`: quem decide o empty state é a tela (AC-12).
      expect(store.purchases().data).toEqual([]);
    });

    it('erro de rede usa mensagem própria (sem detalhe interno)', async () => {
      const failing = store.loadPurchases();
      http.expectOne(url('/purchases')).error(new ProgressEvent('error'));
      await failing;

      expect(store.purchases().status).toBe('error');
      expect(store.purchases().error).toBe('Falha de rede. Verifique a conexão e tente novamente.');
    });

    it('401 chega como erro de carga; o redirect ao login é do interceptor (AC-18)', async () => {
      const failing = store.loadPurchases();
      http
        .expectOne(url('/purchases'))
        .flush(
          { statusCode: 401, message: 'Não autorizado' },
          { status: 401, statusText: 'Unauthorized' },
        );
      await failing;

      expect(store.purchases().status).toBe('error');
      expect(store.purchases().error).toBe('Não autorizado');
    });
  });

  describe('detalhe da compra', () => {
    it('seleciona a compra e busca o id no serviço (AC-11)', async () => {
      const load = store.loadPurchase('c1');
      expect(store.detail().selectedId).toBe('c1');
      expect(store.detail().status).toBe('loading');

      const response = purchase();
      http.expectOne(url('/purchases/c1')).flush(response);
      await load;

      expect(store.detail().status).toBe('loaded');
      expect(store.detail().data).toEqual(response);
      expect(store.detail().error).toBeNull();
    });

    it('404 vira erro e repetir sem id refaz o GET da seleção (AC-14)', async () => {
      const failing = store.loadPurchase('c1');
      http
        .expectOne(url('/purchases/c1'))
        .flush(
          { statusCode: 404, message: 'Compra não encontrada' },
          { status: 404, statusText: 'Not Found' },
        );
      await failing;

      expect(store.detail().status).toBe('error');
      expect(store.detail().error).toBe('Compra não encontrada');
      expect(store.detail().selectedId).toBe('c1');

      const retry = store.loadPurchase();
      http.expectOne(url('/purchases/c1')).flush(purchase());
      await retry;

      expect(store.detail().status).toBe('loaded');
      expect(store.detail().data?.id).toBe('c1');
      expect(store.detail().error).toBeNull();
    });

    it('resposta atrasada de outra compra não sobrescreve a seleção', async () => {
      const first = store.loadPurchase('a');
      const second = store.loadPurchase('b');
      expect(store.detail().selectedId).toBe('b');

      const latest = purchase({ id: 'b', market: 'Rede Norte' });
      http.expectOne(url('/purchases/b')).flush(latest);
      await second;

      http.expectOne(url('/purchases/a')).flush(purchase({ id: 'a' }));
      await first;

      expect(store.detail().selectedId).toBe('b');
      expect(store.detail().data).toEqual(latest);
    });

    it('sem seleção, repetir o detalhe não faz chamada', async () => {
      await store.loadPurchase();
      http.expectNone(url('/purchases'));
    });

    it('clearPurchase descarta seleção e dado', async () => {
      const load = store.loadPurchase('c1');
      http.expectOne(url('/purchases/c1')).flush(purchase());
      await load;

      store.clearPurchase();

      expect(store.detail().selectedId).toBeNull();
      expect(store.detail().data).toBeNull();
      expect(store.detail().status).toBe('loading');
    });
  });

  describe('menores preços', () => {
    it('aplica os grupos do serviço sem agrupar, reordenar ou calcular no cliente (AC-01/AC-02)', async () => {
      const response = lowestPrices();

      const load = store.loadLowestPrices();
      expect(store.lowestPrices().status).toBe('loading');
      http.expectOne(url('/lowest-prices')).flush(response);
      await load;

      expect(store.lowestPrices().status).toBe('loaded');
      expect(store.lowestPrices().error).toBeNull();
      // Mercados e itens chegam prontos do serviço (RN-05/RN-12): a PWA só
      // aplica a resposta, mantendo ordem e grupos.
      expect(store.lowestPrices().data).toEqual(response.markets);
      expect(store.lowestPrices().data[0].market).toBe('Atacadão');
      expect(store.lowestPrices().data[1].items[0].lowestUnitPrice).toBe(7.5);
    });

    it('busca vai ao serviço como q e registra o termo (AC-09)', async () => {
      const load = store.loadLowestPrices('cafe');
      expect(store.lowestPrices().query).toBe('cafe');

      const response: LowestPricesResponse = { markets: [coffeeGroup()] };
      http.expectOne(url('/lowest-prices?q=cafe')).flush(response);
      await load;

      expect(store.lowestPrices().status).toBe('loaded');
      // "busca `cafe` acha `café`" é normalização do serviço (RN-10): aqui só
      // repassamos a resposta — nenhum filtro de nome no cliente.
      expect(store.lowestPrices().data).toEqual(response.markets);
    });

    it('erro + repetir sem termo refaz a MESMA busca (AC-14)', async () => {
      const failing = store.loadLowestPrices('cafe');
      http
        .expectOne(url('/lowest-prices?q=cafe'))
        .flush(
          { statusCode: 500, message: 'Erro interno' },
          { status: 500, statusText: 'Internal Server Error' },
        );
      await failing;

      expect(store.lowestPrices().status).toBe('error');
      expect(store.lowestPrices().error).toBe('Erro interno');
      expect(store.lowestPrices().query).toBe('cafe');

      const retry = store.loadLowestPrices();
      http.expectOne(url('/lowest-prices?q=cafe')).flush({ markets: [] });
      await retry;

      expect(store.lowestPrices().status).toBe('loaded');
      expect(store.lowestPrices().query).toBe('cafe');
      // Vazio chega como `loaded`: a tela escolhe o empty de busca (AC-09).
      expect(store.lowestPrices().data).toEqual([]);
    });

    it('com buscas sobrepostas, a última resposta vence', async () => {
      const first = store.loadLowestPrices('c');
      const second = store.loadLowestPrices('cafe');

      const cafe: LowestPricesResponse = { markets: [coffeeGroup()] };
      http.expectOne(url('/lowest-prices?q=cafe')).flush(cafe);
      await second;

      http
        .expectOne(url('/lowest-prices?q=c'))
        .flush({ markets: [{ market: 'Rede Norte', items: [] }] });
      await first;

      expect(store.lowestPrices().query).toBe('cafe');
      expect(store.lowestPrices().data).toEqual(cafe.markets);
    });

    it('abrir o item não zera busca nem lista; voltar repete a mesma consulta (CD-10/AC-11)', async () => {
      const loaded = store.loadLowestPrices('cafe');
      const response: LowestPricesResponse = { markets: [coffeeGroup()] };
      http.expectOne(url('/lowest-prices?q=cafe')).flush(response);
      await loaded;

      const detail = store.loadItemLowestPrices('cafe');
      http.expectOne(url('/lowest-prices/cafe')).flush(itemPrices());
      await detail;

      // A seção da lista vive no store (root): navegar ao drill-down não a
      // invalida nem dispara um novo GET completo ao voltar (AC-11).
      expect(store.lowestPrices().query).toBe('cafe');
      expect(store.lowestPrices().status).toBe('loaded');
      expect(store.lowestPrices().data).toEqual(response.markets);

      const back = store.loadLowestPrices();
      http.expectOne(url('/lowest-prices?q=cafe')).flush(response);
      await back;

      expect(store.lowestPrices().query).toBe('cafe');
      expect(store.lowestPrices().data).toEqual(response.markets);
    });
  });

  describe('menores preços do item (drill-down)', () => {
    it('sem seleção, repetir não faz chamada', async () => {
      await store.loadItemLowestPrices();

      expect(store.itemLowestPrices().selectedItem).toBeNull();
      expect(store.itemLowestPrices().status).toBe('loading');
    });

    it('seleciona o item e aplica as linhas por mercado do serviço (AC-05/AC-06)', async () => {
      const load = store.loadItemLowestPrices('cafe');
      expect(store.itemLowestPrices().status).toBe('loading');
      expect(store.itemLowestPrices().selectedItem).toBe('cafe');

      const response = itemPrices();
      http.expectOne(url('/lowest-prices/cafe')).flush(response);
      await load;

      expect(store.itemLowestPrices().status).toBe('loaded');
      expect(store.itemLowestPrices().error).toBeNull();
      // Uma linha por mercado, A→Z, como o serviço entregou (RN-06/RN-12).
      expect(store.itemLowestPrices().data).toEqual(response);
      expect(store.itemLowestPrices().data?.markets[0].market).toBe('Atacadão');
    });

    it('404 vira notFound (não error) e mantém o item para o voltar (AC-12/R-5)', async () => {
      const failing = store.loadItemLowestPrices('item-inexistente');
      http
        .expectOne(url('/lowest-prices/item-inexistente'))
        .flush(
          { statusCode: 404, message: 'Item não encontrado no histórico' },
          { status: 404, statusText: 'Not Found' },
        );
      await failing;

      expect(store.itemLowestPrices().status).toBe('notFound');
      expect(store.itemLowestPrices().error).toBeNull();
      expect(store.itemLowestPrices().data).toBeNull();
      expect(store.itemLowestPrices().selectedItem).toBe('item-inexistente');
    });

    it('demais erros viram error e o retry sem argumento refaz o MESMO item (AC-14/R-5)', async () => {
      const failing = store.loadItemLowestPrices('cafe');
      http
        .expectOne(url('/lowest-prices/cafe'))
        .flush(
          { statusCode: 500, message: 'Erro interno' },
          { status: 500, statusText: 'Internal Server Error' },
        );
      await failing;

      expect(store.itemLowestPrices().status).toBe('error');
      expect(store.itemLowestPrices().error).toBe('Erro interno');

      const retry = store.loadItemLowestPrices();
      http.expectOne(url('/lowest-prices/cafe')).flush(itemPrices());
      await retry;

      expect(store.itemLowestPrices().status).toBe('loaded');
      expect(store.itemLowestPrices().error).toBeNull();
      expect(store.itemLowestPrices().data).toEqual(itemPrices());
    });

    it('resposta atrasada de outro item não sobrescreve a seleção', async () => {
      const first = store.loadItemLowestPrices('cafe');
      const second = store.loadItemLowestPrices('arroz');
      expect(store.itemLowestPrices().selectedItem).toBe('arroz');

      const arroz: LowestPriceByMarketResponse = {
        name: 'Arroz',
        nameNormalized: 'arroz',
        markets: [
          {
            market: 'Atacadão',
            lowestUnitPrice: 21.9,
            purchaseDate: '2026-10-02',
            quantity: 5,
            unit: 'kg',
          },
        ],
      };
      http.expectOne(url('/lowest-prices/arroz')).flush(arroz);
      await second;

      http.expectOne(url('/lowest-prices/cafe')).flush(itemPrices());
      await first;

      expect(store.itemLowestPrices().selectedItem).toBe('arroz');
      expect(store.itemLowestPrices().data).toEqual(arroz);
    });

    it('401 chega como erro de carga; o redirect ao login é do interceptor (AC-15)', async () => {
      const failing = store.loadItemLowestPrices('cafe');
      http
        .expectOne(url('/lowest-prices/cafe'))
        .flush(
          { statusCode: 401, message: 'Não autorizado' },
          { status: 401, statusText: 'Unauthorized' },
        );
      await failing;

      expect(store.itemLowestPrices().status).toBe('error');
      expect(store.itemLowestPrices().error).toBe('Não autorizado');
      expect(store.itemLowestPrices().selectedItem).toBe('cafe');
    });
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  LowestPricesResponse,
  PurchaseDetailResponse,
  PurchaseListResponse,
} from '@lista/contracts';
import { PriceHistoryStore } from './price-history-store';

const BASE_URL = 'http://localhost:3002/api/price-history';
const url = (path = ''): string => `${BASE_URL}${path}`;

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
    it('aplica os itens do serviço sem agregar ou calcular no cliente (AC-08/AC-10)', async () => {
      const response: LowestPricesResponse = {
        items: [
          { name: 'Café', nameNormalized: 'cafe', lowestUnitPrice: 7.5 },
          { name: 'Arroz', nameNormalized: 'arroz', lowestUnitPrice: 21.9 },
        ],
      };

      const load = store.loadLowestPrices();
      expect(store.lowestPrices().status).toBe('loading');
      http.expectOne(url('/lowest-prices')).flush(response);
      await load;

      expect(store.lowestPrices().status).toBe('loaded');
      expect(store.lowestPrices().error).toBeNull();
      // Agregação, min e nome de exibição são do serviço (RN-06/RN-07): os itens
      // chegam idênticos, com o menor preço pronto (R$ 7,50 — AC-10).
      expect(store.lowestPrices().data).toEqual(response.items);
      expect(store.lowestPrices().data[0].lowestUnitPrice).toBe(7.5);
    });

    it('busca vai ao serviço como q e registra o termo (AC-09)', async () => {
      const load = store.loadLowestPrices('cafe');
      expect(store.lowestPrices().query).toBe('cafe');

      const response: LowestPricesResponse = {
        items: [{ name: 'Café', nameNormalized: 'cafe', lowestUnitPrice: 7.5 }],
      };
      http.expectOne(url('/lowest-prices?q=cafe')).flush(response);
      await load;

      expect(store.lowestPrices().status).toBe('loaded');
      // "busca `cafe` acha `cafe`" é normalização do serviço (RN-06): aqui só
      // repassamos a resposta — nenhum filtro de nome no cliente.
      expect(store.lowestPrices().data).toEqual(response.items);
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
      http.expectOne(url('/lowest-prices?q=cafe')).flush({ items: [] });
      await retry;

      expect(store.lowestPrices().status).toBe('loaded');
      expect(store.lowestPrices().query).toBe('cafe');
      // Vazio chega como `loaded`: a tela escolhe o empty de busca (AC-12).
      expect(store.lowestPrices().data).toEqual([]);
    });

    it('com buscas sobrepostas, a última resposta vence', async () => {
      const first = store.loadLowestPrices('c');
      const second = store.loadLowestPrices('cafe');

      const cafe: LowestPricesResponse = {
        items: [{ name: 'Café', nameNormalized: 'cafe', lowestUnitPrice: 7.5 }],
      };
      http.expectOne(url('/lowest-prices?q=cafe')).flush(cafe);
      await second;

      http
        .expectOne(url('/lowest-prices?q=c'))
        .flush({ items: [{ name: 'Cuscuz', nameNormalized: 'cuscuz', lowestUnitPrice: 5 }] });
      await first;

      expect(store.lowestPrices().query).toBe('cafe');
      expect(store.lowestPrices().data).toEqual(cafe.items);
    });
  });
});

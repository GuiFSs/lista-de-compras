import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  withDisabledInitialNavigation,
} from '@angular/router';
import type { PurchaseListResponse } from '@lista/contracts';
import { SESSION_STORAGE_KEY, SessionService, authInterceptor } from '../auth';
import { PriceHistoryApiService } from './price-history-api.service';
import { PRICE_HISTORY_API_BASE_URL } from './price-history-config';

// Base literal: é a prova de que a PWA chama o price-history-service direto em
// localhost:3002 (ADR 0010), e não uma URL montada pelo teste.
const BASE_URL = 'http://localhost:3002/api/price-history';
const url = (path = ''): string => `${BASE_URL}${path}`;

function base64Url(value: string): string {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({ sub: 'user-1', iss: 'auth-service', iat: now, exp: now + 3600 }),
  );
  return `${header}.${payload}.${base64Url('assinatura-irrelevante')}`;
}

@Component({ template: '' })
class StubComponent {}

describe('PriceHistoryApiService', () => {
  let api: PriceHistoryApiService;
  let http: HttpTestingController;
  let session: SessionService;
  let router: Router;
  let token: string;

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'login', component: StubComponent },
            { path: 'historico', component: StubComponent },
            { path: 'menor-preco/:item', component: StubComponent },
          ],
          withDisabledInitialNavigation(),
        ),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(PriceHistoryApiService);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
    token = makeSessionToken();
    session.login(token);
  });

  afterEach(() => {
    session.logout();
    http.verify();
    window.localStorage.clear();
  });

  it('lista compras em localhost:3002 com Authorization (ADR 0010 / AC-21)', () => {
    api.listPurchases().subscribe();

    const req = http.expectOne(url('/purchases'));
    expect(req.request.method).toBe('GET');
    expect(req.request.url).toBe('http://localhost:3002/api/price-history/purchases');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    const response: PurchaseListResponse = { purchases: [] };
    req.flush(response);
  });

  it('detalhe da compra vai em /purchases/{id} com Authorization (AC-11)', () => {
    api.getPurchase('completion-1').subscribe();

    const req = http.expectOne(url('/purchases/completion-1'));
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({
      id: 'completion-1',
      market: 'Mercado Central',
      purchaseDate: '2026-10-15',
      items: [],
      createdAt: '2026-10-15T12:00:00.000Z',
    });
  });

  it('menores preços sem busca não envia query (AC-08)', () => {
    api.getLowestPrices().subscribe();

    const req = http.expectOne(url('/lowest-prices'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toHaveLength(0);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({ markets: [] });
  });

  it('busca vai ao serviço como query q (AC-09)', () => {
    api.getLowestPrices('cafe').subscribe();

    const req = http.expectOne(url('/lowest-prices?q=cafe'));
    expect(req.request.params.get('q')).toBe('cafe');
    req.flush({ markets: [] });
  });

  it('menores preços do item codificam acento no segmento com Authorization (AC-05/R-2)', () => {
    api.getLowestPricesByItem('café').subscribe();

    const req = http.expectOne(`${BASE_URL}/lowest-prices/caf%C3%A9`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({ name: 'Café', nameNormalized: 'cafe', markets: [] });
  });

  it('nome com barra sobrevive ao caminho como %2F (round-trip R-2)', () => {
    api.getLowestPricesByItem('leite/açúcar').subscribe();

    const req = http.expectOne(`${BASE_URL}/lowest-prices/leite%2Fa%C3%A7%C3%BAcar`);
    expect(req.request.url).toBe(
      'http://localhost:3002/api/price-history/lowest-prices/leite%2Fa%C3%A7%C3%BAcar',
    );
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({ name: 'Leite/Açúcar', nameNormalized: 'leite/açúcar', markets: [] });
  });

  it('devolve as linhas por mercado como o serviço mandou, sem reordenar (RN-12)', () => {
    let response: unknown;
    api.getLowestPricesByItem('cafe').subscribe((value) => (response = value));

    const payload = {
      name: 'Café',
      nameNormalized: 'cafe',
      markets: [
        {
          market: 'Zaffari',
          lowestUnitPrice: 9.5,
          purchaseDate: '2026-10-10',
          quantity: 1,
          unit: 'pacote' as const,
        },
        {
          market: 'Atacadão',
          lowestUnitPrice: 7.5,
          purchaseDate: '2026-10-12',
          quantity: 2,
          unit: 'pacote' as const,
        },
      ],
    };
    http.expectOne(`${BASE_URL}/lowest-prices/cafe`).flush(payload);

    expect(response).toEqual(payload);
  });

  it('não anexa Authorization sem sessão (o 401 fica com o interceptor)', () => {
    session.logout();

    api.listPurchases().subscribe();

    const req = http.expectOne(url('/purchases'));
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ purchases: [] });
  });

  it('401 no drill-down do item encerra a sessão e volta ao login (AC-15)', async () => {
    await router.navigate(['/menor-preco/cafe']);
    const navigateSpy = vi.spyOn(router, 'navigate');
    let error: unknown;

    api
      .getLowestPricesByItem('cafe')
      .subscribe({ error: (value: unknown) => (error = value) });

    const req = http.expectOne(`${BASE_URL}/lowest-prices/cafe`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush(
      { statusCode: 401, message: 'Não autorizado' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(session.hasValidSession()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/menor-preco/cafe' },
    });
  });

  it('401 no histórico encerra a sessão e volta ao login (AC-18)', async () => {
    await router.navigate(['/historico']);
    const navigateSpy = vi.spyOn(router, 'navigate');
    let error: unknown;

    api.listPurchases().subscribe({ error: (value: unknown) => (error = value) });

    const req = http.expectOne(url('/purchases'));
    req.flush(
      { statusCode: 401, message: 'Não autorizado' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(session.hasValidSession()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/historico' },
    });
  });
});

describe('PriceHistoryApiService — base configurável (ADR 0010 §3)', () => {
  it('usa a base do token PRICE_HISTORY_API_BASE_URL no lugar do default', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PRICE_HISTORY_API_BASE_URL, useValue: 'https://api.exemplo.test' },
      ],
    });
    const api = TestBed.inject(PriceHistoryApiService);
    const http = TestBed.inject(HttpTestingController);

    api.listPurchases().subscribe();

    const req = http.expectOne('https://api.exemplo.test/api/price-history/purchases');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ purchases: [] });
    http.verify();
  });
});

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
import {
  CreateShoppingListItemRequest,
  MarkItemPurchasedRequest,
  UpdateShoppingListItemRequest,
} from '@lista/contracts';
import { SessionService, authInterceptor } from '../../../core/auth';
import { SHOPPING_LIST_API_BASE_URL } from '../../../core/shopping-list';
import { ShoppingListApiService } from './shopping-list-api.service';

// Base literal: é a prova de que a PWA chama o serviço direto em localhost:3000
// (ADR 0009), e não uma URL montada pelo teste.
const BASE_URL = 'http://localhost:3000/api/shopping-list';
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

describe('ShoppingListApiService', () => {
  let api: ShoppingListApiService;
  let http: HttpTestingController;
  let session: SessionService;
  let token: string;

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([], withDisabledInitialNavigation()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(ShoppingListApiService);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    token = makeSessionToken();
    session.login(token);
  });

  afterEach(() => {
    session.logout();
    http.verify();
    window.localStorage.clear();
  });

  it('lê a lista ativa em localhost:3000 com Authorization (ADR 0009 + interceptor)', () => {
    api.getActiveList().subscribe();

    const req = http.expectOne(BASE_URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.url).toBe('http://localhost:3000/api/shopping-list');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({ items: [] });
  });

  it('cria item com POST /items e o payload do contrato', () => {
    const request: CreateShoppingListItemRequest = {
      name: 'Café',
      plannedQuantity: 2,
      unit: 'pacote',
      plannedPrice: 18.9,
      duplicateResolution: 'sum-planned-quantity',
    };
    api.createItem(request).subscribe();

    const req = http.expectOne(url('/items'));
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(req.request.body).toEqual(request);
    req.flush({ items: [] });
  });

  it('edita item com PATCH /items/:id e o payload do contrato', () => {
    const request: UpdateShoppingListItemRequest = { name: 'Arroz', plannedQuantity: null };
    api.updateItem('item-1', request).subscribe();

    const req = http.expectOne(url('/items/item-1'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(request);
    req.flush({ items: [] });
  });

  it('exclui item com DELETE /items/:id', () => {
    api.removeItem('item-1').subscribe();

    const req = http.expectOne(url('/items/item-1'));
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({ items: [] });
  });

  it('restaura com POST /items/:id/restore sem corpo', () => {
    api.restoreItem('item-1').subscribe();

    const req = http.expectOne(url('/items/item-1/restore'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ items: [] });
  });

  it('marca como comprado com PUT /items/:id/purchase', () => {
    const request: MarkItemPurchasedRequest = { purchasedQuantity: 1.5, unit: 'kg', unitPrice: 9.9 };
    api.markItemPurchased('item-1', request).subscribe();

    const req = http.expectOne(url('/items/item-1/purchase'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush({ items: [] });
  });

  it('desmarca com DELETE /items/:id/purchase', () => {
    api.unmarkItemPurchased('item-1').subscribe();

    const req = http.expectOne(url('/items/item-1/purchase'));
    expect(req.request.method).toBe('DELETE');
    req.flush({ items: [] });
  });

  it('conclui a compra com POST /checkout sem corpo', () => {
    api.checkout().subscribe();

    const req = http.expectOne(url('/checkout'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ items: [] });
  });

  it('não anexa Authorization sem sessão (o 401 fica com o interceptor)', () => {
    session.logout();

    api.getActiveList().subscribe();

    const req = http.expectOne(BASE_URL);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ items: [] });
  });
});

describe('ShoppingListApiService — base configurável (ADR 0009 §3)', () => {
  it('usa a base do token SHOPPING_LIST_API_BASE_URL no lugar do default', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SHOPPING_LIST_API_BASE_URL, useValue: 'https://api.exemplo.test' },
      ],
    });
    const api = TestBed.inject(ShoppingListApiService);
    const http = TestBed.inject(HttpTestingController);

    api.getActiveList().subscribe();

    const req = http.expectOne('https://api.exemplo.test/api/shopping-list');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ items: [] });
    http.verify();
  });
});

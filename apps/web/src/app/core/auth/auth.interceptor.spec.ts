// Testes do interceptor HTTP de autenticação (RN12/AC-13).
//
// `Authorization: Bearer <jwt>` em requisições autenticadas; endpoint público
// de login ignorado (sem header e sem tratamento de 401 — AC-03); 401 numa
// requisição que carregava o token → logout + volta ao login com `returnUrl`.
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
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
import { AUTH_API_LOGIN_URL } from './auth-config';
import { authInterceptorFn } from './auth.interceptor';
import { SESSION_STORAGE_KEY, SessionService } from './session.service';

// ── Token factory (shape `JwtClaims`; assinatura irrelevante p/ decode) ──
function base64Url(value: string): string {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeValidToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: 'user-1', iss: 'auth-service', iat: now, exp: now + 3600 };
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  return `${header}.${base64Url(JSON.stringify(payload))}.${base64Url('fake')}`;
}

@Component({ template: '' })
class StubComponent {}

describe('authInterceptor', () => {
  let session: SessionService;
  let router: Router;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'login', component: StubComponent },
            { path: 'lista', component: StubComponent },
          ],
          withDisabledInitialNavigation(),
        ),
        provideHttpClient(withInterceptors([authInterceptorFn])),
        provideHttpClientTesting(),
      ],
    });
    session = TestBed.inject(SessionService);
    session.logout(); // estado limpo mesmo se o TestBed não resetar
    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    session.logout();
    http.verify();
    window.localStorage.clear();
  });

  it('anexa Authorization: Bearer <token> com sessão ativa', () => {
    const token = makeValidToken();
    session.login(token);

    TestBed.inject(HttpClient)
      .get('/api/items')
      .subscribe({ error: () => undefined });

    const req = http.expectOne((r) => r.url === '/api/items');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({});
  });

  it('sem sessão, não anexa o header', () => {
    TestBed.inject(HttpClient)
      .get('/api/items')
      .subscribe({ error: () => undefined });

    const req = http.expectOne((r) => r.url === '/api/items');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('não anexa header nem trata 401 no endpoint público de login', () => {
    session.login(makeValidToken());
    const navigateSpy = vi.spyOn(router, 'navigate');
    let error: unknown;

    TestBed.inject(HttpClient)
      .post(AUTH_API_LOGIN_URL, { username: 'x', password: 'y' })
      .subscribe({ error: (e) => (error = e) });

    const req = http.expectOne((r) => r.url === AUTH_API_LOGIN_URL);
    expect(req.request.headers.has('Authorization')).toBe(false);
    // 401 aqui é "credenciais inválidas" (AC-03): a sessão NÃO é encerrada.
    req.flush(
      { statusCode: 401, message: 'Credenciais inválidas' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(session.hasValidSession()).toBe(true);
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeTruthy();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('401 numa requisição autenticada → logout + volta ao login com returnUrl', async () => {
    const token = makeValidToken();
    session.login(token);
    await router.navigate(['/lista']); // URL atual da "tela" autenticada
    const navigateSpy = vi.spyOn(router, 'navigate');
    let error: unknown;

    TestBed.inject(HttpClient)
      .get('/api/items')
      .subscribe({ error: (e) => (error = e) });

    const req = http.expectOne((r) => r.url === '/api/items');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush(
      { statusCode: 401, message: 'Não autorizado' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(error).toBeInstanceOf(HttpErrorResponse);
    // Sessão encerrada (storage limpo) e redirect preservando a URL (AC-12).
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(session.hasValidSession()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/lista' },
    });
  });
});
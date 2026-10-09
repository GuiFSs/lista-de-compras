// Testes do SessionService — núcleo da sessão (RN11/AC-12/AC-13).
//
// Padrão do repo (skill angular-developer): fake timers para o timer de
// expiração, spy no localStorage, e o router real de `provideRouter` (sem
// mock) para o redirecionamento na expiração.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  withDisabledInitialNavigation,
} from '@angular/router';
import { SESSION_STORAGE_KEY, SessionService } from './session.service';

// ── Token factory (payload real de `JwtClaims`, assinatura fake) ──────────
// `decodeJwt` da PWA só decodifica (RN12/ADR 0007) — assinatura não importa
// aqui; o que vale é o payload e o `exp`.
function base64Url(value: string): string {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeToken(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  return `${header}.${body}.${base64Url('assinatura-fake')}`;
}

function makeValidToken(expiresInSeconds = 3600): string {
  const now = Math.floor(Date.now() / 1000);
  return makeToken({
    sub: 'user-1',
    iss: 'auth-service',
    iat: now,
    exp: now + expiresInSeconds,
  });
}

@Component({ template: '' })
class LoginStub {}

describe('SessionService', () => {
  let service: SessionService;
  let router: Router;

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.localStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'login', component: LoginStub }],
          withDisabledInitialNavigation(),
        ),
      ],
    });
    service = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    service.logout();
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('login() grava o token no localStorage e marca a sessão como ativa', () => {
    const token = makeValidToken();

    service.login(token);

    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBe(token);
    expect(service.getToken()).toBe(token);
    expect(service.hasValidSession()).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('logout() remove o token do localStorage e encerra a sessão', () => {
    service.login(makeValidToken());
    expect(service.hasValidSession()).toBe(true);

    service.logout();

    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(service.getToken()).toBeNull();
    expect(service.hasValidSession()).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('recarrega a sessão do localStorage ao recriar o serviço (recarga, AC-12)', () => {
    const token = makeValidToken();
    window.localStorage.setItem(SESSION_STORAGE_KEY, token);

    // Nova instância do serviço, como numa recarga de página: o estado em
    // memória nasce do que está no storage.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'login', component: LoginStub }],
          withDisabledInitialNavigation(),
        ),
      ],
    });
    service = TestBed.inject(SessionService);

    expect(service.getToken()).toBe(token);
    expect(service.hasValidSession()).toBe(true);
  });

  it('isExpired() decodifica o payload e compara exp (RN11/AC-13)', () => {
    // Sem token → sem sessão.
    expect(service.isExpired()).toBe(true);

    // Token válido (exp no futuro) → não expirado.
    service.login(makeValidToken(3600));
    expect(service.isExpired()).toBe(false);

    // Exp no passado → expirado e sem sessão válida.
    service.login(makeValidToken(-10));
    expect(service.isExpired()).toBe(true);
    expect(service.hasValidSession()).toBe(false);

    // Payload ilegível (não é um JWT) → tratado como expirado.
    service.login('nao-e-um-jwt');
    expect(service.isExpired()).toBe(true);
    expect(service.hasValidSession()).toBe(false);
  });

  it('timer de expiração: ao expirar, faz logout e redireciona para /login', async () => {
    const navigateSpy = vi
      .spyOn(router, 'navigate')
      .mockResolvedValue(true);

    service.login(makeValidToken(5)); // expira em 5s

    // Dentro da janela: sessão ativa, nada de redirect.
    await vi.advanceTimersByTimeAsync(4_000);
    expect(service.hasValidSession()).toBe(true);
    expect(navigateSpy).not.toHaveBeenCalled();

    // Passou do exp: logout + volta à tela de login (RN11).
    await vi.advanceTimersByTimeAsync(1_500);
    expect(service.hasValidSession()).toBe(false);
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('logout manual cancela o timer de expiração', async () => {
    const navigateSpy = vi
      .spyOn(router, 'navigate')
      .mockResolvedValue(true);

    service.login(makeValidToken(5));
    service.logout(); // encerramento manual (RN11): nada mais a expirar

    await vi.advanceTimersByTimeAsync(10_000);

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(service.hasValidSession()).toBe(false);
  });

  it('login com token já expirado não agenda timer nem abre sessão', async () => {
    const navigateSpy = vi
      .spyOn(router, 'navigate')
      .mockResolvedValue(true);

    service.login(makeValidToken(-5));

    await vi.advanceTimersByTimeAsync(60_000);

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(service.hasValidSession()).toBe(false);
  });
});
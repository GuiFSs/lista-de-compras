// Testes dos guards de rota — RN10/AC12 (returnUrl, deep link, recarga).
//
// Usa o `RouterTestingHarness` com as rotas REAIS da aplicação (skill
// angular-developer / router-testing): guard, lazy do login e shell
// autenticados são exercitados juntos, sem mocks de Router.
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appRoutes } from '../../app.routes';
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

describe('guards de autenticação', () => {
  let session: SessionService;
  let router: Router;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(appRoutes), provideLocationMocks()],
    });
    session = TestBed.inject(SessionService);
    session.logout(); // garante estado limpo mesmo se o TestBed não resetar
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create('/');
  });

  afterEach(() => {
    session.logout();
    window.localStorage.clear();
  });

  it('sem sessão, a rota raiz cai na tela de login (AC1/AC12)', async () => {
    expect(router.url).toBe('/login');
    expect(harness.fixture.nativeElement.querySelector('app-login')).toBeTruthy();
    // Login é tela cheia: fora do shell (sem app-bar).
    expect(harness.fixture.nativeElement.querySelector('.app-bar')).toBeNull();
  });

  it('deep link sem sessão → /login com a URL pretendida em returnUrl (AC12)', async () => {
    await harness.navigateByUrl('/compras/2026');
    await harness.fixture.whenStable();

    // `router.url` inclui a query string; o caminho é /login.
    expect(router.url.split('?')[0]).toBe('/login');
    const returnUrl = router.parseUrl(router.url).queryParamMap.get('returnUrl');
    expect(returnUrl).toBe('/compras/2026');
  });

  it('recarga com sessão válida continua na rota, dentro do shell (AC13)', async () => {
    // Simula a recarga: o token já está no localStorage antes de o serviço
    // de sessão nascer — ele será criado a partir do storage quando o guard
    // rodar (AC12).
    window.localStorage.setItem(SESSION_STORAGE_KEY, makeValidToken());

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter(appRoutes), provideLocationMocks()],
    });
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create('/compras/2026');
    await harness.fixture.whenStable();

    expect(router.url).toBe('/compras/2026');
    // Shell autenticado renderizado (app-bar com logout) sem bottom nav.
    expect(harness.fixture.nativeElement.querySelector('.app-bar')).toBeTruthy();
    expect(harness.fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('após o login, returnUrl devolve à rota original (AC12)', async () => {
    // 1) deep link sem sessão → login guarda a URL pretendida
    await harness.navigateByUrl('/compras/2026');
    await harness.fixture.whenStable();
    const returnUrl = router
      .parseUrl(router.url)
      .queryParamMap.get('returnUrl');
    expect(returnUrl).toBe('/compras/2026');

    // 2) login bem-sucedido (tela da T11 fará `navigateByUrl(returnUrl)`)
    session.login(makeValidToken());
    await harness.navigateByUrl(returnUrl ?? '/');
    await harness.fixture.whenStable();

    expect(router.url).toBe('/compras/2026');
    // A rota profunda desconhecida renderiza o placeholder autenticado
    // dentro do shell (não cai fora da navegação).
    expect(harness.fixture.nativeElement.querySelector('app-not-found')).toBeTruthy();
  });

  it('sem sessão, /login renderiza a tela de login', async () => {
    await harness.navigateByUrl('/login?returnUrl=%2Fcompras%2F2026');
    await harness.fixture.whenStable();

    // `router.url` inclui a query string; o caminho é /login.
    expect(router.url.split('?')[0]).toBe('/login');
    expect(harness.fixture.nativeElement.querySelector('app-login')).toBeTruthy();
  });
});

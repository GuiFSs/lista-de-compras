// Testes da tela de login — estados do GUIA-DESIGN e ACs da spec (T11/T13).
//
// Padrão dos specs Angular do repo: TestBed standalone +
// HttpTestingController interceptando o POST direto ao auth-service (ADR 0006)
// — sem rede real e sem subir servidores.
//
// Mapeamento AC → cenário:
// - AC6: estado vazio — formulário limpo, sem mensagem de erro, botão
//   habilitado; submeter sem preencher NÃO envia requisição (validação local);
// - AC4: estado carregando — botão "Entrando…" desabilitado e toque repetido
//   não gera segunda requisição;
// - AC3: 401 → mensagem genérica visível na tela, campos preservados;
// - AC5: falha de rede → erro visível, inputs mantidos e nova tentativa
//   possível (termina em sucesso);
// - AC14: 429 → a mensagem do envelope canônico é exibida;
// - AC2/RN11: sucesso → JWT no `localStorage`, estado de sucesso e navegação;
// - `[attr.aria-invalid]` é binding reativo (não atributo estático).
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  Router,
  provideRouter,
  withDisabledInitialNavigation,
} from '@angular/router';
import { LoginComponent } from './login.component';
import { AUTH_API_LOGIN_URL } from '../../core/auth/auth-config';
import {
  SESSION_STORAGE_KEY,
  SessionService,
} from '../../core/auth/session.service';

/** Rota stub — na produção `/login` renderiza este componente. */
@Component({ template: '' })
class LoginRouteStub {}

// ── Token factory (payload real, assinatura fake — só o decode importa) ──
function base64Url(value: string): string {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeValidToken(expiresInSeconds = 3600): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64Url(
    JSON.stringify({
      sub: 'user-1',
      iss: 'auth-service',
      iat: now,
      exp: now + expiresInSeconds,
    }),
  );
  return `${header}.${body}.${base64Url('assinatura-fake')}`;
}

/** Corpo 200 do contrato de login (T3). */
function loginSuccessBody(token: string): {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
} {
  return { accessToken: token, tokenType: 'Bearer', expiresIn: 86400 };
}

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;
  let session: SessionService;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    window.localStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter(
          [{ path: 'login', component: LoginRouteStub }],
          withDisabledInitialNavigation(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    router = TestBed.inject(Router);
    // O componente lê `route.snapshot.queryParamMap` (returnUrl); na PWA ele
    // só é alcançado após uma navegação — navega-se para /login antes de
    // criá-lo. A navegação de sucesso é espiada (sem efeito real).
    await router.navigateByUrl('/login');
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    session = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    // Os FormControlName se ligam ao FormGroup num microtask: aguardar a
    // estabilidade antes de mexer no form (senão setValue lança
    // "Cannot find form control with name ...").
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify(); // nenhuma requisição pendente ou não esperada
    session.logout(); // cancela timer de expiração e limpa o storage
    window.localStorage.clear();
  });

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function input(selector: string): HTMLInputElement {
    const node = el().querySelector<HTMLInputElement>(selector);
    if (!node) throw new Error(`campo não encontrado: ${selector}`);
    return node;
  }

  function button(): HTMLButtonElement {
    const node = el().querySelector<HTMLButtonElement>('button');
    if (!node) throw new Error('botão de login não encontrado');
    return node;
  }

  function alertTexts(): string[] {
    return Array.from(el().querySelectorAll('[role="alert"]')).map(
      (node) => node.textContent?.trim() ?? '',
    );
  }

  function fill(username: string, password: string): void {
    fixture.componentInstance.form.setValue({ username, password });
    fixture.detectChanges();
  }

  function submitForm(): void {
    const form = el().querySelector('form');
    if (!form) throw new Error('formulário de login não encontrado');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  function expectLoginRequest() {
    return http.expectOne(
      (req) => req.url === AUTH_API_LOGIN_URL && req.method === 'POST',
    );
  }

  it('estado vazio: formulário limpo, sem erro e botão habilitado (AC6/AC1)', () => {
    expect(fixture.componentInstance.states()).toEqual({
      idle: true,
      loading: false,
      error: false,
      success: false,
    });
    expect(fixture.componentInstance.errorMessage()).toBe('');

    // Nenhuma mensagem de erro na tela (estado vazio).
    expect(alertTexts()).toEqual([]);

    // Botão primário pronto, habilitado, com rótulo normal.
    expect(button().disabled).toBe(false);
    expect(button().textContent).toContain('Entrar');
    expect(button().textContent).not.toContain('Entrando');

    // Campos identificados com rótulo visível (placeholder não substitui).
    expect(el().querySelector('label[for="username"]')?.textContent).toContain(
      'Usuário',
    );
    expect(el().querySelector('label[for="password"]')?.textContent).toContain(
      'Senha',
    );
    // AC10: a senha nunca é exibida em texto puro.
    expect(input('#password').type).toBe('password');
  });

  it('submeter com os campos vazios valida localmente e NÃO envia requisição (AC6)', () => {
    submitForm();

    // Nenhuma chamada ao auth-service — validação local apenas.
    // `match` varre TODAS as requisições abertas (qualquer URL).
    expect(http.match(() => true)).toHaveLength(0);

    expect(fixture.componentInstance.states()).toEqual({
      idle: true,
      loading: false,
      error: false,
      success: false,
    });
    expect(fixture.componentInstance.errorMessage()).toBe('');
    expect(alertTexts()).toEqual([]);
    expect(button().disabled).toBe(false);
  });

  it('estado carregando: botão "Entrando…" desabilitado e uma única requisição (AC4)', async () => {
    fill('ana', 'segredo');
    submitForm();

    expect(fixture.componentInstance.states().loading).toBe(true);
    expect(button().disabled).toBe(true);
    expect(button().textContent).toContain('Entrando…');

    // Toque repetido durante o envio não gera uma segunda requisição —
    // `expectOne` falharia se houvesse mais de uma.
    submitForm();
    const req = expectLoginRequest();
    expect(req.request.body).toEqual({ username: 'ana', password: 'segredo' });

    req.flush(loginSuccessBody(makeValidToken()));
    fixture.detectChanges();

    expect(fixture.componentInstance.states().loading).toBe(false);
    expect(button().disabled).toBe(false);
    expect(button().textContent).toContain('Entrar');
  });

  it('401: mensagem genérica visível, campos preservados e botão reabilitado (AC3)', () => {
    fill('ana', 'senha-errada');
    submitForm();

    const req = expectLoginRequest();
    req.flush(
      { statusCode: 401, message: 'Credenciais inválidas' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.states()).toEqual({
      idle: false,
      loading: false,
      error: true,
      success: false,
    });
    // Mensagem visível na tela (nunca só no console) e genérica — não
    // indica qual campo está incorreto.
    expect(fixture.componentInstance.errorMessage()).toBe(
      'Credenciais inválidas',
    );
    const texts = alertTexts();
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.every((text) => text === 'Credenciais inválidas')).toBe(true);

    // O que a pessoa digitou permanece na tela e o envio volta a ser possível.
    expect(input('#username').value).toBe('ana');
    expect(input('#password').value).toBe('senha-errada');
    expect(button().disabled).toBe(false);
    expect(button().textContent).toContain('Entrar');
  });

  it('falha de rede: erro visível, inputs mantidos e nova tentativa possível (AC5)', async () => {
    fill('ana', 'segredo');
    submitForm();

    const first = expectLoginRequest();
    first.error(new ProgressEvent('error')); // status 0 — sem resposta
    fixture.detectChanges();

    expect(fixture.componentInstance.states().error).toBe(true);
    expect(fixture.componentInstance.errorMessage()).toBe(
      'Erro de rede. Verifique sua conexão.',
    );
    expect(alertTexts().length).toBeGreaterThan(0);
    // Nada do que a pessoa digitou é perdido.
    expect(input('#username').value).toBe('ana');
    expect(input('#password').value).toBe('segredo');

    // Nova tentativa: envia de novo e desta vez conclui com sucesso.
    submitForm();
    const retry = expectLoginRequest();
    expect(retry.request.body).toEqual({ username: 'ana', password: 'segredo' });

    const token = makeValidToken();
    retry.flush(loginSuccessBody(token));
    fixture.detectChanges();

    expect(fixture.componentInstance.states().success).toBe(true);
    expect(fixture.componentInstance.states().error).toBe(false);
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBe(token);
  });

  it('429: a mensagem do envelope canônico do rate limit é exibida (AC14)', () => {
    fill('ana', 'segredo');
    submitForm();

    const req = expectLoginRequest();
    req.flush(
      {
        statusCode: 429,
        message: 'Muitas tentativas de login. Aguarde e tente novamente.',
      },
      { status: 429, statusText: 'Too Many Requests' },
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.states().error).toBe(true);
    expect(fixture.componentInstance.errorMessage()).toBe(
      'Muitas tentativas de login. Aguarde e tente novamente.',
    );
    expect(alertTexts()).toContain(
      'Muitas tentativas de login. Aguarde e tente novamente.',
    );
    expect(button().disabled).toBe(false);
  });

  it('sucesso: JWT no localStorage, estado de sucesso e navegação (AC2/RN11)', () => {
    fill('ana', 'segredo');
    submitForm();

    const token = makeValidToken();
    const req = expectLoginRequest();
    req.flush(loginSuccessBody(token));
    fixture.detectChanges();

    expect(fixture.componentInstance.states()).toEqual({
      idle: false,
      loading: false,
      error: false,
      success: true,
    });
    // RN11/AC13: o JWT fica armazenado no localStorage e a sessão é ativa.
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBe(token);
    expect(session.hasValidSession()).toBe(true);
    // Sem returnUrl → volta para a raiz da aplicação autenticada.
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    expect(alertTexts()).toEqual([]);
  });

  it('aria-invalid é binding reativo: false com valor, true quando o campo esvazia', () => {
    fill('ana', 'segredo');
    expect(input('#username').getAttribute('aria-invalid')).toBe('false');
    expect(input('#password').getAttribute('aria-invalid')).toBe('false');

    // Esvaziar o campo o torna inválido (required) — o atributo muda junto,
    // provando que é binding e não valor estático do template.
    fixture.componentInstance.form.get('username')?.setValue('');
    fixture.detectChanges();
    expect(input('#username').getAttribute('aria-invalid')).toBe('true');
    expect(input('#password').getAttribute('aria-invalid')).toBe('false');
  });
});

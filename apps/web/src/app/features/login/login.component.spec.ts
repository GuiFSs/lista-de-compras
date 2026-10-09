import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { AUTH_API_LOGIN_URL } from '../../core/auth/auth-config';
import { SessionService } from '../../core/auth/session.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const session = { login: vi.fn() };
  const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
  let http: HttpTestingController;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: session },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('mostra marca display e subtítulo na hierarquia de entrada (guia §4)', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector(
      '.login-brand__title',
    ) as HTMLHeadingElement;
    const subtitle = fixture.nativeElement.querySelector(
      '.login-brand__subtitle',
    ) as HTMLParagraphElement;

    expect(title.tagName).toBe('H1');
    expect(title.textContent?.trim()).toBe('Lista de Compras');
    expect(subtitle.textContent?.trim()).toBe('Entre para ver a lista');
  });

  it('não envia com campos vazios e mantém o estado vazio (AC-06)', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    fixture.componentInstance.onSubmit(new Event('submit'));
    fixture.detectChanges();

    http.expectNone(AUTH_API_LOGIN_URL);
    expect(fixture.componentInstance.form.invalid).toBe(true);
    expect(fixture.componentInstance.errorMessage()).toBe('');
  });

  it('desabilita o botão e impede uma segunda requisição durante o envio (AC-04)', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      username: 'lista',
      password: 'senha-local',
    });

    fixture.componentInstance.onSubmit(new Event('submit'));
    fixture.componentInstance.onSubmit(new Event('submit'));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Entrando…');

    const requests = http.match(AUTH_API_LOGIN_URL);
    expect(requests).toHaveLength(1);
    requests[0].flush({
      accessToken: 'jwt-valido',
      tokenType: 'Bearer',
      expiresIn: 86400,
    });

    expect(session.login).toHaveBeenCalledWith('jwt-valido');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('mostra erro genérico para credenciais inválidas e preserva os campos (AC-03)', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      username: 'lista',
      password: 'incorreta',
    });

    fixture.componentInstance.onSubmit(new Event('submit'));
    http.expectOne(AUTH_API_LOGIN_URL).flush(
      { statusCode: 401, message: 'Credenciais inválidas' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage()).toBe(
      'Credenciais inválidas',
    );
    expect(fixture.componentInstance.form.value).toEqual({
      username: 'lista',
      password: 'incorreta',
    });
    expect(fixture.nativeElement.textContent).toContain(
      'Credenciais inválidas',
    );
  });

  it('mantém os campos e permite nova tentativa após falha de rede (AC-05)', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      username: 'lista',
      password: 'senha-local',
    });

    fixture.componentInstance.onSubmit(new Event('submit'));
    http
      .expectOne(AUTH_API_LOGIN_URL)
      .error(new ProgressEvent('network error'));
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage()).toContain('Erro de rede');
    expect(fixture.componentInstance.form.value).toEqual({
      username: 'lista',
      password: 'senha-local',
    });

    fixture.componentInstance.onSubmit(new Event('submit'));
    http.expectOne(AUTH_API_LOGIN_URL).flush(
      { statusCode: 401, message: 'Credenciais inválidas' },
      { status: 401, statusText: 'Unauthorized' },
    );
  });

  it('exibe a mensagem do rate limit (AC-14)', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      username: 'lista',
      password: 'incorreta',
    });

    fixture.componentInstance.onSubmit(new Event('submit'));
    http.expectOne(AUTH_API_LOGIN_URL).flush(
      {
        statusCode: 429,
        message: 'Muitas tentativas de login. Aguarde e tente novamente.',
      },
      { status: 429, statusText: 'Too Many Requests' },
    );

    expect(fixture.componentInstance.errorMessage()).toContain(
      'Muitas tentativas',
    );
  });
});

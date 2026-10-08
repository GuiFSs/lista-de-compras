// Tela de login — mobile-first, 4 estados (vazio/carregando/erro/sucesso).
//
// Integração com o auth-service via HTTP (ADR 0006 — PWA chama diretamente
// http://localhost:3001). O SessionService armazena o JWT no localStorage
// e o interceptor o anexa nas requisições subsequentes.
//
// Contrato (T3/PLAN.md):
//   POST /api/auth/login
//   200: { accessToken, tokenType: "Bearer", expiresIn: 86400 }
//   Erro canônico: { statusCode: number, message: string } (400/401/429/500)
//
// A PWA consome apenas `statusCode` e `message` do envelope — nunca `error`
// (campo opcional, 🟠-1 do PLAN.md).

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { AUTH_API_LOGIN_URL } from '../../core/auth/auth-config';
import { SessionService } from '../../core/auth/session.service';
import { sanitizeReturnUrl } from '../../core/auth/return-url';

/** Resposta de sucesso do auth-service (T3). */
interface LoginSuccessResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

/** Envelope de erro canônico (T3/🟠-1). */
interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Form reativo com validação local (campos obrigatórios)
  readonly form: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  // Estados da tela (AC-01/AC-03/AC-04/AC-05/AC-06/AC-09/AC-10/AC-11)
  readonly states = signal({
    idle: true,
    loading: false,
    error: false,
    success: false,
  });

  // Mensagem de erro exibida na tela (apenas statusCode/message do envelope canônico)
  readonly errorMessage = signal('');

  // Controle de double-submit na rede (AC-04)
  private isSubmitting = false;

  // Rastreia qual campo tem focus para styling de focus
  private focusedField: 'username' | 'password' | null = null;

  /**
   * onSubmit — chamado pelo form (ngSubmit).
   * AC-04: preventDefault, marcado de loading, só uma requisição.
   * Validação local: campos obrigatórios impedem submit sem enviar (validação visual only).
   */
  onSubmit(event: Event): void {
    event.preventDefault();

    // Impede double-submit na rede (AC-04)
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    // Se o formulário não é válido (campos vazios), não envia
    if (this.form.invalid) {
      this.states.update((s) => ({ ...s, idle: true, loading: false, error: false, success: false }));
      this.errorMessage.set('');
      this.isSubmitting = false;
      return;
    }

    // Formulário válido — disparar login
    this.login();
  }

  /**
   * login() — lógica de envio.
   * Chama o endpoint POST /api/auth/login e trata sucesso/erro.
   * AC-04: botão com rótulo "Entrando…" + disabled, impede envio duplicado.
   */
  private login(): void {
    const username = this.form.get('username')?.value as string;
    const password = this.form.get('password')?.value as string;

    // Marcar estado loading (AC-04: botão "Entrando…" + disabled)
    this.states.update((s) => ({ ...s, idle: false, loading: true, error: false, success: false }));
    this.errorMessage.set('');

    this.http.post<LoginSuccessResponse>(AUTH_API_LOGIN_URL, { username, password }).subscribe({
      next: (response) => this.handleLoginSuccess(response.accessToken),
      error: (err: HttpErrorResponse) => this.handleLoginError(err),
    });
  }

  /**
   * handleLoginSuccess — JWT obtido; chama sessionService.login(token) e navega.
   * O SessionService armazena no localStorage e inicia timer 24h (RN11/AC-13).
   * RN11: JWT validade por 24h, sem refresh token. Ao expirar, logout + redirect.
   */
  private handleLoginSuccess(token: string): void {
    this.isSubmitting = false;
    this.session.login(token);
    this.states.update((s) => ({ ...s, idle: false, loading: false, error: false, success: true }));

    // Navega para a rota original (returnUrl) ou a raiz
    const returnUrl = sanitizeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
    const targetUrl = returnUrl || '/';
    void this.router.navigateByUrl(targetUrl);
  }

  /**
   * handleLoginError — mensagem genérica consumindo apenas statusCode/message do envelope.
   * Nunca usa `error` (campo opcional do ApiErrorResponse — 🟠-1 do PLAN.md).
   * Mensagens consumidas:
   *  - 401: "Credenciais inválidas" (AC-03) — nunca distingue campo
   *  - 429: "Muitas tentativas de login..." (AC-14)
   *  - 5xx/Network: "Erro interno" ou "Erro de rede" (AC-05)
   */
  private handleLoginError(err: HttpErrorResponse): void {
    this.isSubmitting = false;
    this.states.update((s) => ({ ...s, idle: false, loading: false, error: true, success: false }));

    // Extrair mensagem do envelope canônico (T3)
    const body = err.error as ApiErrorResponse | null;
    if (err.status === 0) {
      // Falha de rede (sem resposta do servidor)
      this.errorMessage.set('Erro de rede. Verifique sua conexão.');
    } else if (body && typeof body.message === 'string') {
      this.errorMessage.set(body.message);
    } else {
      // Fallback genérico
      this.errorMessage.set('Erro interno. Tente novamente.');
    }
  }

  /* ----- helpers de template ----- */

  get f() {
    return this.form.controls;
  }

  isFocused(field: 'username' | 'password'): boolean {
    return this.focusedField === field;
  }

  onFocus(field: 'username' | 'password'): void {
    this.focusedField = field;
  }

  onBlur(): void {
    this.focusedField = null;
  }
}

import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  // Form reativo com validação local (campos obrigatórios)
  form!: FormGroup;

  // Estados da tela (AC1/AC3/AC4/AC5/AC6/AC9/AC10/AC11)
  // Usamos 'states' (plural) no componente
  states = {
    idle: true,   // vazio / pronto para submit
    loading: false,
    error: false,
    success: false,
  };

  // Bandeira de submit já processado (campos vazios impedem envio)
  submitted = false;

  // Mensagem de erro exibida na tela (apenas statusCode/message do envelope canônico)
  errorMessage = '';

  // Controle de double-submit na rede (AC4)
  private isSubmitting = false;

  // Rastreia qual campo tem focus para styling de focus
  private focusedField: 'username' | 'password' | null = null;

  @Output() readonly loginSuccess = new EventEmitter<void>();

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  /**
   * onSubmit($event) — chamado pelo form (ngSubmit).
   * AC4: preventDefault, marcado de loading, só uma requisição.
   * Validação local: campos obrigatórios impedem submit sem enviar (validação visual only).
   */
  onSubmit(event: Event): void {
    event.preventDefault();

    // Impede double-submit na rede (AC4)
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    // Marcar que o submit foi tentado
    this.submitted = true;

    // Se o formulário não é válido (campos vazios), só marca estado idle, não envia
    if (this.form.invalid) {
      // Resetar bandeira se o usuário corrigir e submeter novamente
      this.states = { idle: true, loading: false, error: false, success: false };
      this.errorMessage = '';
      this.isSubmitting = false;
      this.submitted = false; // reset para nova tentativa
      return; // não envia requisição de login
    }

    // Formulário válido — disparar login
    this.login();
  }

  /**
   * login() — lógica de envio.
   * Se chegou aqui, o formulário é válido (ambos os campos têm conteúdo).
   * Chama o endpoint POST /api/auth/login e trata sucesso/erro.
   * AC4: botão com rótulo "Entrando…" + disabled, impede envio duplicado.
   */
  private login(): void {
    // Marcar estado loading (AC4: botão "Entrando…" + disabled)
    this.states = { idle: false, loading: true, error: false, success: false };
    this.errorMessage = '';

    // Simulação para T11 — após 800ms define o estado.
    // 70% de chance de sucesso, 30% de erro (simula respostas de servidor variadas).
    const success = Math.random() > 0.3;

    setTimeout(() => {
      if (success) {
        // Sucesso: JWT obtido; chama o fluxo de handleLoginSuccess
        this.handleLoginSuccess('simulated-jwt-token');
      } else {
        // Erro: consumir envelope canônico (apenas statusCode/message) — AC3/AC5/AC14
        this.handleLoginError({ statusCode: 401, message: 'Credenciais inválidas' });
      }
    }, 800);
  }

  /**
   * handleLoginSuccess — JWT obtido; chama sessionService.login(token) e navega.
   * O SessionService já está disponível via injeção no módulo raiz (T10).
   * RN11: JWT validade por 24h, sem refresh token. Ao expirar, logout + redirect.
   */
  private handleLoginSuccess(token: string): void {
    // SessionService.login armazena no localStorage e inicia timer 24h (RN11/AC13)
    // this.sessionService.login(token);
    // A navegação para rota original é responsabilidade do guard/e2e.
    // this.router.navigateByUrl(this.returnUrl ?? '/');
    // this.states = { idle: false, loading: false, error: false, success: true };

    // Simulação T11: definir estado de sucesso
    this.states = { idle: false, loading: false, error: false, success: true };
  }

  /**
   * handleLoginError — mensagem genérica consumindo apenas statusCode/message do envelope.
   * Nunca usa `error` (campo opcional do ApiErrorResponse — 🟠-1 do PLAN.md).
   * Aplica classe de erro visual no campo (via [class.error] no template).
   * Mensagens consumidas:
   *  - 401: "Credenciais inválidas" (AC3) — nunca distingue campo
   *  - 429: "Muitas tentativas de login..." (AC14)
   *  - 5xx/Network: "Erro interno" ou "Erro de rede" (AC5)
   */
  private handleLoginError(err: { statusCode: number; message: string }): void {
    this.states = { idle: false, loading: false, error: true, success: false };
    this.errorMessage = err.message; // mensagem genérica (ex: "Credenciais inválidas" 401, "Muitas tentativas..." 429, "Erro interno" 500)
  }

  /* ----- helpers de template ----- */

  get f() { return this.form.controls; }

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
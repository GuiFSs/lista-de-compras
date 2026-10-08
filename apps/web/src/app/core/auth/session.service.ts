// SessionService — core de sessão JWT (T10 do PLAN.md Autenticação).
//
// An Angular injectable that exposes reactive signals (signal) for consumption
// by the template, guard and interceptor. Persists the JWT in localStorage
// with the key `lcd.accessToken` (RN11/AC-13).
//
// RN11: JWT validade por 24h, sem refresh token. Ao expirar, logout + redirect.
//
// DECISÃO DE IMPLEMENTAÇÃO: decode manual via base64url (sem dependência do
// pacote `jose` na importação do side do módulo). Evita problemas de compatibilidade
// de versão do `jose` e não requer build nativo. A lógica é equivalente ao
// `jwtDecode` do `jose` para o caso de uso de verificar apenas o `exp` do payload.
//
// A biblioteca `jose` continua disponível no workspace (raiz package.json) para
// uso futuro ou verificação assinatura, mas o `isExpired` usa decode manual.

import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

// --- Chave fixa no localStorage (RN11/AC-13) ---
export const SESSION_STORAGE_KEY = 'lcd.accessToken';
const STORAGE_KEY = SESSION_STORAGE_KEY;

/** Claims do payload JWT que o cliente lê (sem verificação de assinatura). */
export interface JwtClaims {
  sub?: string;
  iss?: string;
  iat?: number;
  exp?: number;
}

/** Decodifica o payload de um JWT (base64url) sem verificar assinatura. */
function jwtDecodePayload(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url decode: adicionar padding adequado e decodificar
    const decode = (str: string): JwtClaims =>
      JSON.parse(
        atob(str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4) % 4) % 4))
      ) as JwtClaims;
    return decode(parts[1]);
  } catch {
    return null;
  }
}

/** Token JWT corrente. Vazio ("") quando não há sessão. */
export const accessToken = signal('');

/** `true` se não houver token ou se o token já tiver expirado. */
export const isTokenExpired = computed(() => {
  const token = accessToken();
  if (!token) return true;
  const payload = jwtDecodePayload(token);
  if (!payload) return true; // payload ilegível → expirado
  const now = Date.now() / 1000;
  return payload.exp !== undefined && now >= payload.exp;
});

/** Tempo restante (ms) até a expiração, ou null se não houver token/já expirado. */
export const timeUntilExpiry = computed(() => {
  const token = accessToken();
  if (!token) return null;
  const payload = jwtDecodePayload(token);
  if (!payload) return null;
  const now = Date.now() / 1000;
  const remaining = (payload.exp ?? 0) * 1000 - now;
  return remaining > 0 ? remaining : null;
});

/** Verdadeiro se houver token e não estiver expirado. */
export const hasValidSession = computed(() => {
  const token = accessToken();
  if (!token) return false;
  return !isTokenExpired();
});

/** `true` se o token estiver presente e não expirado (alias de hasValidSession). */
export const isAuthenticated = computed(() => hasValidSession());

/** SessionService — classe injetável via DI do Angular. */
@Injectable({
  providedIn: 'root',
})
export class SessionService {
  // Expondo os sinais como propriedades para compatibilidade com o template e specs.
  accessToken = accessToken;
  isTokenExpired = isTokenExpired;
  timeUntilExpiry = timeUntilExpiry;
  hasValidSession = hasValidSession;
  isAuthenticated = isAuthenticated;

  private readonly router = inject(Router);
  private expiryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Hydration: ler o token já armazenado no localStorage na inicialização.
    // Isso roda quando o app é reiniciado (recarregamento da página).
    const storedToken = localStorage.getItem(STORAGE_KEY);
    if (storedToken) {
      accessToken.set(storedToken);
      this.startExpiryTimer(storedToken);
    }
  }

  /** Armazena o JWT no localStorage e inicia o timer de expiração de 24h (RN11). */
  login(token: string): void {
    accessToken.set(token);
    localStorage.setItem(STORAGE_KEY, token);
    this.startExpiryTimer(token);
  }

  /** Remove o token do localStorage e para o timer. */
  logout(): void {
    accessToken.set('');
    localStorage.removeItem(STORAGE_KEY);
    this.clearExpiryTimer();
  }

  /** Redireciona o navegador para a tela de login. */
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  /** Retorna o token corrente, ou `null` sem sessão (compatibilidade com specs). */
  getToken(): string | null {
    return accessToken() || null;
  }

  /** Verifica se a sessão expirou (compatibilidade com specs). */
  isExpired(): boolean {
    return isTokenExpired();
  }

  /** Verifica se há sessão válida (compatibilidade com specs). */
  hasValidSession$(): boolean {
    return hasValidSession();
  }

  // --- Timer de expiração 24h (RN11) ---

  private startExpiryTimer(token: string): void {
    this.clearExpiryTimer();
    // O `exp` do token (epoch em segundos) é a fonte da verdade
    // para a expiração (RN11) — não um timer fixo de 24h: a
    // validade é definida no claim `exp` pelo auth-service e
    // o cliente a respeita. Sem `exp` ou já expirado, nada a
    // agendar — `isTokenExpired` já trata esses casos na
    // leitura da sessão.
    const payload = jwtDecodePayload(token);
    const expMs = typeof payload?.exp === 'number' ? payload.exp * 1000 : NaN;
    const delay = expMs - Date.now();
    if (!Number.isFinite(delay) || delay <= 0) return;
    this.expiryTimeout = setTimeout(() => {
      this.logout();
      // RN11: ao expirar, volta à tela de login.
      this.goToLogin();
    }, delay);
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimeout !== null) {
      clearTimeout(this.expiryTimeout);
      this.expiryTimeout = null;
    }
  }
}
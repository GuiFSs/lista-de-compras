import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

export const SESSION_STORAGE_KEY = 'lcd.accessToken';
const STORAGE_KEY = SESSION_STORAGE_KEY;

/** Claims do payload JWT que o cliente lê (sem verificar assinatura). */
export interface JwtClaims {
  sub?: string;
  iss?: string;
  iat?: number;
  exp?: number;
}

/**
 * Decode base64url do payload sem `jose` no bundle do browser —
 * só precisamos do `exp` para UX de sessão.
 */
function jwtDecodePayload(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decode = (str: string): JwtClaims =>
      JSON.parse(
        atob(str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4) % 4) % 4))
      ) as JwtClaims;
    return decode(parts[1]);
  } catch {
    return null;
  }
}

export const accessToken = signal('');

export const isTokenExpired = computed(() => {
  const token = accessToken();
  if (!token) return true;
  const payload = jwtDecodePayload(token);
  if (!payload) return true;
  const now = Date.now() / 1000;
  return payload.exp !== undefined && now >= payload.exp;
});

export const timeUntilExpiry = computed(() => {
  const token = accessToken();
  if (!token) return null;
  const payload = jwtDecodePayload(token);
  if (!payload) return null;
  const now = Date.now() / 1000;
  const remaining = (payload.exp ?? 0) * 1000 - now;
  return remaining > 0 ? remaining : null;
});

export const hasValidSession = computed(() => {
  const token = accessToken();
  if (!token) return false;
  return !isTokenExpired();
});

export const isAuthenticated = computed(() => hasValidSession());

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  accessToken = accessToken;
  isTokenExpired = isTokenExpired;
  timeUntilExpiry = timeUntilExpiry;
  hasValidSession = hasValidSession;
  isAuthenticated = isAuthenticated;

  private readonly router = inject(Router);
  private expiryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    if (storedToken) {
      accessToken.set(storedToken);
      this.startExpiryTimer(storedToken);
    }
  }

  login(token: string): void {
    accessToken.set(token);
    localStorage.setItem(STORAGE_KEY, token);
    this.startExpiryTimer(token);
  }

  logout(): void {
    accessToken.set('');
    localStorage.removeItem(STORAGE_KEY);
    this.clearExpiryTimer();
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return accessToken() || null;
  }

  isExpired(): boolean {
    return isTokenExpired();
  }

  hasValidSession$(): boolean {
    return hasValidSession();
  }

  private startExpiryTimer(token: string): void {
    this.clearExpiryTimer();
    // Fonte da verdade é o claim `exp`, não um timer fixo de 24h.
    const payload = jwtDecodePayload(token);
    const expMs = typeof payload?.exp === 'number' ? payload.exp * 1000 : NaN;
    const delay = expMs - Date.now();
    if (!Number.isFinite(delay) || delay <= 0) return;
    this.expiryTimeout = setTimeout(() => {
      this.logout();
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

// Configuração de borda do auth-service consumido pela PWA (ADR 0006).
//
// A PWA chama o auth-service **diretamente** em `http://localhost:3001`
// (exceção temporária à ADR 0001, que prevê o API Gateway como única API
// chamada pela PWA). Critérios de aceite da migração para o gateway (ADR 0006,
// seção 3): a PWA passa a chamar o login por URL relativa, o CORS do
// auth-service é removido e esta base é deprecada.

/** Base URL do auth-service — v1 local, hardcoded de propósito (ADR 0006). */
export const AUTH_API_BASE_URL = 'http://localhost:3001';

/**
 * URL da operação `POST /api/auth/login`.
 *
 * Endpoint **público** (não exige token): nem o interceptor anexa o header
 * `Authorization`, nem um 401 aqui é tratado como fim de sessão — 401 nesse
 * endpoint significa "credenciais inválidas" (AC-03), erro de negócio da T11.
 */
export const AUTH_API_LOGIN_URL = `${AUTH_API_BASE_URL}/api/auth/login`;
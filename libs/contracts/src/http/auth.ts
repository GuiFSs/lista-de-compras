// Contratos HTTP do auth-service — operação de login.
//
// Fonte única de verdade consumida pela PWA e pelo auth-service
// (docs/features/auth/PLAN.md — "Contratos"). Domínio independente de
// framework: estes são apenas tipos de borda (DTOs de transporte HTTP).

/**
 * Payload do `POST /api/auth/login`.
 *
 * Campos obrigatórios (RN1): ausência, não-string ou valor vazio resulta em
 * 400 pelo servidor; a PWA valida antes de enviar (AC-06).
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Resposta 200 do `POST /api/auth/login` — sessão iniciada.
 *
 * - `accessToken`: JWT assinado em RS256 com claims `JwtClaims`
 *   (válido por 24h — RN11/AC-13).
 * - `tokenType`: sempre `"Bearer"`; a PWA envia o token no header
 *   `Authorization: Bearer <jwt>`.
 * - `expiresIn`: validade em segundos (86400), correspondente ao `exp` do JWT.
 */
export interface LoginSuccessResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

/**
 * Envelope de erro canônico e ÚNICO do `POST /api/auth/login`
 * — usado por 400, 401, 429 e 500 (decisão 🟠-1 do PLAN.md).
 *
 * - `statusCode` e `message` são **garantidos** em toda resposta de erro.
 * - `error` é **opcional** (nome curto do tipo de erro, presente ou não
 *   conforme o transport) e **nunca deve ser dependido pelos clientes**:
 *   a PWA consome apenas `statusCode` e `message` (T11).
 * - `message` é sempre genérica, em PT; nenhum corpo contém a senha (AC-10)
 *   e o corpo do 500 nunca expõe detalhes internos (detalhes apenas em log
 *   no servidor).
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}

/**
 * Claims do JWT emitido pelo auth-service (algoritmo RS256).
 *
 * - `sub`: id do usuário (uuid).
 * - `iss`: `AUTH_JWT_ISSUER` (default `auth-service`).
 * - `iat`: emitido em (epoch seconds).
 * - `exp`: `iat + 86400` (epoch seconds) — 24h (RN11).
 *
 * Sem `aud` na v1 (público único — ADR 0007). A validação local dos demais
 * serviços (RN12) exige assinatura RS256 válida, `iss` correto e `exp` não
 * vencida.
 */
export interface JwtClaims {
  sub: string;
  iss: string;
  iat: number;
  exp: number;
}
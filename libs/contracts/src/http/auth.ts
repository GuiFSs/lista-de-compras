/** Payload do `POST /api/auth/login`. */
export interface LoginRequest {
  username: string;
  password: string;
}

/** Resposta 200 do login. */
export interface LoginSuccessResponse {
  accessToken: string;
  tokenType: 'Bearer';
  /** Validade em segundos (86400 = 24h). */
  expiresIn: number;
}

/**
 * Envelope de erro canônico (400/401/429/500).
 * Clientes devem usar `statusCode` e `message`; `error` é opcional e não contratual.
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}

/** Claims do JWT RS256 emitido pelo auth-service (sem `aud` na v1). */
export interface JwtClaims {
  sub: string;
  iss: string;
  iat: number;
  exp: number;
}

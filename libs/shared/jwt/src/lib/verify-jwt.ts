import { importSPKI, jwtVerify } from 'jose';

/** `iss` padrão do projeto (`AUTH_JWT_ISSUER`). */
export const DEFAULT_AUTH_JWT_ISSUER = 'auth-service';

/** Tolerância de relógio da v1: 0s (ADR 0007). */
export const DEFAULT_CLOCK_TOLERANCE_SECONDS = 0;

export interface VerifyJwtOptions {
  token: string;
  /**
   * Chave pública RS256 em PEM ou base64 single-line do PEM
   * (`AUTH_JWT_PUBLIC_KEY_B64`). Detecta PEM pelo prefixo `-----BEGIN`.
   */
  publicKey: string;
  /** `iss` esperado; default `auth-service`. */
  issuer?: string;
  /** Tolerância de relógio (s) para `exp`/`nbf`. Default: 0. */
  clockTolerance?: number;
}

/** Claims mínimos da ADR 0007; claims extras do payload são preservados. */
export interface VerifiedJwt {
  sub?: string;
  iss?: string;
  iat?: number;
  exp?: number;
  [claim: string]: unknown;
}

/**
 * Verifica JWT localmente com algoritmo pinado RS256 (rejeita `none`/HS256).
 * Falha rejeita a Promise — o guard da borda decide o 401.
 */
export async function verifyJwt(
  options: VerifyJwtOptions,
): Promise<VerifiedJwt> {
  const {
    token,
    publicKey,
    issuer = DEFAULT_AUTH_JWT_ISSUER,
    clockTolerance = DEFAULT_CLOCK_TOLERANCE_SECONDS,
  } = options;

  const key = await importSPKI(toPem(publicKey), 'RS256');
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['RS256'],
    issuer,
    clockTolerance,
  });
  return payload as VerifiedJwt;
}

/** Decodifica o base64 single-line do `.env` de volta ao PEM. */
export function decodeBase64Pem(value: string): string {
  return Buffer.from(value, 'base64').toString('utf8');
}

function toPem(publicKey: string): string {
  return publicKey.includes('-----BEGIN') ? publicKey : decodeBase64Pem(publicKey);
}

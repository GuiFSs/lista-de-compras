// Verificador local de JWT (RN12/AC-15 — ADR 0007).
//
// Framework-free: não depende de NestJS/Fastify/banco — é a lib pura que cada
// microserviço usa na própria borda HTTP. Construída sobre `jose` (sem builds
// nativos) com **algoritmo pinado RS256**, o que elimina ataques de confusão
// de algoritmo (`none`, HS256 com a pública etc. são rejeitados na hora).
//
// A chave pública chega por parâmetro (PEM ou base64 single-line do PEM —
// padrão do `.env` da ADR 0007); o `iss` esperado também é parâmetro (default
// `auth-service`, alinhado ao `AUTH_JWT_ISSUER` do `.env.example`). Falha em
// qualquer ponto (assinatura, `iss`, `exp`, algoritmo, malformado) rejeita a
// Promise — quem decide o 401 é o guard da borda, nunca esta lib.

import { importSPKI, jwtVerify } from 'jose';

/** `iss` padrão do projeto (`.env.example`: `AUTH_JWT_ISSUER=auth-service`). */
export const DEFAULT_AUTH_JWT_ISSUER = 'auth-service';

/** Tolerância de relógio da v1: 0 segundos (ADR 0007 — relógios locais em sincronia). */
export const DEFAULT_CLOCK_TOLERANCE_SECONDS = 0;

export interface VerifyJwtOptions {
  /** JWT compacto a verificar (já extraído do header). */
  token: string;
  /**
   * Chave pública RS256 em PEM **ou** base64 single-line do PEM (formato do
   * `AUTH_JWT_PUBLIC_KEY_B64` do `.env` — ADR 0007). A lib detecta PEM
   * (`-----BEGIN ...`) e, caso contrário, decodifica o base64.
   */
  publicKey: string;
  /**
   * `iss` esperado (claim do token). Falha se divergir. Default:
   * `auth-service` (mesmo default do `AUTH_JWT_ISSUER`).
   */
  issuer?: string;
  /** Tolerância de relógio em segundos para `exp`/`nbf`. Default: 0 (v1). */
  clockTolerance?: number;
}

/**
 * Claims validados e retornados pela verificação. Mínimos da ADR 0007
 * (`sub` · `iss` · `iat` · `exp`); claims extras do payload são preservados.
 */
export interface VerifiedJwt {
  sub?: string;
  iss?: string;
  iat?: number;
  exp?: number;
  [claim: string]: unknown;
}

/**
 * Verifica um JWT localmente:
 *
 * 1. algoritmo **pinado** `RS256` (rejeita `none`, `HS256` etc. — sem
 *    confusão de algoritmo);
 * 2. assinatura válida contra a chave pública informada;
 * 3. `iss` === `issuer` (default `auth-service`);
 * 4. `exp` não vencida (tolerância de relógio 0 na v1).
 *
 * @throws Em qualquer falha (assinatura, `iss`, `exp`, algoritmo, token
 * malformado, chave inválida) — quem chama mapeia para o 401 uniforme.
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

/** Decodifica o base64 single-line do `.env` (ADR 0007) de volta ao PEM. */
export function decodeBase64Pem(value: string): string {
  return Buffer.from(value, 'base64').toString('utf8');
}

function toPem(publicKey: string): string {
  return publicKey.includes('-----BEGIN') ? publicKey : decodeBase64Pem(publicKey);
}
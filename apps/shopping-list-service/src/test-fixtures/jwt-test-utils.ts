// Utilitário test-only para assinar JWTs nos testes do serviço.
//
// Usa o par de chaves RS256 descartável da lib `@lista/shared/jwt`
// (`test-fixtures/rs256-test-keys.ts` — MESMO par do auth-service; nenhuma
// das duas é segredo e nenhuma protege nada). O `test-setup.ts` define
// `AUTH_JWT_PUBLIC_KEY_B64` com a pública deste par, então um token assinado
// aqui é exatamente o que o guard aceita — simulando o JWT que o
// auth-service emitiria (AC15, requisição direta ao serviço).
import { SignJWT, importPKCS8 } from 'jose';
import { decodeBase64Pem } from '@lista/shared/jwt';
import { TEST_RSA_PRIVATE_KEY_B64 } from '@lista/shared/jwt/testing';

const DEFAULT_SUBJECT = '11111111-1111-4111-8111-111111111111';
const DEFAULT_ISSUER = 'auth-service';

export interface SignTestJwtOverrides {
  issuer?: string;
  subject?: string;
  iat?: number;
  exp?: number;
}

/** Assina um JWT RS256 com o par de teste (claims padrão = auth-service). */
export async function signTestJwt(
  overrides: SignTestJwtOverrides = {},
): Promise<string> {
  const privateKey = await importPKCS8(
    decodeBase64Pem(TEST_RSA_PRIVATE_KEY_B64),
    'RS256',
  );
  const iat = overrides.iat ?? Math.floor(Date.now() / 1000);
  const exp = overrides.exp ?? iat + 86400;
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setSubject(overrides.subject ?? DEFAULT_SUBJECT)
    .setIssuer(overrides.issuer ?? DEFAULT_ISSUER)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(privateKey);
}
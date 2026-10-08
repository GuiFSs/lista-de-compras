import { describe, expect, it } from 'vitest';
import {
  SignJWT,
  UnsecuredJWT,
  generateKeyPair,
  importPKCS8,
  jwtVerify,
} from 'jose';
import { decodeBase64Pem, verifyJwt } from './verify-jwt';
import {
  TEST_RSA_PRIVATE_KEY_B64,
  TEST_RSA_PUBLIC_KEY_B64,
} from '../test-fixtures/rs256-test-keys';

const ISSUER = 'auth-service';
const SUBJECT = '11111111-1111-4111-8111-111111111111';

async function signRsa256(options: {
  issuer?: string;
  subject?: string;
  iat?: number;
  exp?: number;
  privateKey?: CryptoKey;
} = {}): Promise<string> {
  const key =
    options.privateKey ??
    (await importPKCS8(decodeBase64Pem(TEST_RSA_PRIVATE_KEY_B64), 'RS256'));
  const iat = options.iat ?? Math.floor(Date.now() / 1000);
  const exp = options.exp ?? iat + 86400;
  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setSubject(options.subject ?? SUBJECT)
    .setIssuer(options.issuer ?? ISSUER)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(key);
}

describe('verifyJwt', () => {
  it('aceita um JWT RS256 válido (assinatura, iss e exp ok) e devolve os claims', async () => {
    const token = await signRsa256();

    const payload = await verifyJwt({
      token,
      publicKey: TEST_RSA_PUBLIC_KEY_B64,
      issuer: ISSUER,
    });

    expect(payload.sub).toBe(SUBJECT);
    expect(payload.iss).toBe(ISSUER);
    expect(payload.iat).toBeTypeOf('number');
    expect(payload.exp).toBe(payload.iat! + 86400);
  });

  it('aceita a chave pública informada como PEM (decodificada do base64)', async () => {
    const token = await signRsa256();
    const pem = decodeBase64Pem(TEST_RSA_PUBLIC_KEY_B64);

    await expect(
      verifyJwt({ token, publicKey: pem, issuer: ISSUER }),
    ).resolves.toMatchObject({ sub: SUBJECT });
  });

  it('rejeita token expirado', async () => {
    const token = await signRsa256({
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    await expect(
      verifyJwt({ token, publicKey: TEST_RSA_PUBLIC_KEY_B64, issuer: ISSUER }),
    ).rejects.toThrow();
  });

  it('aceita token expirado apenas dentro da tolerância de relógio configurada', async () => {
    const token = await signRsa256({
      exp: Math.floor(Date.now() / 1000) - 30,
    });

    await expect(
      verifyJwt({
        token,
        publicKey: TEST_RSA_PUBLIC_KEY_B64,
        issuer: ISSUER,
        clockTolerance: 60,
      }),
    ).resolves.toMatchObject({ sub: SUBJECT });

    // Tolerância 0 (v1) rejeita o mesmo token.
    await expect(
      verifyJwt({
        token,
        publicKey: TEST_RSA_PUBLIC_KEY_B64,
        issuer: ISSUER,
      }),
    ).rejects.toThrow();
  });

  it('rejeita token com assinatura errada (outro par de chaves RS256)', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const foreignToken = await signRsa256({ privateKey });

    // Token alheio contra a chave pública da fixture → rejeitado.
    await expect(
      verifyJwt({
        token: foreignToken,
        publicKey: TEST_RSA_PUBLIC_KEY_B64,
        issuer: ISSUER,
      }),
    ).rejects.toThrow();

    // O mesmo token é aceito pela chave pública do par que o assinou
    // (prova que a validação realmente depende da chave informada).
    const { payload } = await jwtVerify(foreignToken, publicKey, {
      algorithms: ['RS256'],
      issuer: ISSUER,
    });
    expect(payload.sub).toBe(SUBJECT);
  });

  it('rejeita token com `iss` divergente do esperado', async () => {
    const token = await signRsa256({ issuer: 'servico-malicioso' });

    await expect(
      verifyJwt({ token, publicKey: TEST_RSA_PUBLIC_KEY_B64, issuer: ISSUER }),
    ).rejects.toThrow();

    // issuer default (`auth-service`) também não aceita.
    await expect(
      verifyJwt({ token, publicKey: TEST_RSA_PUBLIC_KEY_B64 }),
    ).rejects.toThrow();
  });

  it('rejeita token assinado com HS256 (confusão de algoritmo)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const hs256Token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(SUBJECT)
      .setIssuer(ISSUER)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(new TextEncoder().encode('segredo-simetrico-de-teste'));

    await expect(
      verifyJwt({
        token: hs256Token,
        publicKey: TEST_RSA_PUBLIC_KEY_B64,
        issuer: ISSUER,
      }),
    ).rejects.toThrow();
  });

  it('rejeita token com alg `none` (token não assinado)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const noneToken = new UnsecuredJWT()
      .setSubject(SUBJECT)
      .setIssuer(ISSUER)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .encode();

    await expect(
      verifyJwt({
        token: noneToken,
        publicKey: TEST_RSA_PUBLIC_KEY_B64,
        issuer: ISSUER,
      }),
    ).rejects.toThrow();
  });

  it('rejeita token malformado ou vazio', async () => {
    for (const token of ['nao.eh.um.jwt', 'so-uma-parte', '', '   ']) {
      await expect(
        verifyJwt({
          token,
          publicKey: TEST_RSA_PUBLIC_KEY_B64,
          issuer: ISSUER,
        }),
      ).rejects.toThrow();
    }
  });
});
// Adaptador do port TokenSigner usando jose (RS256).
//
// ADR 0007: RS256 com `jose` — a chave privada fica SOMENTE aqui no
// auth-service; os demais serviços validam com a pública. Algoritmo pinado
// no header (`alg: RS256`) evita ataques de confusão de algoritmo.
import { SignJWT, importPKCS8 } from 'jose';
import {
  JWT_TTL_SECONDS,
  TokenSigner,
} from '../../application/ports/token-signer.port';
import { User } from '../../domain/user';

// Tipo da chave retornada pelo jose (CryptoKey no runtime WebCrypto do Node),
// derivado do próprio importPKCS8 para não depender de globais do @types/node.
type ImportedPrivateKey = Awaited<ReturnType<typeof importPKCS8>>;

export class JoseTokenSigner implements TokenSigner {
  constructor(
    private readonly privateKey: ImportedPrivateKey,
    private readonly issuer: string,
  ) {}

  async sign(user: User): Promise<string> {
    // iat explícito para garantir exp = iat + 86400 exatamente (RN11/AC-13).
    const iat = Math.floor(Date.now() / 1000);
    return new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer(this.issuer)
      .setIssuedAt(iat)
      .setExpirationTime(iat + JWT_TTL_SECONDS)
      .sign(this.privateKey);
  }
}

/** Decodifica o valor base64 single-line do `.env` (ADR 0007) de volta ao PEM. */
export function decodeBase64Pem(value: string): string {
  return Buffer.from(value, 'base64').toString('utf8');
}

export async function createJoseTokenSigner(privateKeyB64: string, issuer: string) {
  const privateKey = await importPKCS8(decodeBase64Pem(privateKeyB64), 'RS256');
  return new JoseTokenSigner(privateKey, issuer);
}
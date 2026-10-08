// Port de assinatura de JWT (lado da aplicação).
//
// O auth-service é o ÚNICO serviço com a chave de assinatura (privada);
// os demais validam localmente com a pública (RN12/ADR 0007). O algoritmo
// RS256 e a biblioteca `jose` ficam no adaptador em `src/infrastructure/auth`.
import { User } from '../../domain/user';

/** Validade do token: 24h em segundos (RN11/AC13, `exp = iat + 86400`). */
export const JWT_TTL_SECONDS = 86400;

export abstract class TokenSigner {
  /**
   * Assina um JWT RS256 com claims mínimas `sub`/`iss`/`iat`/`exp` (ADR 0007),
   * `exp = iat + JWT_TTL_SECONDS`. Sem `aud` na v1 (público único).
   */
  abstract sign(user: User): Promise<string>;
}
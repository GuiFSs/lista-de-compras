// Verificação local de JWT (RN12/AC15 — ADR 0007), framework-free.
//
// Exporta o verificador RS256 (`verifyJwt`), a extração do token do header
// (`extractBearerToken`) e a decodificação do base64 single-line do `.env`
// (`decodeBase64Pem`). Cada microserviço usa esta lib na própria borda HTTP;
// o 401 uniforme é responsabilidade do guard do serviço, não desta lib.
export { extractBearerToken } from './lib/extract-bearer-token';
export {
  verifyJwt,
  decodeBase64Pem,
  DEFAULT_AUTH_JWT_ISSUER,
  DEFAULT_CLOCK_TOLERANCE_SECONDS,
} from './lib/verify-jwt';
export type { VerifyJwtOptions, VerifiedJwt } from './lib/verify-jwt';
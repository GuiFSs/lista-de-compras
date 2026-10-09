// reflect-metadata antes de qualquer decorator Nest; env hermético sem `.env`.
import 'reflect-metadata';
import { TEST_RSA_PRIVATE_KEY_B64, TEST_RSA_PUBLIC_KEY_B64 } from './test-fixtures/rs256-test-keys';

process.env['AUTH_DATABASE_URL'] ??=
  'postgresql://auth:auth_local@localhost:5432/auth';
process.env['AUTH_API_PORT'] ??= '3001';
process.env['AUTH_JWT_ISSUER'] ??= 'auth-service';
// Custo bcrypt baixo só em teste; produção usa AUTH_PASSWORD_HASH_COST (default 12).
process.env['AUTH_PASSWORD_HASH_COST'] ??= '4';
process.env['AUTH_JWT_PRIVATE_KEY_B64'] ??= TEST_RSA_PRIVATE_KEY_B64;
process.env['AUTH_JWT_PUBLIC_KEY_B64'] ??= TEST_RSA_PUBLIC_KEY_B64;

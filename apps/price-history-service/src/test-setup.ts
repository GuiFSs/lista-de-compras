// reflect-metadata antes de decorators Nest; env hermético sem `.env`.
// AUTH_JWT_* forçados (=) para o par de teste: sob `nx run` o Nx pré-carrega
// o `.env` da raiz (chaves reais do dev).
import 'reflect-metadata';
import { TEST_RSA_PUBLIC_KEY_B64 } from '@lista/shared/jwt/testing';

process.env['PRICE_HISTORY_DATABASE_URL'] ??=
  'postgresql://price_history:price_history_local@localhost:5432/price_history';
process.env['PRICE_HISTORY_API_PORT'] ??= '3002';
process.env['PRICE_HISTORY_CORS_ORIGINS'] ??= 'http://localhost:4200';

process.env['AUTH_JWT_ISSUER'] = 'auth-service';
process.env['AUTH_JWT_PUBLIC_KEY_B64'] = TEST_RSA_PUBLIC_KEY_B64;

// Setup global dos testes unitários (Vitest) do serviço.
//
// 1. O reflect-metadata precisa ser carregado antes de qualquer
//    uso de decorators do NestJS.
// 2. Variáveis de ambiente padrão tornam os testes herméticos:
//    rodam sem `.env` e sem banco de dados de verdade (o Drizzle
//    só conecta na primeira query).
// 3. O guard global de JWT (AC15/ADR 0007) lê AUTH_JWT_PUBLIC_KEY_B64 e
//    AUTH_JWT_ISSUER: valores FORÇADOS (não `??=`) para o par RS256
//    descartável da lib `@lista/shared/jwt` (test-only) — sob `nx run` o Nx
//    pré-carrega o `.env` da raiz (chaves reais do dev), e o teste precisa
//    ser hermético: o par de teste é o mesmo do auth-service em teste;
//    `jwt-test-utils.ts` assina tokens aceitos por esta pública.
import 'reflect-metadata';
import { TEST_RSA_PUBLIC_KEY_B64 } from '@lista/shared/jwt/testing';

process.env['DATABASE_URL'] ??=
  'postgresql://postgres:postgres@localhost:5432/shopping_list';

process.env['AUTH_JWT_ISSUER'] = 'auth-service';
process.env['AUTH_JWT_PUBLIC_KEY_B64'] = TEST_RSA_PUBLIC_KEY_B64;

// Setup global dos testes unitários (Vitest) do auth-service.
//
// 1. O reflect-metadata precisa ser carregado antes de qualquer
//    uso de decorators do NestJS.
// 2. Variáveis de ambiente padrão tornam os testes herméticos:
//    rodam sem `.env` e sem banco de dados de verdade (o Drizzle
//    só conecta na primeira query). O Nx carrega o `.env` da raiz
//    nos targets por padrão; os `??=` aqui cobrem a execução direta
//    do Vitest sem `.env` (ex.: dentro da pasta do serviço).
// 3. O par de chaves RS256 vem de um fixture marcado test-only: o
//    `TokenSigner` é construído na compilação do módulo (harness de DI
//    real) e precisa de um par válido mesmo sem `.env`.
import 'reflect-metadata';
import { TEST_RSA_PRIVATE_KEY_B64, TEST_RSA_PUBLIC_KEY_B64 } from './test-fixtures/rs256-test-keys';

process.env['AUTH_DATABASE_URL'] ??=
  'postgresql://auth:auth_local@localhost:5432/auth';
process.env['AUTH_API_PORT'] ??= '3001';
process.env['AUTH_JWT_ISSUER'] ??= 'auth-service';
// Custo baixo em teste (PLAN.md — "testes usam custo baixo"); produção
// usa `AUTH_PASSWORD_HASH_COST` do `.env` (default 12).
process.env['AUTH_PASSWORD_HASH_COST'] ??= '4';
process.env['AUTH_JWT_PRIVATE_KEY_B64'] ??= TEST_RSA_PRIVATE_KEY_B64;
process.env['AUTH_JWT_PUBLIC_KEY_B64'] ??= TEST_RSA_PUBLIC_KEY_B64;
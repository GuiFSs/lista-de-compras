// Setup global dos testes unitários (Vitest) do serviço.
//
// 1. O reflect-metadata precisa ser carregado antes de qualquer
//    uso de decorators do NestJS.
// 2. Variáveis de ambiente padrão tornam os testes herméticos:
//    rodam sem `.env` e sem banco de dados de verdade (o Drizzle
//    só conecta na primeira query).
import 'reflect-metadata';

process.env['DATABASE_URL'] ??=
  'postgresql://postgres:postgres@localhost:5432/shopping_list';
process.env['PORT'] ??= '3000';

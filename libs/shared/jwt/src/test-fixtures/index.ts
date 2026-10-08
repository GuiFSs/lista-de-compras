// Entrada test-only da lib `@lista/shared/jwt` (alias `@lista/shared/jwt/testing`).
//
// Expõe o par RS256 descartável para os testes dos microserviços SEM importar
// por caminho relativo até `libs/...` (proibido por `@nx/enforce-module-boundaries`).
// Nenhum segredo real: par gerado só para teste, não protege nada.
//
// Nunca importar este barrel de código de produção — o build do serviço não o
// inclui e o alias só é usado por specs/fixtures.
export {
  TEST_RSA_PRIVATE_KEY_B64,
  TEST_RSA_PUBLIC_KEY_B64,
} from './rs256-test-keys';

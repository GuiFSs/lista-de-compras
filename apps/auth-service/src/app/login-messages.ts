// Mensagens PT do contrato `POST /api/auth/login` (fonte única: PLAN.md
// "Contratos" e libs/contracts/README.md).
//
// Envelope canônico de erro (T3/🟠-1): `statusCode` e `message` garantidos,
// `error` opcional e nunca dependido pela PWA. Nenhuma mensagem contém
// credenciais (AC10/RN7); o corpo do 500 nunca expõe detalhes internos.
export const LOGIN_400_MESSAGE = 'Nome de usuário e senha são obrigatórios';
export const LOGIN_401_MESSAGE = 'Credenciais inválidas';
export const LOGIN_429_MESSAGE =
  'Muitas tentativas de login. Aguarde e tente novamente.';
export const LOGIN_500_MESSAGE = 'Erro interno';
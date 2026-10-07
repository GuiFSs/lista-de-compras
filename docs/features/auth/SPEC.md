# Especificação — Autenticação

## Objetivo

Permitir que a pessoa acesse a aplicação de lista de compras de forma segura,
usando nome de usuário e senha, por meio de um microserviço de autenticação
próprio que emite JWT. Na primeira versão existe uma única conta inicial,
semeada no banco de autenticação para uso local e compartilhada pelo casal
(escopo inicial: "no início, ambos usarão o mesmo login"). A tela de login é a
porta de entrada da PWA mobile-first (ADR 0001, ADR 0002, ADR 0005).

Fontes desta spec: `docs/product/initial-scope.md` (seções "Autenticação",
"Pessoas usuárias" e "Plataformas e voz"), ADRs 0001–0005 e
`docs/design/GUIA-DESIGN.md`.

## Fora do escopo

- **Cadastro/registro de usuários** — excluído explicitamente da primeira
  versão (escopo inicial e ADR 0002: "Não haverá fluxo de cadastro na primeira
  versão").
- **Recuperação/redefinição de senha** — não previsto no escopo inicial; o
  produto não define e-mail, telefone ou qualquer canal de recuperação.
- **Login social/OAuth, autenticação em dois fatores** — não previstos no
  escopo inicial.
- **Gerenciamento de contas** (trocar senha, criar contas separadas por
  pessoa, remover acesso) — fora da v1; o escopo inicial prevê apenas uma
  única conta semeada, com evolução futura implícita em "no início, ambos
  usarão o mesmo login".

> **Confirmado na aprovação desta spec:** recuperação de senha, login
> social/OAuth/2FA e gerenciamento de contas estão confirmados como **fora da
> v1** (decisão anteriormente registrada como DE7, agora fechada).

## Fluxo principal

1. A pessoa abre a PWA sem sessão ativa e encontra a tela de login, exibida
   como tela cheia, fora da navegação (sem bottom nav — GUIA-DESIGN §3).
2. Preenche **nome de usuário** e **senha** (ambos obrigatórios, com rótulo
   visível).
3. Envia o formulário: o botão passa ao estado de progresso (`Entrando…`) e é
   desabilitado, impedindo envio duplicado.
4. A PWA envia as credenciais **diretamente ao microserviço de
   autenticação** (chamada direta, decisão aprovada). Isso é exceção
   temporária à ADR 0001, que prevê o API Gateway como única API chamada
   pela PWA: a nova ADR documentando essa exceção e a migração futura para o
   gateway será registrada na fase de plano/implementação (ainda não escrita
   — ver "Contratos afetados").
5. Resultados:
   - **Sucesso**: o serviço valida a credencial e devolve um JWT com validade
     de 24 horas, armazenado no `localStorage` da PWA; a pessoa autenticada
     passa a acessar a aplicação (estado de sucesso).
   - **Credenciais inválidas**: a pessoa permanece na tela de login com
     mensagem de erro visível (estado de erro), sem indicação de qual campo
     está incorreto.
   - **Falha de rede/serviço**: erro visível na tela, o que a pessoa digitou
     é mantido e nova tentativa é possível.
   - **Limite de tentativas atingido**: após o limite de tentativas com falha
     (RN13), novas tentativas recebem **erro genérico (429)** e não
     autenticam — mesmo com credenciais corretas — até a janela expirar; o
     erro é exibido na tela.
6. Com a sessão ativa, todas as rotas da PWA estão acessíveis; após o login,
   a pessoa é levada à **rota original que tentava acessar** (guard de
   retorno; deep links seguem o mesmo caminho). A sessão dura 24 horas (sem
   refresh token na v1): **ao expirar, a PWA volta à tela de login** — nota:
   a expiração durante o uso resulta em redirect ao login. O encerramento é
   por **logout manual**. Nas demais chamadas da PWA, o JWT viaja no header e
   é validado **localmente por cada microserviço** (RN12).

## Regras de negócio

- RN1 — O acesso exige **nome de usuário e senha**; ambos os campos são
  obrigatórios na tela de login.
- RN2 — Não existe cadastro/registro na primeira versão: nenhuma tela, link
  ou fluxo cria conta pela interface.
- RN3 — A conta inicial é criada por **seed no banco do serviço de
  autenticação**, para uso local (ADR 0002). Credenciais do seed (DE6,
  fechada): usuário e senha vêm de **variáveis de ambiente no `.env` local**
  (gitignored, padrão da ADR 0004); o `.env.example` contém apenas
  placeholders; o seed lê a senha, aplica hash e **nunca grava o valor puro**
  — a RN4 e os AC7/AC8 continuam valendo.
- RN4 — A senha semeada **nunca é guardada em texto puro**: nem em arquivos
  versionados (código, seed, configs) nem no banco de autenticação — apenas
  um valor não reversível (hash) (ADR 0002, AGENTS.md).
- RN5 — A autenticação usa **JWT**: o login bem-sucedido resulta em um token
  JWT assinado pelo microserviço de autenticação (escopo inicial).
- RN6 — O **microserviço de autenticação é dono exclusivo** dos dados de
  autenticação (banco lógico `auth`); nenhum outro serviço acessa esse banco
  diretamente (ADR 0001, ADR 0004).
- RN7 — **Segurança é requisito**, mesmo no fluxo básico: credenciais
  inválidas não autenticam; a mensagem de erro é genérica (não revela se o
  nome de usuário existe); a senha digitada ou semeada nunca aparece em tela,
  mensagem de erro ou log.
- RN8 — Na v1 há **uma única conta**, compartilhada pelas duas pessoas do
  casal (escopo inicial: "no início, ambos usarão o mesmo login").
- RN9 — A tela de login segue o design mobile-first do
  `docs/design/GUIA-DESIGN.md` (ADR 0005), incluindo os 4 estados obrigatórios
  e o tema claro/escuro.
- RN10 — **Guarda de rotas (decisão fechada)**: todas as rotas da PWA exigem
  sessão ativa; sem sessão, a pessoa é levada à tela de login e, após o
  login bem-sucedido, volta à **rota original** que tentava acessar (guard de
  retorno). Deep links sem sessão passam pelo login e retornam à rota
  solicitada.
- RN11 — **Política de sessão da v1 (decisão fechada)**: o JWT tem validade
  de **24 horas** e é armazenado no **`localStorage`** da PWA; **não há
  refresh token na v1**; ao expirar, a PWA volta à tela de login (redirect);
  o encerramento da sessão é feito por **logout manual**.
- RN12 — **Validação local do JWT (DE4, fechada)**: cada microserviço valida,
  na própria borda HTTP e **localmente**, a assinatura e a expiração do token
  recebido no header (padrão-ouro JWT; funciona sem gateway e continua válido
  com o gateway futuro). **Nova ADR** será registrada na fase de
  plano/implementação (ainda não escrita — esta spec não a cria); detalhes de
  implementação (RS256 vs HS256, biblioteca) ficam para o `PLAN.md`.
- RN13 — **Rate limit no login (DE5, fechada)**: o endpoint de login tem
  proteção simples **em memória** — limite fixo de tentativas de login com
  falha (número exato, ex. 5 por minuto, definido no `PLAN.md`) respondendo
  **erro genérico com status 429**; sem dependência nova (sem broker, sem
  serviço extra). Atingido o limite, mesmo credenciais corretas não autenticam
  até a janela expirar.

## Estados relevantes

- **Carregando** — envio em andamento: botão com rótulo de progresso
  (`Entrando…`) e desabilitado (→ AC4). Não há carga de dados na abertura da
  tela; o formulário já é exibido pronto.
- **Vazio** — tela aberta, campos em branco, nenhuma mensagem de erro;
  campos obrigatórios identificados (→ AC6).
- **Erro** — credenciais inválidas (→ AC3), falha de rede/serviço (→ AC5) ou
  limite de tentativas atingido (→ AC14): o erro é sempre visível na tela
  (campo ou toast), nunca só no console.
- **Sucesso** — JWT obtido e pessoa autenticada acessando a aplicação
  (→ AC2).

## Design e UX

- Padrões seguidos: `docs/design/GUIA-DESIGN.md` (ADR 0005).
- Componentes/tokens usados:
  - Tela cheia, **fora da navegação** (sem bottom nav — GUIA-DESIGN §3).
  - Um único botão `primary` (pill, `--color-primary`, altura ≥ 44px) para
    entrar; durante o envio, rótulo de progresso + botão desabilitado.
  - Campos de texto: superfície `--color-surface`, hairline 1px,
    `--radius-xs`, rótulo visível acima (`--font-size-caption`) — placeholder
    não substitui rótulo; foco com `--color-primary-text` + `--shadow-1`;
    erro com borda `--color-danger`, mensagem em `--font-size-caption`
    ligada por `aria-describedby` + `aria-invalid`.
  - `--font-size-display` pode compor o título/hero do login (uso raro
    permitido pelo guia §2).
  - Toast (`--z-toast`) para erro de rede, mantendo o que a pessoa digitou.
- Comportamento mobile: coluna única utilizável a partir de 360px; no desktop
  (`md+`), coluna centralizada em `--container-max`; teclado virtual não
  cobre o campo focado; `:focus-visible` com token de foco; alvos de toque
  ≥ 44×44px; `touch-action: manipulation`; tema claro/escuro somente via
  tokens (nunca cor hardcoded).

## Critérios de aceite

- [ ] AC1 — Sem sessão ativa, ao abrir a PWA a pessoa encontra a tela de
  login (nome de usuário + senha) como tela cheia, sem bottom nav.
- [ ] AC2 — Enviando as credenciais da conta semeada corretamente, a PWA
  obtém um JWT (token com estrutura e assinatura válidas, verificável por
  decodificação) e a pessoa passa a acessar a aplicação autenticada.
- [ ] AC3 — Enviando nome de usuário ou senha incorretos, a pessoa permanece
  na tela de login com mensagem de erro visível na tela (campo ou toast); a
  mensagem é genérica e não indica qual dos campos está incorreto.
- [ ] AC4 — Durante o envio, o botão exibe rótulo de progresso (`Entrando…`)
  e fica desabilitado; um toque repetido não gera uma segunda requisição
  (verificável na aba de rede do navegador).
- [ ] AC5 — Em falha de rede durante o envio, um erro visível é exibido, o
  que a pessoa digitou permanece na tela e nova tentativa é possível.
- [ ] AC6 — Com os campos vazios (estado vazio), a tela mostra o formulário
  limpo, sem mensagens de erro, com os dois campos identificados como
  obrigatórios; submeter sem preencher exibe validação local e não envia
  requisição de login.
- [ ] AC7 — Nenhum arquivo versionado contém a senha semeada em texto puro:
  uma busca pelo valor da senha usado no seed não retorna resultados no
  repositório (incluindo código, scripts de seed e `.env.example`).
- [ ] AC8 — O banco do serviço de autenticação não guarda a senha em texto
  puro (apenas valor não reversível); após executar o seed, a conta está
  utilizável e permite login local bem-sucedido.
- [ ] AC9 — A interface não oferece cadastro: não existem link, botão ou rota
  de criação de conta em toda a PWA.
- [ ] AC10 — Em nenhum momento a senha digitada ou a senha semeada aparece em
  texto puro em telas, mensagens de erro ou logs da aplicação.
- [ ] AC11 — A tela de login segue o GUIA-DESIGN: um único botão `primary`,
  campos com rótulo visível e estados de foco/erro usando tokens (sem cor
  hardcoded), alvos de toque ≥ 44×44px, layout utilizável em viewport de
  360px e em desktop (coluna única centralizada), com tema claro e escuro
  funcionais.
- [ ] AC12 — Guarda de rotas: com a PWA sem sessão ativa (incluindo recarga
  da página e deep link), toda rota acessada leva a pessoa à tela de login;
  após o login, a pessoa é levada à rota original que tentava acessar.
- [ ] AC13 — Política de sessão v1: após o login, o JWT fica armazenado no
  `localStorage` e expira em 24 horas (verificável pela data de expiração no
  payload do token); uma vez expirado, a PWA volta à tela de login, sem
  refresh automático; o logout manual encerra a sessão e retorna à tela de
  login.
- [ ] AC14 — Rate limit no login: atingido o limite de tentativas de login
  com falha da janela definida (número exato no `PLAN.md`), novas tentativas
  recebem resposta genérica com status 429 e nenhuma sessão é emitida, mesmo
  com credenciais corretas; a tela exibe erro visível; expirada a janela, o
  login volta a ser aceito (verificável na aba de rede, com proteção em
  memória e sem dependência nova).
- [ ] AC15 — Validação local do JWT: uma requisição a qualquer microserviço
  com token ausente, com assinatura inválida ou expirado é rejeitada na
  própria borda HTTP do serviço (erro 401), e a mesma requisição com um JWT
  válido emitido pelo serviço de autenticação é aceita — sem depender de
  gateway (verificável por requisição direta ao serviço).

## Contratos afetados

- HTTP:
  - **Novo — microserviço de autenticação: operação de login.**
    - Entrada (produto): nome de usuário e senha.
    - Sucesso (produto): um JWT emitido pelo serviço de autenticação, com
      validade de 24 horas (v1, sem refresh token — RN11).
    - Falha de credenciais (produto): erro genérico de credenciais inválidas,
      que não distingue usuário inexistente de senha incorreta e não expõe
      dado sensível.
    - Falha por limite de tentativas (produto): erro genérico com status
      **429** após o limite de tentativas com falha (RN13).
    - Caminhos, formatos exatos de payload/status e headers ficam para o
      `PLAN.md` (nível técnico, fora desta spec).
  - **Consumo pela PWA**: a tela de login chama a operação de login do
    microserviço de autenticação **diretamente** (chamada direta até o
    gateway existir). Isso é exceção temporária à ADR 0001, que prevê o API
    Gateway como única API chamada pela PWA: uma **nova ADR** documentando a
    exceção e a migração futura para o gateway será registrada na fase de
    plano/implementação (ainda não escrita — esta spec não a cria); o
    gateway permanece pendente para depois desta feature.
  - **Validação do JWT nas demais chamadas**: cada microserviço valida
    localmente, na própria borda HTTP, assinatura e expiração do token
    recebido no header (RN12, DE4 fechada). Uma **nova ADR** será registrada
    na fase de plano/implementação (ainda não escrita); algoritmo (RS256 vs
    HS256), biblioteca e demais detalhes ficam para o `PLAN.md`.
  - Nenhum outro endpoint novo nesta versão (cadastro, recuperação de senha,
    refresh etc. estão fora do escopo).
- Eventos: **nenhum**. Login é um comando com resposta imediata (HTTP) e não
  publica fato de domínio a ser propagado via RabbitMQ nesta versão.

## Decisões em aberto

- **Nenhuma** — todas as decisões (DE1–DE7) foram fechadas na aprovação
  desta spec. As pendências operacionais decorrentes ficam registradas nos
  locais certos e serão tratadas na fase de plano/implementação: nova ADR da
  exceção temporária à ADR 0001 (ver "Contratos afetados" → Consumo pela
  PWA), nova ADR da validação local do JWT (RN12) e número exato do rate
  limit (RN13/AC14), todos sem ADR escrita nesta fase.

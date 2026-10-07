# Plano técnico — Autenticação

## Contexto

A feature **Autenticação** (spec aprovada em `docs/features/auth/SPEC.md`, 15 ACs) cria o
microserviço de autenticação (novo app Nx `apps/auth-service`), o seed da conta única
local (ADR 0002), a tela de login mobile-first da PWA (ADR 0005) com guarda de rotas e
sessão JWT de 24h em `localStorage`, e a validação local de JWT na borda HTTP de cada
serviço (RN12). Todas as decisões DE1–DE7 estão fechadas na spec; este plano detalha o
que ficou delegado ao nível técnico: contratos HTTP exatos, algoritmo/livraria do JWT,
número do rate limit, hash da senha, seed e ADRs pendentes (exceção temporária à ADR
0001 e validação local do JWT).

**Decisões fechadas que guiam este plano (reenunciadas):**

1. A PWA chama o auth-service **diretamente** (exceção temporária à ADR 0001) — nova
   ADR (0006) será criada como tarefa.
2. JWT 24h em `localStorage`, sem refresh, logout manual, expirado → login (RN11).
3. Todas as rotas guardadas; pós-login retorna à rota original (RN10).
4. Cada serviço valida localmente assinatura + expiração do JWT na borda HTTP (RN12) —
   nova ADR (0007) será criada como tarefa.
5. Rate limit em memória no login — número exato definido abaixo (RN13).
6. Seed via `.env` local gitignored + `.env.example` só com placeholders (RN3/RN4, DE6).
7. Formatos exatos do login documentados abaixo (nível técnico, não estava na spec).

## Abordagem

1. **Contratos e docs primeiro**: tipos HTTP de login em `libs/contracts` (fonte única
   consumida por PWA e auth-service) e as duas ADRs (0006 e 0007) são as primeiras
   entregas — tudo o mais depende delas.
2. **Infra local**: `.env.example` com todas as variáveis `AUTH_*` (placeholders,
   senha do seed **vazia** para não violar AC7), `.env` atualizado localmente, script
   `npm run auth:keys` que gera o par de chaves RS256 (single-line base64 no `.env`).
3. **auth-service (hexagonal)**: app Nx espelhando o padrão do
   `shopping-list-service` (Fastify, ConfigModule, Drizzle, webpack, Vitest) com
   domínio/casos de uso puros (portas `UserRepository`, `PasswordHasher`, `TokenSigner`,
   `LoginRateLimiter`/`Clock`) e adaptadores em `infrastructure/`. Endpoint
   `POST /api/auth/login`, rate limit em memória (5 falhas/60s por IP) e seed
   idempotente via `nx run auth-service:seed`.
4. **Validação JWT nos outros serviços (AC15)**: lib compartilhada `libs/shared/jwt`
   (verificação RS256 framework-free com `jose`) + guard global no
   `shopping-list-service` (401 para ausente/inválido/expirado) — v1 sem gateway.
5. **PWA Angular**: core de sessão (`core/auth/`) com signals, `localStorage`, guard
   com `returnUrl`, timer de expiração, interceptor; shell passa a renderizar só
   `<router-outlet>`; layout autenticado com app-bar (logout); tela de login
   mobile-first com os 4 estados e tokens do GUIA-DESIGN (AC11).
6. **Testes** (fase do test-engineer): unit/integração por serviço + e2e Playwright
   com `webServer` para `web` e `auth-service` (seed automático no comando do e2e).

## Contratos

### HTTP — novo endpoint do auth-service

Serviço novo `apps/auth-service` (Fastify, prefixo global `api`), porta
`AUTH_API_PORT=3001` (lição do `.env` compartilhado: prefixo `AUTH_`, nunca `PORT`).

**`POST /api/auth/login`** — público (não exige token).

- Request (JSON):
  ```json
  { "username": "string", "password": "string" }
  ```
- **200 OK** — sucesso:
  ```json
  { "accessToken": "<JWT RS256>", "tokenType": "Bearer", "expiresIn": 86400 }
  ```
  (`expiresIn` em segundos; correspondente ao `exp` do JWT — RN11, 24h.)
- **Envelope de erro canônico (400/401/429/500):** um único shape
  `{ statusCode: number, message: string, error?: string }`. `statusCode` e `message`
  são **garantidos**; `error` é **opcional** (nome curto do tipo de erro, pode estar
  presente ou não conforme o transport) e **nunca é dependido pela PWA** — o front
  consome apenas `statusCode` e `message`. Mensagens sempre em PT, genéricas; nenhuma
  resposta contém a senha (AC10). O corpo do **500 nunca expõe detalhes internos**
  (detalhe apenas em log no servidor). T3 tipa este envelope único, T6 emite
  exatamente ele (incl. 429 e 500) e T11 consome só `statusCode`/`message` (decisão do
  parecer de arquitetura 🟠-1).

- **400 Bad Request** — payload inválido (campos ausentes, não-string ou vazios;
  validação no servidor — RN1; a PWA já valida antes, AC6):
  ```json
  { "statusCode": 400, "message": "Nome de usuário e senha são obrigatórios" }
  ```
- **401 Unauthorized** — credenciais inválidas (genérico; não distingue usuário
  inexistente de senha errada e não expõe dado sensível — RN7/AC3):
  ```json
  { "statusCode": 401, "message": "Credenciais inválidas" }
  ```
- **429 Too Many Requests** — limite de falhas atingido na janela (RN13/AC14):
  ```json
  { "statusCode": 429, "message": "Muitas tentativas de login. Aguarde e tente novamente." }
  ```
  + header `Retry-After: <segundos restantes da janela>` (arredondado para cima).
  Vale **antes** da validação de credenciais: mesmo com credenciais corretas, 429 até
  a janela expirar.
- **500** — erro interno (falha não prevista, ex.: banco indisponível): mesmo
  envelope canônico, mensagem genérica `{ "statusCode": 500, "message": "Erro interno" }`;
  detalhes apenas em log no servidor.
- CORS: plugin `@fastify/cors` com `origin` = lista de `AUTH_CORS_ORIGINS` (default
  `http://localhost:4200`), `methods: ['POST','OPTIONS']`,
  `allowedHeaders: ['Content-Type','Authorization']` (chamada direta da PWA ao
  microserviço — ADR 0006). Preflight `OPTIONS` respondido pelo plugin.

### JWT — emissão (auth-service) e validação local (cada serviço)

- **Algoritmo: RS256** (escolha: a chave de assinatura fica só no auth-service; os
  demais serviços validam apenas com a **pública** — ownership da "chave de assinatura"
  como dado do serviço de auth, alinhado ao padrão-ouro da RN12; HS256 forçaria
  distribuir um segredo de assinatura a todos os serviços). Livraria: **`jose`**
  (pareada ao padrão, sem builds nativos, algoritmos explícitos — evita ataques de
  confusão de algoritmo).
- Header do token: `{ "alg": "RS256", "typ": "JWT" }`.
- Claims: `sub` (id do usuário, uuid) · `iss` (env `AUTH_JWT_ISSUER`, default
  `auth-service`) · `iat` (agora) · `exp` (`iat + 86400`). Sem `aud` na v1 (público
  único; registrado na ADR 0007).
- Chaves: `AUTH_JWT_PRIVATE_KEY_B64` / `AUTH_JWT_PUBLIC_KEY_B64` no `.env` (gitignored),
  geradas por `npm run auth:keys` (base64 single-line para evitar PEM multilinha no
  `.env`). `.env.example` contém apenas placeholders documentados.
- Transporte entre PWA e serviços: header `Authorization: Bearer <jwt>`.
- Validação em cada serviço (lib `libs/shared/jwt`): algoritmo pinado `RS256`,
  assinatura válida, `iss` == `AUTH_JWT_ISSUER`, `exp` não vencida (tolerância de
  relógio 0 na v1). Falha em qualquer ponto → **401** (response genérica
  `{ statusCode: 401, message: "Não autorizado" }`), sem distinguir o motivo.

### Eventos

**Nenhum** (spec: login é comando com resposta imediata; nada publicado via RabbitMQ).

## Dados e ownership

- Banco lógico `auth` (já criado no Docker local, ADR 0004): pertence **somente** ao
  auth-service (RN6/ADR 0001). Nenhum outro serviço lê esse banco.
- Tabela `users`: `id uuid pk default gen_random_uuid()`, `username text unique not
  null`, `password_hash text not null`, `created_at timestamptz not null default now()`,
  `updated_at timestamptz`. Migração via drizzle-kit (padrão ADR 0004).
- O `shopping-list-service` não toca dados de auth: recebe apenas o JWT no header e
  valida localmente com a chave pública (AC15). Sem token → 401; com token válido →
  aceito (rota `/api` atual do hello-world já fica protegida).
- Código compartilhado entre serviços (não é dado): `libs/contracts` (tipos HTTP de
  login) e nova `libs/shared/jwt` (verificador). Compartilhar código não viola a
  regra de ownership de dados.
- Segredos: nada de senha, chave privada ou token em arquivos versionados. `.env`
  gitignored (já está), `.env.example` só com placeholders, senha do seed **vazia** no
  exemplo (AC7 — o valor usado localmente nunca aparece no repo).

## Regras de domínio e casos de uso

Caso de uso `LoginUseCase` (puro, sem Nest/HTTP/banco) com portas:

1. `LoginRateLimiter` — se bloqueado (≥ `max` falhas na janela) → erro genérico **429**
   (sem consultar banco nem comparar hash — AC14 "mesmo com credenciais corretas").
2. `UserRepository.findByUsername(username)` → `User | null`.
3. Se `null` → mesmo erro genérico do passo 4, comparando contra um **hash dummy:
   hash bcrypt real de um segredo aleatório fixo, gerado com o mesmo
   `AUTH_PASSWORD_HASH_COST`** — tempo de comparação idêntico ao caminho real
   (RN7: não revela se o usuário existe; 🟡-3).
4. `PasswordHasher.verify(password, hash)` — falha ⇒ registra a falha no rate limiter
   e responde 401 genérico; sucesso ⇒ zera o contador do cliente.
5. `TokenSigner.sign(user)` → JWT RS256 24h (claims acima) → 200.

Regras de negócio da spec cobertas: RN1 (campos obrigatórios, validação servidor),
RN3/RN4 (seed com hash, nunca texto puro), RN5 (JWT), RN6 (dono do banco auth), RN7
(erro genérico, senha nunca em tela/erro/log), RN8 (uma única conta),
RN10 (guard de rotas + retorno à rota original), RN11 (24h, localStorage, sem refresh,
logout manual, expirado → login), RN12 (validação local), RN13 (rate limit 5/60s → 429).

Número exato do rate limit (RN13/AC14): **máximo de 5 tentativas com falha por janela
de 60 segundos**, por **IP** (`req.ip`, sem proxy na v1 local), janela fixa
(fixed window a partir da 1ª falha), contador em memória (`Map<ip, {count, windowStart}>`)
com **relógio injetável** (testes), sem broker/serviço novo — implementação própria,
sem lib de rate limit (libs genéricas contam todas as requisições; aqui contam-se
apenas **falhas**). Configurável por env para testes: `AUTH_RATE_LIMIT_MAX_FAILURES=5`
e `AUTH_RATE_LIMIT_WINDOW_MS=60000` (defaults no código). O contador zera no sucesso e
expira com a janela; reiniciar o serviço zera (limitação aceita, v1 local).

Hash da senha (RN4): **bcrypt** via `bcryptjs` (implementação pura JS — sem build
nativo no Windows, alinhado à lição do Fastify/npm; mesmo algoritmo/custo do bcrypt
nativo; troca trivial atrás do port `PasswordHasher`). **Custo 12** (OWASP ≥ 10),
configurável por env `AUTH_PASSWORD_HASH_COST=12` (testes usam custo baixo).
Uniformização de timing quando o usuário não existe: comparação contra um hash dummy
**bcrypt real no mesmo custo** (não uma constante de custo diferente), e a falha
registra-se no rate limiter como qualquer senha errada (🟡-3).

Seed (RN3/DE6): `apps/auth-service/scripts/seed.ts` executado por
`nx run auth-service:seed` (runner **`tsx`**, nova devDependency — não é serviço nem
broker, logo não viola RN13). Lê `AUTH_SEED_USERNAME` (default `lista` no exemplo) e
`AUTH_SEED_PASSWORD` do `.env` da raiz (via `process.loadEnvFile`, Node ≥ 21 — sem
dependência nova); **aborta com mensagem clara se a senha estiver vazia/ausente**
(proteção do AC7); aplica bcrypt (mesmo `AUTH_PASSWORD_HASH_COST`); **upsert
idempotente** (`ON CONFLICT (username) DO UPDATE SET password_hash = ...` — re-executar
atualiza o hash se a senha do `.env` mudou; `.env` é a fonte de verdade local). Log
informa o usuário, nunca a senha (AC10).

## Estratégia de testes

Pré-requisitos de ambiente para testes de integração/e2e: `npm run docker:up` (Postgres
com banco `auth` já criado) e seed executado (o comando do e2e roda o seed antes de
subir o auth-service; testes de integração cobrem seed e re-executam-no).

Camadas (o test-engineer executa em tarefas T12/T13/T14; o terreno é preparado nas
tarefas de implementação com harness verde — sem `passWithNoTests`, lição do setup):

- **auth-service (Vitest, padrão do repo)**
  - Unit (domínio/aplicação, sem HTTP/banco): política do rate limit com **relógio
    injetado/fake timers** (5 falhas → bloqueado; credenciais corretas bloqueadas na
    janela; expiração da janela reabre; sucesso zera); `PasswordHasher` (round-trip,
    custo baixo em teste); `TokenSigner` (assinatura RS256 verificável com a pública,
    exp = iat + 86400, iss correto, alg pinado).
  - Integração (módulo Nest + Fastify `inject`): `POST /api/auth/login` — 200 com o
    shape exato do contrato; 401 genérico (usuário inexistente == senha errada, sem
    indicar campo) **e o caminho usuário-inexistente também conta falha no rate
    limiter** (🟡-3); 400 para payload inválido; 500 com envelope canônico e sem
    detalhes; 429 após 5 falhas (com `Retry-After`) e recuperação após a janela;
    CORS/preflight para a origem da PWA; resposta e logs sem a senha (AC10).
  - Persistência/seed (Postgres local): rodar o seed 2x (idempotente; hash muda se a
    senha do `.env` mudou); conferir que o banco guarda hash e não texto puro (AC8);
    login no banco semeado funciona (AC8).
- **`libs/shared/jwt` (Vitest)**: token válido aceito; expirado/assinatura errada/
  `iss` errado/algoritmo `HS256` ou `none`/token malformado/ausente → rejeitados;
  `extractBearerToken` (header ausente/malformado).
- **shopping-list-service (Vitest)**: `APP_GUARD` global — requisição sem token,
  token inválido e token expirado → 401; com JWT válido (emitido pelo auth em teste)
  → 200 na rota atual (AC15, requisição direta ao serviço, sem gateway).
- **PWA (Vitest, `@angular/build:unit-test`)**: session service (salvar/ler/limpar do
  `localStorage`, `isExpired()` decode do payload, timer de expiração com fake
  timers); guard (rota original preservada em `returnUrl`, deep link, recarga); 
  interceptor (`Authorization` presente; 401 → logout + redirect); tela de login —
  AC4 (botão desabilitado + rotulo `Entrando…`, 1 requisição), AC3 (mensagem genérica),
  AC5 (falha de rede mantém inputs, toast), AC6 (campos vazios: sem envio), AC14
  (mensagem 429).
- **e2e (Playwright, `apps/web-e2e`)** — atualizar `playwright.config.mts` para
  **dois `webServer`**: `web` (`nx run web:serve`) e `auth-service`
  (`nx run auth-service:seed && nx run auth-service:serve`), `reuseExistingServer`,
  baseURL 4200. Specs por fluxo: login sem sessão em tela cheia (AC1); sucesso →
  `localStorage` com token e `exp−iat = 86400` (AC2/AC13); erro genérico visível
  (AC3); duplo toque no botão → 1 requisição (AC4); falha de rede (rota bloqueada via
  route do Playwright) preserva inputs (AC5); submit vazio → validação local, sem
  rede (AC6); nenhum link/botão/rota de cadastro (AC9); deep link sem sessão → login →
  rota original (AC12); recarga com sessão → continua; logout manual → login (AC13);
  expiração → login (token expirado injetado no `localStorage`); 5 falhas → 6ª
  tentativa 429 visível (AC14 — janela de expiração coberta em integração com fake
  timers; o e2e não espera 60s); viewport 360px + tema claro/escuro (AC11); tokens
  visuais (sem cor hardcoded — inspeção de estilos).
- Observância de regras do repo: sem `passWithNoTests`; `nx sync` após criar
  projetos/libs (lição 8); checar portas/processos órfãos antes de re-tentar (lição
  9); `git status` antes de qualquer commit (lição 10); conferir majors de
  dependências à mão por causa do `--legacy-peer-deps` (lição 3).

## Riscos e trade-offs

- **JWT em `localStorage`** (RN11): exposto a XSS. Decisão de produto fechada;
  mitigação na v1: 24h, sem refresh, logout manual, expiração → login; documentado na
  ADR 0006 (didático: por que não cookie/httpOnly nesta fase).
- **RS256 com chaves no `.env`** (base64): mais robusto que HS256 para múltiplos
  validadores (só a pública circula), porém exige o passo `npm run auth:keys`.
  Mitigação: `.env` gitignored; a pública não é segredo; migração futura para JWKS/
  gateway registrada na ADR 0007. **Se o par for perdido, basta regenerar
  (`npm run auth:keys`): os tokens em circulação ficam inválidos até o `exp` (≤ 24h)
  e a pessoa faz login de novo — a conta semeada não é afetada, pois o seed é
  independente das chaves** (🟡-5).
- **bcryptjs vs bcrypt nativo**: ~2× mais lento (irrelevante com 5 tentativas/min e
  custo configurável); zero risco de build nativo no Windows/OneDrive.
- **Rate limit em memória**: reseta no restart e não escala horizontalmente — aceito
  para v1 local (RN13 explicitamente pede "sem dependência nova"); upgrade futuro já
  isolado atrás da port `LoginRateLimiter`.
- **CORS de origem única** (default `http://localhost:4200`): v1 local; o gateway
  futuro (ADR 0006) elimina a necessidade (chamada same-origin).
- **Base URL da PWA hardcoded** (`http://localhost:3001`): v1 local; vira relativa/única
  quando o gateway existir (ADR 0006).
- **Paralelismo de tarefas**: `package.json`/lock da raiz e `tsconfig.base.json` são
  pontos de conflito — dependências de runtime centralizadas na tarefa T5; criação
  de projetos/libs em sequência com `nx sync` (ordem no grafo abaixo).
- **AC14 no e2e**: a recuperação pós-janela (60s) é validada em integração (fake
  timers/relógio injetável); o e2e cobre a chegada ao 429. Se o usuário quiser o e2e
  completo com espera real (~65s), é possível e fica registrado como opção.
- **Testes de integração dependem do Docker local** (Postgres up + seed): documentado
  em README e no comando do e2e; o validador roda com o ambiente provisionado.
- **Ambiente compartilhado (monorepo)**: todas as variáveis novas com prefixo `AUTH_`
  para não colidir (`PORT`/`API_PORT` já ensinaram — lição 5).

## Tarefas (spec → tarefa)

Grafos de dependência e paralelismo no final da tabela. Áreas: **Docs/ADR**,
**Contrato**, **Infra/env**, **Backend auth**, **Backend validação**, **PWA**,
**Testes**.

| # | Tarefa (detalhada e verificável) | ACs cobertos |
| --- | --- | --- |
| T1 | **ADR 0006** — `docs/decisions/0006-*.md`: (a) exceção temporária à ADR 0001 (PWA→auth direto), com **escopo da exceção** (operação de login e endpoints futuros do auth-service, até o gateway existir), base URL local `http://localhost:3001` e política de sessão v1 (24h, `localStorage`, sem refresh, logout manual); (b) **migração para o gateway com gatilho por feature, não por data** (a feature "API Gateway" do backlog), **critérios de aceite da migração** (PWA passa a URL relativa; CORS do auth-service removido; base `http://localhost:3001` deprecada) e **dono do follow-up** (feature gateway no backlog — 🟡-1); (c) **convenção de prefixo por serviço** nas variáveis de ambiente (`AUTH_*`; `API_*`/`DATABASE_URL` são herança do primeiro serviço da ADR 0004) — serviços novos usam `<SERVICO>_*` (🟠-2); (d) seção **"Rate limit na v1"**: por que em memória (instância única local, sem dependência nova — RN13) e caminho de upgrade (armazenamento distribuído/Redis ou gateway quando houver distribuição; já isolado atrás da port `LoginRateLimiter` — 🟡-3). Verificável: ADR aceita seguindo `TEMPLATE-adr.md`, com Status/Data/Contexto/Decisões/Consequências e os 4 blocos acima. | AC2, AC13 (contexto) |
| T2 | **ADR 0007** — `docs/decisions/0007-*.md`: validação local de JWT na borda de cada serviço (RN12) — RS256, `jose`, claims mínimas (`sub`,`iss`,`iat`,`exp`), pública via `.env`, 401 uniforme sem distinguir motivo, sem `aud` na v1, evolução para JWKS. Verificável: ADR aceita no template. | AC15 (contexto) |
| T3 | **Contrato de login** — `libs/contracts/src/http/auth.ts` (+ exports em `http/index.ts`): `LoginRequest`, `LoginSuccessResponse`, `ApiErrorResponse` (**envelope canônico `{ statusCode, message, error? }` — `error` opcional, nunca dependido pela PWA; um único shape para 400/401/429/500**), `JwtClaims`; atualizar `libs/contracts/README.md` com o contrato HTTP documentado (rota, status 200/400/401/429/500 e o envelope de erro canônico). Verificável: tipos exportados de `@lista/contracts` refletem o envelope único e README com o endpoint documentado (decisão 🟠-1). | AC2, AC3, AC14 (base dos contratos) |
| T4 | **Infra/env** — `.env.example` com placeholders: descomentar `AUTH_DATABASE_URL`, adicionar `AUTH_API_PORT=3001`, `AUTH_CORS_ORIGINS=http://localhost:4200`, `AUTH_JWT_ISSUER=auth-service`, `AUTH_JWT_PRIVATE_KEY_B64=<>`, `AUTH_JWT_PUBLIC_KEY_B64=<>`, `AUTH_SEED_USERNAME=lista`, `AUTH_SEED_PASSWORD=` (vazio + comentário "defina uma senha local; nunca commite"), `AUTH_PASSWORD_HASH_COST=12`, `AUTH_RATE_LIMIT_MAX_FAILURES=5`, `AUTH_RATE_LIMIT_WINDOW_MS=60000`. Script `scripts/generate-jwt-keys.mjs` + npm script `auth:keys` (gera par RS256 e grava/atualiza `AUTH_JWT_*_B64` no `.env` local — nunca em arquivo versionado; **sem ecoar as chaves no stdout/logs** — sai apenas confirmação não sensível, ex.: "chaves geradas e gravadas no .env" — 🟡-6). Atualizar seção de comandos do README. Verificável: `npm run auth:keys` gera chave utilizável (verificada com `jose`) sem imprimir o material das chaves na saída; busca no repo pelo valor real da senha local retorna **zero** resultados em arquivos versionados (AC7). | AC7 |
| T5 | **Scaffold `apps/auth-service`** (área Backend, fundação): projeto Nx (webpack/Fastify, ConfigModule global, prefixo `api`, `AUTH_API_PORT`, Vitest com harness e smoke test de DI real — sem `passWithNoTests`), schema Drizzle `users` + migration, `UserRepository` (port + adapter Drizzle com `AUTH_DATABASE_URL`), adapters `PasswordHasher` (bcryptjs, custo de `AUTH_PASSWORD_HASH_COST`) e `TokenSigner` (jose RS256, `AUTH_JWT_ISSUER`, exp 24h). **Nesta tarefa** entram todas as dependências novas da raiz (bcryptjs, `@types/bcryptjs` dev, jose, `@fastify/cors`, tsx dev) e `nx sync` após criar o projeto. Verificável: `nx run auth-service:test` verde (smoke), `nx build auth-service` verde, migration gerada. | base AC2, AC8, AC15 |
| T6 | **Login endpoint** (Backend): `LoginUseCase` no domínio/aplicação (portas de T5), controller `POST /api/auth/login` emitindo **exatamente o envelope canônico de erro de T3** (400/401/500 + sucesso 200 no shape de T3; o 429 entra na T7 com o mesmo envelope), CORS via `@fastify/cors` com `AUTH_CORS_ORIGINS`, logging sem credenciais (AC10). Verificável: integração `inject` cobre 200/400/401 e CORS com o envelope único (sem `error` obrigatório); corpo/resposta/log sem senha (🟠-1). | AC2, AC3, AC7(parc.), AC10, RN1/RN5/RN7 |
| T7 | **Rate limit do login** (Backend): política `LoginRateLimiter` (domain, max 5 / janela 60s / relógio injetável) + adaptador em memória por IP + wiring no controller (429 + `Retry-After` antes de validar credenciais, no envelope canônico de T3), env `AUTH_RATE_LIMIT_*`; **hash dummy para usuário inexistente = hash bcrypt real de um segredo aleatório fixo, gerado com o mesmo `AUTH_PASSWORD_HASH_COST`** (tempo de comparação idêntico ao caminho real — RN7/🟡-3). Verificável: integração — 5 falhas, 6ª tentativa (mesmo correta) → 429; janela expirada (clock/fake timers) → login aceito; sucesso zera contador; usuário inexistente também registra falha no rate limiter (asserção na T12). | AC14 |
| T8 | **Seed** (Backend): `apps/auth-service/scripts/seed.ts` (tsx), target `auth-service:seed` no `project.json`, upsert idempotente com hash bcrypt, aborta se `AUTH_SEED_PASSWORD` vazia, logs sem segredo. **Limitação do upsert por `username` resolvida para a v1** (conta única — RN8): o seed também **apaga linhas `users` fora do `AUTH_SEED_USERNAME`** (com log de aviso), mantendo o `.env` como fonte de verdade e evitando linha órfã se o usuário semeado mudar (🟡-4). Verificável: `nx run auth-service:seed` 2× sem erro (hash atualizado se a senha mudou; linhas fora do seed removidas com aviso), banco contém hash (nunca texto puro — AC8), `git grep <senha>` vazio (AC7). | AC7, AC8, RN3/RN4 |
| T9 | **Validação JWT local (AC15)** (Backend validação): nova lib `libs/shared/jwt` (verificador framework-free com jose: RS256 pinado, `iss`, `exp`; `extractBearerToken`) + `APP_GUARD` global no `shopping-list-service` (401 ausente/inválido/expirado; rota `/api` atual protegida) lendo `AUTH_JWT_PUBLIC_KEY_B64`/`AUTH_JWT_ISSUER`; **o guard já nasce com suporte a metadata `@Public()`** (decorator `SetMetadata`) para rotas públicas futuras (healthcheck etc.) — na v1 nenhuma rota usa (🟡-2); `nx sync`. Verificável: integração — 401 sem token/inválido/expirado e 200 com JWT emitido pelo auth (requisição direta, sem gateway); teste do `@Public()` (rota anotada ignora o guard). | AC15 |
| T10 | **Core de sessão + rotas + shell** (PWA): `src/app/core/auth/` — session service (signals; `localStorage` key `lcd.accessToken`; decode do payload p/ `isExpired`; `login()`/`logout()`; timer de expiração → redirect login), interceptor (`Authorization: Bearer` + 401 → logout/redirect), config `AUTH_API_BASE_URL='http://localhost:3001'`; rotas: `/login` (com guard anti-sessão) + `''` (guarda autenticada) com `AuthenticatedShell` (app-bar + botão "Sair" + `<router-outlet>`) e filhos `''` (home placeholder) e `**` (placeholder autenticado preservando URL p/ `returnUrl`); `App` passa a renderizar só `<router-outlet>`; ajustar smoke tests existentes (unit `app.spec.ts` e e2e `app.spec.ts`) para a nova navegação. Verificável: unit — guard/returnUrl/deep link/recarga; timer dispara redirect; interceptor anexa header; e2e smoke ajustado verde. | AC1(parc.), AC9, AC12, AC13 |
| T11 | **Tela de login** (PWA): `src/app/features/login/` — form reativo (username/password, labels visíveis, `aria-describedby`/`aria-invalid`, toque ≥ 44px, `touch-action: manipulation`), estados vazio/erro/carregando/sucesso do GUIA-DESIGN: botão primary com `Entrando…` + disabled (AC4), validação local p/ campos vazios SEM envio (AC6), mapeamento de erros consumindo **apenas `statusCode` e `message` do envelope canônico (nunca `error`)** (🟠-1): 401 genérico (AC3), 429 mensagem de limite (AC14), rede/5xx → toast mantendo inputs (AC5), erro sempre visível na tela (nunca só console); tema claro/escuro via tokens, layout 360px e desktop centralizado (`--container-max`). Sem qualquer link/rota de cadastro (AC9) e `type="password"` (AC10). Verificável: unit dos estados; e2e dos fluxos. | AC1, AC3, AC4, AC5, AC6, AC9, AC10, AC11, AC14 |
| T12 | **Testes backend** (test-engineer): unit/integração conforme "Estratégia de testes" — auth-service (rate limit com fake timers, hasher, signer, contrato 200/400/401/429/500 com o **envelope canônico** — incl. 500 sem detalhes e sem credencial em response/log), **asserção de que o caminho usuário-inexistente também registra falha no rate limiter** (🟡-3), `libs/shared/jwt`, guard do shopping-list-service (incl. `@Public()`), integração Postgres local + seed (AC8). Verificável: suíte verde e mapeamento critério→teste no relatório. | AC2, AC3, AC7, AC8, AC10, AC14, AC15 |
| T13 | **Testes PWA (unit)** (test-engineer): session service, guard/returnUrl, interceptor, components/login com fake timers. Verificável: suíte verde. | AC3, AC4, AC5, AC6, AC11, AC12, AC13, AC14 |
| T14 | **Testes e2e** (test-engineer): `playwright.config.mts` com dois `webServer` (web + auth com seed no comando) e specs dos fluxos listados em "Estratégia de testes" (AC1–AC6, AC9, AC11–AC14 parcial). Verificável: `nx e2e web-e2e` verde com Docker up. | AC1, AC2, AC3, AC4, AC5, AC6, AC9, AC11, AC12, AC13, AC14 |

### Ordem e paralelismo (para o orquestrador)

Tarefas que tocam **os mesmos arquivos** são sequenciais; áreas distintas podem rodar
em paralelo (subagentes em background):

- **Onda 1 (4 em paralelo):** T1, T2, T3, T4 — arquivos disjuntos (ADRs, contracts,
  env/scripts/README). *Nota: T4 edita `package.json` (scripts) — sequencial com T5.*
- **Onda 2 (1):** T5 — fundação do auth-service + **todas** as dependências da raiz
  (`package.json`/lock em um único lugar) + `nx sync`.
- **Onda 3 (4 em paralelo):** T6 (dep. T3+T5), T8 (dep. T4+T5), T9 (dep. T5 — cria
  `libs/shared/jwt`, toca `tsconfig.base.json` já estabilizado por T5), T10 (dep. T3;
  PWA — nada em comum com backend).
- **Onda 4 (2 em paralelo):** T7 (após T6 — mesmo módulo/controller), T11 (após T10 —
  mesma app web).
- **Onda 5 (3 em paralelo):** T12, T13, T14 (todas as implementações prontas).

## Decisões

- **Nova ADR 0006** (tarefa T1) — exceção temporária da PWA ao gateway + políticas de
  sessão v1 + migração futura (gatilho por feature, critérios de aceite, dono do
  follow-up) + convenção de prefixo por serviço + seção "Rate limit na v1"
  (porquê e upgrade).
- **Nova ADR 0007** (tarefa T2) — validação local de JWT RS256 na borda de cada
  serviço.
- JWT: **RS256** com `jose` (assinatura só no auth-service; demais serviços usam a
  chave pública) — detalhes na ADR 0007.
- Hash: **bcryptjs, custo 12** (configurável via `AUTH_PASSWORD_HASH_COST`), port
  `PasswordHasher` permite troca futura; hash dummy de mesmo custo para
  usuário inexistente (🟡-3).
- Rate limit: **5 falhas / 60s por IP, em memória**, 429 + `Retry-After`, relógio
  injetável, env-configurável para testes (RN13 fechada na spec; número fechado aqui;
  porquê/upgrade registrados na ADR 0006 — 🟡-3).
- Envelope de erro canônico do contrato de login: `{ statusCode, message, error? }`
  para 400/401/429/500; `error` opcional e **nunca** consumido pela PWA (T3/T6/T11 —
  🟠-1).
- Seed: `.env` gitignored + `.env.example` com `AUTH_SEED_PASSWORD` **vazia** (AC7),
  upsert idempotente + **remoção de linhas fora do `AUTH_SEED_USERNAME`** (conta
  única v1; `.env` é a fonte de verdade — 🟡-4), hash nunca persiste texto puro.
- Guard global do shopping-list-service nasce com suporte a `@Public()` para rotas
  públicas futuras (healthcheck etc.) (🟡-2).
- Endpoint: `POST /api/auth/login` com prefixo `api` (gateway futuro roteia
  `/api/auth/*`); CORS para `http://localhost:4200` na v1.
- Página autenticada pós-login: shell com app-bar e home placeholder, **sem bottom
  nav** nesta feature (as abas Lista/Histórico/Menor preço entram com suas features;
  ADR 0005 fica preparada, não implementada).
- Variáveis de ambiente novas sempre prefixadas por serviço (`AUTH_*`); a convenção
  vira regra registrada na ADR 0006, com `API_*`/`DATABASE_URL` reconhecidos como
  herança do primeiro serviço (🟠-2, lição do monorepo).

**Aprovação do usuário:** Sim — plano aprovado pelo usuário (implementação liberada).

> **Revisão de arquitetura incorporada (2026-10-07):** parecer do
> `architecture-review` **APROVADO COM RESSALVAS, sem 🔴** — ajustes aplicados:
> 🟠-1 (envelope de erro canônico em T3/T6/T11), 🟠-2 (convenção de prefixo por
> serviço na ADR 0006/T1), 🟡-1 (gatilho, critérios e dono da migração de gateway na
> ADR 0006), 🟡-2 (`@Public()` na T9), 🟡-3 (hash dummy de mesmo custo + teste do
> rate limiter no caminho usuário-inexistente + seção "Rate limit na v1" na ADR
> 0006), 🟡-4 (seed remove linhas fora do usuário semeado), 🟡-5 (regenerar chaves
> invalida tokens mas não re-semeia senha) e 🟡-6 (`auth:keys` sem eco de chaves).
> Grafo de dependências/ondas inalterado.
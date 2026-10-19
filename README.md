# Lista de Compras

Aplicação PWA mobile-first para uma lista de compras familiar compartilhada e histórico de preços por item.

O projeto é também um ambiente de aprendizado prático de Angular, arquitetura hexagonal, microserviços, mensageria e uso de IA no ciclo de desenvolvimento.

## Documentação

- [Escopo inicial](docs/product/initial-scope.md)
- [Decisão arquitetural: base técnica](docs/decisions/0001-base-tecnica.md)
- [Decisão arquitetural: dados de compra e acesso inicial](docs/decisions/0002-dados-de-compra-e-acesso-inicial.md)
- [Decisão arquitetural: setup do workspace front-end](docs/decisions/0003-setup-do-workspace-front-end.md)
- [Decisão arquitetural: setup do front, back e e2e](docs/decisions/0004-setup-do-front-do-back-e-do-e2e.md)
- [Decisão arquitetural: exceção temporária ao gateway para o shopping-list-service](docs/decisions/0009-excecao-temporaria-ao-gateway-shopping-list-service.md)
- [Decisão arquitetural: exceção temporária ao gateway para o price-history-service](docs/decisions/0010-excecao-temporaria-ao-gateway-price-history-service.md)
- [Lições do setup inicial](docs/lessons/2026-10-07-setup-inicial.md)
- [Plano de setup do SDD](docs/plans/2026-10-06-sdd-setup.md)
- [Fluxo SDD canônico](docs/process/sdd-workflow.md)

Toda decisão arquitetural relevante é registrada como ADR antes (ou junto) da mudança correspondente.

## Estrutura do monorepo (Nx)

```text
apps/
  web/                    PWA Angular (zoneless, PWA, bundler esbuild)
  web-e2e/                testes e2e (Playwright)
  shopping-list-service/  NestJS + Fastify (arquitetura hexagonal)
  auth-service/           NestJS + Fastify (login / JWT)
  price-history-service/  NestJS + Fastify (histórico e menor preço)
libs/
  contracts/              contratos HTTP/eventos compartilhados
  shared/util/            utilitários compartilhados
  ui-web/                 componentes de UI compartilhados
docker/
  compose.dev.yml         Postgres 16 + RabbitMQ (dev local)
  postgres/init/          criação dos bancos lógicos por serviço
docs/                     escopo, ADRs, planos e specs de features
```

## Setup

Pré-requisitos: Node.js 22+, npm 10+ e Docker Desktop (apenas para o banco/mensageria).

```bash
npm install --legacy-peer-deps   # workaround do bug "edgesOut" do npm 10.9.2
cp .env.example .env             # variáveis locais (o .env é ignorado pelo git)
npm run auth:keys                # gera o par RS256 e grava AUTH_JWT_*_B64 no .env local
```

O `npm run auth:keys` é pré-requisito do dev local do **auth-service** (feature
Autenticação, ADR 0007): gera o par de chaves RS256 (base64 single-line) usado
para assinar e validar os JWTs e grava-o no `.env` local — que é ignorado pelo
git, então as chaves nunca entram no repositório. O comando **não imprime o
material das chaves** no terminal, apenas uma confirmação.

### Front-end (`apps/web`)

```bash
npx nx serve web    # dev server em http://localhost:4200
npx nx build web    # build de produção (com service worker) em dist/apps/web
npx nx test web     # testes unitários (Vitest via @angular/build:unit-test)
npx nx lint web
```

### Backend (`apps/shopping-list-service`)

```bash
npx nx serve shopping-list-service   # API NestJS/Fastify em http://localhost:3000/api
npx nx build shopping-list-service   # bundle Node em dist/apps/shopping-list-service
npx nx test shopping-list-service    # smoke: DI do Nest + adaptador Fastify
npx nx lint shopping-list-service
```

O serviço lê `API_PORT`, `DATABASE_URL` e `RABBITMQ_URL` do `.env` da raiz (ver `.env.example`).
`RABBITMQ_URL` é compartilhada com o price-history-service: aqui o shopping-list
é o **produtor** do evento `shopping-list.purchase-completed` (outbox → broker).

O serviço entrega a feature **Lista de compras ativa**: a PWA
(`apps/web`, em `http://localhost:4200`) chama `http://localhost:3000/api/shopping-list/*`
**direto**, sob o prefixo `/api`. É uma **exceção temporária à ADR 0001**,
registrada na [ADR 0009](docs/decisions/0009-excecao-temporaria-ao-gateway-shopping-list-service.md):
vale enquanto o gateway não existe e é removida quando ele chegar (URL relativa
via gateway + CORS removido). A chamada cruzada local é viabilizada pelo CORS
(`SHOPPING_LIST_CORS_ORIGINS`, default `http://localhost:4200` — ver
`.env.example`), que **não** é controle de segurança: o JWT continua sendo
validado **localmente na borda do serviço** ([ADR 0007](docs/decisions/0007-validacao-local-de-jwt.md)).

Os **testes de integração** do serviço e a **migração** exigem o **Docker local**
(Postgres + RabbitMQ) e o banco lógico `shopping_list` (criado no primeiro boot
do Postgres):

```bash
npm run docker:up                                # Postgres + RabbitMQ (cria o banco shopping_list)
npx nx run shopping-list-service:db:generate     # drizzle-kit generate (SQL versionado)
npx nx run shopping-list-service:db:migrate      # drizzle-kit migrate (aplica no shopping_list)
```

### Backend (`apps/price-history-service`)

```bash
npx nx serve price-history-service   # API NestJS/Fastify em http://localhost:3002/api
npx nx build price-history-service   # bundle Node em dist/apps/price-history-service
npx nx test price-history-service
npx nx lint price-history-service
```

O serviço lê `PRICE_HISTORY_API_PORT`, `PRICE_HISTORY_DATABASE_URL`,
`PRICE_HISTORY_CORS_ORIGINS` (opcional) e `RABBITMQ_URL` do `.env` da raiz (ver
`.env.example`). Prefixo `PRICE_HISTORY_*` ([ADR 0010](docs/decisions/0010-excecao-temporaria-ao-gateway-price-history-service.md) §4).
`RABBITMQ_URL` é a mesma do shopping-list: aqui o price-history é o
**consumidor** do evento `shopping-list.purchase-completed` (fila → ingestão).

A PWA (`apps/web`, em `http://localhost:4200`) chama
`http://localhost:3002/api/price-history/*` **direto** (consultas GET). É uma
**exceção temporária à ADR 0001**, registrada na
[ADR 0010](docs/decisions/0010-excecao-temporaria-ao-gateway-price-history-service.md):
vale enquanto o gateway não existe e é removida quando ele chegar (URL relativa
via gateway + CORS removido). A chamada cruzada local é viabilizada pelo CORS
(`PRICE_HISTORY_CORS_ORIGINS`, default `http://localhost:4200` — methods
`GET`/`OPTIONS`), que **não** é controle de segurança: o JWT continua sendo
validado **localmente na borda do serviço** ([ADR 0007](docs/decisions/0007-validacao-local-de-jwt.md)).

Os **testes de integração**, o **consumidor RabbitMQ** e a **migração** exigem o
**Docker local** (Postgres + RabbitMQ) e o banco lógico `price_history`
(criado no primeiro boot do Postgres):

```bash
npm run docker:up                                # Postgres + RabbitMQ (cria o banco price_history)
npx nx run price-history-service:db:generate     # drizzle-kit generate (SQL versionado)
npx nx run price-history-service:db:migrate      # drizzle-kit migrate (aplica no price_history)
```

### Testes e2e (Playwright)

```bash
npx playwright install chromium   # uma vez por máquina
npx nx e2e web-e2e                # sobe o serve do web e roda o spec de fumaça
```

### Infraestrutura local (Docker)

```bash
npm run docker:up      # Postgres 16 + RabbitMQ (ou: docker compose -f docker/compose.dev.yml up -d)
npm run docker:down    # derruba os containers
```

No primeiro boot, o script em `docker/postgres/init/` cria um banco lógico com
papel e senha próprios para cada serviço (`auth`, `shopping_list`,
`price_history`), conforme a ADR 0001. O RabbitMQ (porta `5672`, management
`15672`) é o broker do evento entre shopping-list (produtor) e price-history
(consumidor); ambos leem `RABBITMQ_URL` no `.env`. O Docker Desktop precisa
estar rodando.

### Atalhos npm

```bash
npm run web                 # nx serve web (PWA, porta 4200)
npm run ms-shopping-list    # nx serve shopping-list-service (porta 3000)
npm run ms-auth             # nx serve auth-service (porta 3001)
npm run ms-all              # sobe todos os serviços de uma vez (web + shopping-list + auth)
npm run build               # nx run-many -t build
npm run test                # nx run-many -t test
npm run lint                # nx run-many -t lint
npm run e2e                 # nx e2e web-e2e
npm run docker:up           # sobe Postgres + RabbitMQ
npm run docker:down         # derruba os containers
npm run auth:keys           # gera o par RS256 e grava AUTH_JWT_*_B64 no .env local
npm run auth:seed           # aplica migrações e semeia o usuário inicial no banco auth
```

### Problemas conhecidos

- Se um target de e2e travar sem saída, `npx nx reset` limpa o daemon do Nx.
- Se o Nx avisar "workspace is out of sync", rode `npx nx sync`.

## Fluxo SDD com agentes

Spec (`product-spec`) → Plano (`tech-planner`) → Revisão
(`architecture-review` quando cruza serviços) → Implementação
(`backend-dev`/`angular-dev`) → Auditoria de testes (`test-engineer`) →
Validação (`feature-validator`), orquestrado por `sdd-orchestrator`.

Cada feature vive em `docs/features/<feature>/` com estado, spec, plano e
validação versionados. Usuário aprova spec/plano e operações de integração; o
validador comprova os critérios de aceite. Ver `AGENTS.md` e
`docs/process/sdd-workflow.md`.

# Lista de Compras

Aplicação PWA mobile-first para uma lista de compras familiar compartilhada e histórico de preços por item.

O projeto é também um ambiente de aprendizado prático de Angular, arquitetura hexagonal, microserviços, mensageria e uso de IA no ciclo de desenvolvimento.

## Documentação

- [Escopo inicial](docs/product/initial-scope.md)
- [Decisão arquitetural: base técnica](docs/decisions/0001-base-tecnica.md)
- [Decisão arquitetural: dados de compra e acesso inicial](docs/decisions/0002-dados-de-compra-e-acesso-inicial.md)
- [Decisão arquitetural: setup do workspace front-end](docs/decisions/0003-setup-do-workspace-front-end.md)
- [Decisão arquitetural: setup do front, back e e2e](docs/decisions/0004-setup-do-front-do-back-e-do-e2e.md)
- [Lições do setup inicial](docs/lessons/2026-10-07-setup-inicial.md)
- [Plano de setup do SDD](docs/plans/2026-10-06-sdd-setup.md)

Toda decisão arquitetural relevante é registrada como ADR antes (ou junto) da mudança correspondente.

## Estrutura do monorepo (Nx)

```text
apps/
  web/                    PWA Angular (zoneless, PWA, bundler esbuild)
  web-e2e/                testes e2e (Playwright)
  shopping-list-service/  NestJS + Fastify (arquitetura hexagonal)
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

### Testes e2e (Playwright)

```bash
npx playwright install chromium   # uma vez por máquina
npx nx e2e web-e2e                # sobe o serve do web e roda o spec de fumaça
```

### Infraestrutura local (Docker)

```bash
docker compose -f docker/compose.dev.yml up -d    # Postgres + RabbitMQ
docker compose -f docker/compose.dev.yml down
```

No primeiro boot, o script em `docker/postgres/init/` cria um banco lógico com
papel e senha próprios para cada serviço (`auth`, `shopping_list`,
`price_history`), conforme a ADR 0001. O Docker Desktop precisa estar rodando.

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
npm run auth:seed           # semeia o usuário inicial no banco auth
```

### Problemas conhecidos

- Se um target de e2e travar sem saída, `npx nx reset` limpa o daemon do Nx.
- Se o Nx avisar "workspace is out of sync", rode `npx nx sync`.

## Fluxo SDD com agentes

Spec (`product-spec`) → Plano (`tech-planner`) → Revisão (`architecture-review` quando cruza serviços) → Implementação (`backend-dev`/`angular-dev`) → Testes (`test-engineer`) → Validação (`feature-validator`), orquestrado por `sdd-orchestrator`.

Cada feature vive em `docs/features/<feature>/` com `SPEC.md` e `PLAN.md`; o gate entre fases é a aprovação do usuário ou do validador. Ver `AGENTS.md` para as regras completas (commits por gate, branch `feature/<nome>`, push só com aprovação).

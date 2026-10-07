# ADR 0004 — Setup do front-end, do back-end e do e2e

**Status:** Aceita  
**Data:** 2026-10-07

## Contexto

Após a ADR 0003, o workspace foi reestruturado no working tree sem commit e sem
registro: a app Angular passou de `apps/lista-de-compras` para `apps/web`, as libs
saíram de `packages/` para `libs/`, e foi criado o esqueleto do serviço backend
`apps/shopping-list-service`. A auditoria do setup mostrou que:

- O `apps/web` foi gerado com outro stack (Analog + Vite, change detection baseada
  em zone, sem PWA) e **não renderiza**: o `index.html` não referencia `main.ts`,
  o dev server responde 404 em `/` (arquivo fora do root do Vite) e o build de
  produção emite apenas um HTML sem JavaScript. `zone.js` nem está instalado.
- O backend compila, mas ainda é o hello-world do NestJS em Express (a ADR 0001
  define Fastify), sem `ConfigModule`, com o Drizzle criado e não conectado a
  nada, e sem a estrutura de camadas da arquitetura hexagonal.
- O projeto e2e (`lista-de-compras-e2e`) foi apagado e nenhum target e2e existe.
- O README ainda descreve a estrutura e os comandos antigos.

## Decisões

- **Estrutura de projetos**: `apps/web` (PWA Angular), `apps/web-e2e` (Playwright),
  `apps/shopping-list-service` (NestJS) e libs em `libs/` (`contracts`,
  `shared/util`, `ui-web`). Substitui os nomes da ADR 0003
  (`lista-de-compras`, `lista-de-compras-e2e`, `packages/`).
- **Front-end = stack da ADR 0003**, confirmado nesta ADR:
  - Build com `@angular/build:application` (esbuild) e dev server com
    `@angular/build:dev-server`.
  - Testes unitários com `@angular/build:unit-test` (Vitest).
  - Zoneless: sem `zone.js`, `provideBrowserGlobalErrorListeners()` no
    `app.config.ts`.
  - PWA: `manifest.webmanifest`, ícones, `ngsw-config.json` e
    `provideServiceWorker(..., { enabled: !isDevMode() })`.
  - O stack Analog + Vite (`@nx/vite:build`, `@nx/vite:dev-server`,
    `vite.config.mts`) é descartado: exige `index.html` no root do projeto,
    não injeta o bootstrap do Angular e levou o scaffold a uma tela em branco;
    o executor também já está deprecated no Nx 24.
- **Estilos**: `apps/web/src/styles/` (reset, design tokens mobile-first e
  utilities em SCSS) fica como base global, importado por `src/styles.scss`.
- **Back-end**:
  - NestJS com adaptador **Fastify** (`@nestjs/platform-fastify`), conforme a
    ADR 0001.
  - `ConfigModule.forRoot({ isGlobal: true })` lendo `.env` da raiz;
    `.env.example` versionado e `.env` ignorado pelo git.
  - Variáveis do serviço prefixadas com `API_` — `API_PORT`, e não `PORT`: o Nx
    injeta o `.env` em todos os targets e o dev server do Angular trata `PORT`
    como a própria porta (aprendizado detalhado em
    [docs/lessons/2026-10-07-setup-inicial.md](../lessons/2026-10-07-setup-inicial.md)).
  - Drizzle ORM como adaptador de persistência: módulo/provider com token de
    injeção (`DRIZZLE`), schema e migrations vazios por enquanto,
    `drizzle-kit` para gerar migrations.
  - Estrutura hexagonal vazia, sem regras de negócio: `src/domain/`,
    `src/application/` (ports e use-cases) e `src/infrastructure/`
    (persistence e messaging). Os controllers NestJS ficam em `src/app/`
    como composition root.
- **e2e**: projeto `apps/web-e2e` com Playwright, `nxE2EPreset` e um único
  spec de fumaça (a app carrega e renderiza o shell). Testes de features
  entram no ciclo SDD; outros navegadores além do Chromium ficam para quando
  houver necessidade. O target `serve` do `web` é marcado
  `continuous: true` para o grafo do Nx (gate `e2e--wait-for-webserver`)
  tratar o dev server como tarefa contínua em vez de aguardá-lo terminar.
- **Infra local**: um único Postgres no Docker com **bancos lógicos separados
  por serviço** (`auth`, `shopping_list`, `price_history`), criados por script
  de init, cada um com papel e senha próprios via variáveis de ambiente —
  conforme a ADR 0001. RabbitMQ permanece no compose.
- **Escopo desta rodada**: somente setup. Não entram aqui regras de negócio,
  seed da conta inicial, gateway, serviço de autenticação, serviço de
  histórico, eventos RabbitMQ nem telas de produto.

## Consequências

- `nx serve web`, `nx build web`, `nx test web` e `nx e2e web-e2e` voltam a
  refletir o stack aceito; o README passa a documentar esses comandos.
- O serviço de lista de compras nasce com adaptadores (Fastify, Config,
  Drizzle) prontos e domínio vazio: a primeira feature entra pelo ciclo SDD
  (spec → plano → implementação → validação) dentro da estrutura hexagonal.
- Autenticação, histórico de preços e gateway continuam inexistentes; seus
  bancos já existem no ambiente local para quando forem criados.
- A ADR 0003 segue válida para as escolhas de stack; esta ADR documenta a
  mudança de nomes de projetos e a reconfirmação do front após o desvio
  temporário do scaffold Analog + Vite.

# ADR 0003 — Setup do workspace front-end

**Status:** Substituída parcialmente pela ADR 0004
**Data:** 2026-10-07

> A stack Angular continua válida, mas os paths atuais são `apps/web`,
> `apps/web-e2e` e `libs/`, conforme a ADR 0004. Não use os paths históricos
> desta ADR para planejar novas tarefas.

## Contexto

O projeto precisa de um workspace front-end base para a PWA Angular definida na ADR 0001 (monorepo Nx). O repositório já continha documentação do produto, decisões e configs dos agentes SDD (`.opencode/`, `.agents/`), então o scaffold precisava preservar esses arquivos.

## Decisões

- O workspace Nx 23 foi gerado a partir do **template vazio** (`nrwl/empty-template`) e a app foi criada com `@nx/angular:application`. O preset `angular-monorepo` foi descartado: ele mapeia para um template de demo full-stack de "shop" (apps `shop`/`api`, pacotes de produtos), conteúdo alheio ao produto.
- A app é `lista-de-compras`, em `apps/lista-de-compras`; o projeto de e2e é `apps/lista-de-compras-e2e`; libs compartilhadas ficarão em `packages/`.
- Angular 22.2 com APIs padrão atuais: standalone, zoneless (sem zone.js), signals. Renderização client-side (CSR), sem SSR. Bundler esbuild.
- Estilos em SCSS.
- Testes unitários com Vitest (executor `@angular/build:unit-test`) e e2e com Playwright.
- Lint com ESLint em flat config: `eslint.config.mjs` na raiz (base do Nx e limites de módulos) e configs por projeto em `apps/lista-de-compras` (angular-eslint) e `apps/lista-de-compras-e2e` (eslint-plugin-playwright), com target `lint` via `@nx/eslint:lint`.
- PWA via `@angular/pwa`: `manifest.webmanifest`, ícones, `ngsw-config.json` e service worker registrado em `app.config.ts` (ativado fora do modo de desenvolvimento).
- A toolchain Angular foi alinhada em 22.2.x porque `@angular/pwa` não tem release estável para 22.1.x (só 21.x-LTS e 22.2+).
- Instalação de dependências com `npm install --legacy-peer-deps`: o npm 10.9.2 desta máquina falha com `Cannot read properties of null (reading 'edgesOut')` em árvores maiores.
- Arquivos de IA gerados pelo template (`AGENTS.md`, `CLAUDE.md`, `.claude`, `.codex`, `.cursor`, `.gemini`, `.opencode`, `.agents`) foram descartados: o projeto já mantém os seus em `.opencode/` e `.agents/`.

## Consequências

- O workspace está pronto para receber os serviços backend (autenticação, lista de compras, histórico de preços) como apps/libs Nx no mesmo monorepo.
- O e2e `lista-de-compras-e2e` contém apenas um spec exemplo; será substituído pelos testes das features durante o ciclo SDD.
- A limitação do npm precisa ser contornada em cada instalação até uma versão corrigida do npm estar disponível.

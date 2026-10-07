# Lista de Compras

Aplicação PWA mobile-first para uma lista de compras familiar compartilhada e histórico de preços por item.

O projeto é também um ambiente de aprendizado prático de Angular, arquitetura hexagonal, microserviços, mensageria e uso de IA no ciclo de desenvolvimento.

## Documentação

- [Escopo inicial](docs/product/initial-scope.md)
- [Decisão arquitetural: base técnica](docs/decisions/0001-base-tecnica.md)
- [Decisão arquitetural: setup do workspace front-end](docs/decisions/0003-setup-do-workspace-front-end.md)
- [Plano de setup do SDD](docs/plans/2026-10-06-sdd-setup.md)

As próximas decisões serão registradas antes da implementação correspondente.

## Setup

Pré-requisitos: Node.js 22+ e npm 10+.

```bash
npm install --legacy-peer-deps   # workaround do bug "edgesOut" do npm 10.9.2
npx nx serve lista-de-compras    # dev server em http://localhost:4200
npx nx build lista-de-compras    # build de produção em dist/
npx nx test lista-de-compras     # testes unitários (Vitest)
npx nx run lista-de-compras-e2e:e2e  # e2e (Playwright; sobe o dev server)
```

Estrutura: `apps/lista-de-compras` (PWA Angular), `apps/lista-de-compras-e2e` (e2e) e `packages/` (libs compartilhadas) em um monorepo Nx.

## Fluxo SDD com agentes

Spec (`product-spec`) → Plano (`tech-planner`) → Revisão (`architecture-review` quando cruza serviços) → Implementação (`backend-dev`/`angular-dev`) → Testes (`test-engineer`) → Validação (`feature-validator`), orquestrado por `sdd-orchestrator`.

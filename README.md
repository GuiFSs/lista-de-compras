# Lista de Compras

Aplicação PWA mobile-first para uma lista de compras familiar compartilhada e histórico de preços por item.

O projeto é também um ambiente de aprendizado prático de Angular, arquitetura hexagonal, microserviços, mensageria e uso de IA no ciclo de desenvolvimento.

## Documentação

- [Escopo inicial](docs/product/initial-scope.md)
- [Decisão arquitetural: base técnica](docs/decisions/0001-base-tecnica.md)
- [Plano de setup do SDD](docs/plans/2026-10-06-sdd-setup.md)

As próximas decisões serão registradas antes da implementação correspondente.

## Fluxo SDD com agentes

Spec (`product-spec`) → Plano (`tech-planner`) → Revisão (`architecture-review` quando cruza serviços) → Implementação (`backend-dev`/`angular-dev`) → Testes (`test-engineer`) → Validação (`feature-validator`), orquestrado por `sdd-orchestrator`.

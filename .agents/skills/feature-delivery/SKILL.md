---
name: feature-delivery
description: Implement one specified Lista de Compras feature while preserving its hexagonal and microservice boundaries.
---

# Entrega de feature

Use esta skill para implementar uma feature que já possua especificação e critérios de aceite.

Também aplique a skill `coding-style` (comentários moderados, sem narrativa de SPEC no source).

1. Leia `STATUS.md`, `SPEC.md`, `PLAN.md`, o escopo inicial, ADRs relevantes e
   os limites do serviço afetado.
2. Confirme que a tarefa `T-*` está pronta e limite edições aos arquivos
   permitidos no plano.
3. Antes de codificar, confirme os contratos HTTP e de eventos que a feature altera. Documente contratos novos ou modificados.
4. Mantenha regras de negócio em domínio e casos de uso. Framework HTTP, PostgreSQL, RabbitMQ e clientes externos são adapters.
5. Escreva código no estilo `coding-style`: nomes claros; comentários só para
   *porquê* não óbvio (segurança, interop, restrição); didática no handoff.
6. Escreva ou atualize testes proporcionais ao risco da regra e execute a validação relevante.
7. Atualize a documentação somente quando a ambiguidade tiver sido resolvida
   pelo usuário; nunca escolha a regra.
8. Atualize `STATUS.md` e entregue o handoff de
   `docs/process/sdd-workflow.md`.

Pare e peça decisão se faltar uma regra que altere a experiência, o contrato público ou os limites entre serviços.

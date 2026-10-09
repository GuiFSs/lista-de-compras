---
name: feature-delivery
description: Implement one specified Lista de Compras feature while preserving its hexagonal and microservice boundaries.
---

# Entrega de feature

Use esta skill para implementar uma feature que já possua especificação e critérios de aceite.

Também aplique a skill `coding-style` (comentários moderados, sem narrativa de SPEC no source).
Se a tarefa tocar tela ou componente visual, aplique também `ui-design` e leia
`docs/design/GUIA-DESIGN.md` (§4 Composição) **antes** de codificar a UI.

1. Leia `STATUS.md`, `SPEC.md`, `PLAN.md`, o escopo inicial, ADRs relevantes e
   os limites do serviço afetado.
2. Confirme que a tarefa `T-*` está pronta e limite edições aos arquivos
   permitidos no plano.
3. Antes de codificar, confirme os contratos HTTP e de eventos que a feature
   altera. Documente contratos novos ou modificados **na própria T**.
4. Se a T criar/alterar UI: classifique o tipo de tela, aplique a receita do
   guia via skill `ui-design`; não entregue form/conteúdo no void.
5. Mantenha regras de negócio em domínio e casos de uso. Framework HTTP,
   PostgreSQL, RabbitMQ e clientes externos são adapters.
6. Escreva código no estilo `coding-style`: nomes claros; comentários só para
   *porquê* não óbvio (segurança, interop, restrição); didática no handoff.
7. Escreva ou atualize testes proporcionais ao risco da regra e execute a
   validação relevante.
8. Ao tocar contratos, setup/env ou resolver ambiguidade já confirmada pelo
   usuário: atualize na própria T o README, `.env.example` e/ou
   `docs/lessons/` (só se houver aprendizado transferível — não criar arquivo
   vazio). Nunca escolha regra de produto em aberto.
9. Atualize `STATUS.md` e entregue o handoff de
   `docs/process/sdd-workflow.md` (se UI: 2–3 linhas de composição).

Pare e peça decisão se faltar uma regra que altere a experiência, o contrato
público ou os limites entre serviços.

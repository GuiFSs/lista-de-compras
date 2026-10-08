---
name: feature-validation
description: Validate an implemented Lista de Compras feature against its specification's acceptance criteria.
---

# Validação de feature

Use esta skill na fase final do SDD.

1. Leia `STATUS.md`, `SPEC.md`, `PLAN.md` e
   `docs/process/sdd-workflow.md`.
2. Para cada critério de aceite, aponte a evidência (teste que cobre, contrato verificado, comportamento observado).
3. Verifique contratos HTTP/eventos documentados, ADR se aplicável e documentação atualizada.
4. Produza `docs/features/<feature>/VALIDATION.md` a partir do template com
   resultado, evidências, comandos e pendências por `AC-*`.
5. Atualize `STATUS.md` e registre o handoff.
6. Não implemente nem altere código; em caso de ambiguidade, registre e devolva ao orquestrador.

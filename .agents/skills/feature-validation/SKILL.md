---
name: feature-validation
description: Validate an implemented Lista de Compras feature against its specification's acceptance criteria.
---

# Validação de feature

Use esta skill na fase final do SDD.

1. Leia `STATUS.md`, `SPEC.md`, `PLAN.md` e
   `docs/process/sdd-workflow.md` (e ADR 0008).
2. Confirme `Superfície de UI` no plano. Se UI = sim e o handoff do
   `test-engineer` **não** registra corrida Playwright (`npx nx e2e web-e2e` ou
   filtro + resultado), **não aprove**: devolva ao orquestrador.
3. Para cada critério de aceite, aponte a evidência. Em AC observável na UI:
   evidência Playwright (cenário + comando registrado) é **obrigatória**;
   evidência manual ou “arquivo existe” **não** substitui → **reprova**.
4. Verifique contratos HTTP/eventos documentados, ADR se aplicável e
   documentação atualizada.
5. Produza `docs/features/<feature>/VALIDATION.md` a partir do template com
   resultado, evidências (coluna Playwright quando UI), comandos e pendências
   por `AC-*`.
6. Atualize `STATUS.md` e registre o handoff.
7. Não implemente nem altere código; em caso de ambiguidade, registre e devolva
   ao orquestrador.

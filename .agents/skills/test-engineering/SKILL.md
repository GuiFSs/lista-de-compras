---
name: test-engineering
description: Audit and complete Lista de Compras feature tests by mapping acceptance criteria to executable evidence. Use after implementation tasks and before final validation.
---

# Engenharia de testes

1. Leia `STATUS.md`, `SPEC.md`, `PLAN.md` e os handoffs das tarefas. Confirme
   `Superfície de UI` e a matriz AC ↔ E2E do plano (ADR 0008).
2. Construa a matriz `AC-*` → teste existente → lacuna → comando.
3. Priorize unitários de domínio/casos de uso e integração para adapters/
   contratos. Se Superfície de UI = sim: **Playwright é obrigatório** para todo
   AC observável na UI — cubra por **jornadas** em `apps/web-e2e` (não um E2E
   por AC). Se Superfície de UI = não: unitário/integração bastam; não invente
   E2E.
4. Não duplique testes suficientes. Adicione somente a menor cobertura que
   prove riscos e critérios ainda sem evidência.
5. Execute os comandos planejados; nunca declare suíte verde por inferência.
   Existência de arquivo `.spec.ts` **não** conta como evidência.
6. Se UI: rode `npx nx e2e web-e2e` (ou filtro da feature) e registre **comando
   + resultado** no handoff e em `STATUS.md`. Sem corrida registrada, o gate de
   implementação não fecha.
7. Registre comando, resultado e ACs cobertos no handoff e em `STATUS.md`.
8. Se um teste revelar ambiguidade de comportamento ou contrato, pare e devolva
   ao orquestrador; não escolha a regra.

O gate de implementação só fecha quando todos os `AC-*` têm caminho de
validação, a suíte proporcional ao risco está verde e, se UI, a suíte
Playwright da feature está verde com saída de comando registrada.

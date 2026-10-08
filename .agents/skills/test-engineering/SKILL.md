---
name: test-engineering
description: Audit and complete Lista de Compras feature tests by mapping acceptance criteria to executable evidence. Use after implementation tasks and before final validation.
---

# Engenharia de testes

1. Leia `STATUS.md`, `SPEC.md`, `PLAN.md` e os handoffs das tarefas.
2. Construa a matriz `AC-*` → teste existente → lacuna → comando.
3. Priorize unitários de domínio/casos de uso, integração para adapters e
   contratos, e E2E para jornadas críticas.
4. Não duplique testes suficientes. Adicione somente a menor cobertura que
   prove riscos e critérios ainda sem evidência.
5. Execute os comandos planejados; nunca declare suíte verde por inferência.
6. Registre comando, resultado e ACs cobertos no handoff e em `STATUS.md`.
7. Se um teste revelar ambiguidade de comportamento ou contrato, pare e devolva
   ao orquestrador; não escolha a regra.

O gate de implementação só fecha quando todos os `AC-*` têm caminho de
validação e a suíte proporcional ao risco está verde.

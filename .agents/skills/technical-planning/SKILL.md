---
name: technical-planning
description: Produce an approved Lista de Compras PLAN.md with traceable tasks, dependencies, file scopes, tests and expected evidence. Use after a feature SPEC.md is approved.
---

# Planejamento técnico

Use esta skill somente após o gate da spec.

1. Leia `STATUS.md`, `SPEC.md`, `docs/process/sdd-workflow.md`, escopo, design e
   ADRs aplicáveis (incluindo ADR 0008 sobre Playwright).
2. Pare se a spec não estiver aprovada ou tiver decisão bloqueante aberta.
3. Faça perguntas apenas quando a resposta mudar comportamento, contrato,
   ownership ou arquitetura.
4. Produza `docs/features/<feature>/PLAN.md` a partir de
   `docs/features/TEMPLATE-plan.md`.
5. Declare **`Superfície de UI: sim|não`** com justificativa:
   - `sim` se a feature/fix altera `apps/web` ou tem ACs observáveis em
     tela/interação;
   - `não` se for backend-only (API, domínio, migração, contrato sem UI).
6. Se Superfície de UI = sim:
   - preencha a **matriz AC ↔ E2E** (todo AC de UI com ≥1 cenário Playwright;
     jornadas, não um E2E por AC);
   - inclua ao menos uma tarefa `T-*` de E2E em `apps/web-e2e` com evidência
     esperada `npx nx e2e web-e2e` (ou filtro) + resultado verde.
7. Para cada tarefa `T-*`, informe ACs, agente, descrição, arquivos permitidos,
   dependências, comandos de teste e evidência esperada.
8. Marque revisão arquitetural obrigatória quando houver mais de um serviço,
   alteração de ownership, contrato entre serviços ou evento.
9. Planeje execução sequencial por padrão. Só marque paralelismo para tarefas
   independentes e com arquivos disjuntos; limite a duas simultâneas.
10. Atualize `STATUS.md` com o gate e próximo passo.

Não implemente código. O plano só fica `Aprovado` após confirmação explícita do
usuário e, quando aplicável, parecer arquitetural sem bloqueios. Plano com UI
sem matriz AC↔E2E ou sem tarefa Playwright **não** passa no gate do plano.

---
name: technical-planning
description: Produce an approved Lista de Compras PLAN.md with traceable tasks, dependencies, file scopes, tests and expected evidence. Use after a feature SPEC.md is approved.
---

# Planejamento técnico

Use esta skill somente após o gate da spec.

1. Leia `STATUS.md`, `SPEC.md`, `docs/process/sdd-workflow.md`, escopo, design e
   ADRs aplicáveis.
2. Pare se a spec não estiver aprovada ou tiver decisão bloqueante aberta.
3. Faça perguntas apenas quando a resposta mudar comportamento, contrato,
   ownership ou arquitetura.
4. Produza `docs/features/<feature>/PLAN.md` a partir de
   `docs/features/TEMPLATE-plan.md`.
5. Para cada tarefa `T-*`, informe ACs, agente, descrição, arquivos permitidos,
   dependências, comandos de teste e evidência esperada.
6. Marque revisão arquitetural obrigatória quando houver mais de um serviço,
   alteração de ownership, contrato entre serviços ou evento.
7. Planeje execução sequencial por padrão. Só marque paralelismo para tarefas
   independentes e com arquivos disjuntos; limite a duas simultâneas.
8. Atualize `STATUS.md` com o gate e próximo passo.

Não implemente código. O plano só fica `Aprovado` após confirmação explícita do
usuário e, quando aplicável, parecer arquitetural sem bloqueios.

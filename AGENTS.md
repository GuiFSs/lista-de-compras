# Guia de colaboração do projeto

Este repositório é, ao mesmo tempo, um produto utilizável e um ambiente de aprendizado de Angular, microserviços, arquitetura hexagonal, mensageria e IA no desenvolvimento.

## Fonte de verdade

Leia antes de alterar ou especificar uma feature:

- `docs/product/initial-scope.md`
- `docs/design/GUIA-DESIGN.md` — design mobile-first, UX e tokens visuais
- ADRs em `docs/decisions/`
- `docs/process/sdd-workflow.md` — fluxo, gates, DoR/DoD e handoffs
- Lições aplicáveis em `docs/lessons/`
- As skills aplicáveis em `.agents/skills/` (SDD do projeto) e `.opencode/skills/` (oficiais do framework, ex.: `angular-developer`)

Não presuma regras de produto, integrações, dados ou experiência de uso ainda não documentados. Durante a implementação de uma feature, faça perguntas apenas quando a resposta mudar o comportamento, o contrato ou a arquitetura.

## Regras de evolução

- Registre decisões arquiteturais relevantes como ADR em `docs/decisions/` antes ou junto da mudança correspondente.
- Escreva uma especificação e critérios de aceite da feature antes de implementá-la.
- Preserve a arquitetura hexagonal: domínio e casos de uso não dependem de framework, banco, broker ou HTTP.
- Cada serviço é dono exclusivo de seus dados; integração entre serviços ocorre por contratos HTTP ou eventos documentados.
- Nunca versionar credenciais, segredos, tokens nem senhas em texto puro.
- Git: commits pequenos e rastreáveis em branch `feature/<nome>`;
  Conventional Commits com escopo; push, PR e merge só com aprovações
  explícitas e separadas do usuário (skill `git-workflow`).
- Explique decisões e mudanças de modo didático, conectando-as aos objetivos de aprendizado do projeto.

## Ciclo SDD

Cada feature segue: **Spec → Plano → Implementação → Validação**, com
`STATUS.md`, `SPEC.md`, `PLAN.md` e `VALIDATION.md` em
`docs/features/<feature>/`. Usuário aprova spec e plano; o
`feature-validator` aprova tecnicamente a validação; push, PR e merge continuam
sendo decisões do usuário. O processo canônico está em
`docs/process/sdd-workflow.md`.

O `sdd-orchestrator` delega por tarefa do `PLAN.md`, sequencialmente por padrão.
No máximo duas tarefas independentes e com arquivos disjuntos podem rodar em
paralelo.

Após o PR (push aprovado), o `code-reviewer` pode revisar o PR a pedido do usuário: é consultivo, não bloqueia o merge e não edita código. Detalhes em `docs/plans/2026-10-06-sdd-setup.md`.

Agentes (`.opencode/agents/`):

1. `sdd-orchestrator` — coordena fases e gates (agente padrão da sessão).
2. `product-spec` — especificação.
3. `tech-planner` — plano técnico, com perguntas até estar completo.
4. `architecture-review` — revisão ao cruzar serviços.
5. `backend-dev` / `angular-dev` — implementação.
6. `test-engineer` — testes.
7. `feature-validator` — validação final contra os critérios de aceite.
8. `code-reviewer` — revisão consultiva com lentes essenciais
   (`security`, `requirements`, `regression`) e lentes adicionais conforme o
   risco (`tests`, `architecture`, `performance`).

## Papéis de agentes

Use os briefings em `.opencode/agents/` ao delegar trabalho. Cada agente deve
ficar no escopo de arquivos da tarefa, registrar decisões em `PLAN.md`/ADR,
atualizar `STATUS.md`, entregar o handoff padronizado e não implementar
requisitos ainda em aberto.

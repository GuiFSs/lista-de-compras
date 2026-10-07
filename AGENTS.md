# Guia de colaboração do projeto

Este repositório é, ao mesmo tempo, um produto utilizável e um ambiente de aprendizado de Angular, microserviços, arquitetura hexagonal, mensageria e IA no desenvolvimento.

## Fonte de verdade

Leia antes de alterar ou especificar uma feature:

- `docs/product/initial-scope.md`
- `docs/design/GUIA-DESIGN.md` — design mobile-first, UX e tokens visuais
- ADRs em `docs/decisions/`
- As skills aplicáveis em `.agents/skills/` (SDD do projeto) e `.opencode/skills/` (oficiais do framework, ex.: `angular-developer`)

Não presuma regras de produto, integrações, dados ou experiência de uso ainda não documentados. Durante a implementação de uma feature, faça perguntas apenas quando a resposta mudar o comportamento, o contrato ou a arquitetura.

## Regras de evolução

- Registre decisões arquiteturais relevantes como ADR em `docs/decisions/` antes ou junto da mudança correspondente.
- Escreva uma especificação e critérios de aceite da feature antes de implementá-la.
- Preserve a arquitetura hexagonal: domínio e casos de uso não dependem de framework, banco, broker ou HTTP.
- Cada serviço é dono exclusivo de seus dados; integração entre serviços ocorre por contratos HTTP ou eventos documentados.
- Nunca versionar credenciais, segredos, tokens nem senhas em texto puro.
- Git: um commit por gate do SDD, em branch `feature/<nome>`; Conventional Commits com escopo; push só com aprovação do usuário (skill `git-workflow`).
- Explique decisões e mudanças de modo didático, conectando-as aos objetivos de aprendizado do projeto.

## Ciclo SDD

Cada feature segue: **Spec → Plano → Implementação → Validação**, sempre com spec em `docs/features/<feature>/SPEC.md` e plano em `PLAN.md`. O gate entre fases é a aprovação do usuário ou do validador.

Delegação refinada: o `sdd-orchestrator` delega **por tarefa** do `PLAN.md`, em paralelo (subagentes em background) quando as tarefas são independentes, e em sequência quando tocam os mesmos arquivos. Detalhes em `docs/plans/2026-10-06-sdd-setup.md`.

Após o PR (push aprovado), o `code-reviewer` pode revisar o PR a pedido do usuário: é consultivo, não bloqueia o merge e não edita código. Detalhes em `docs/plans/2026-10-06-sdd-setup.md`.

Agentes (`.opencode/agents/`):

1. `sdd-orchestrator` — coordena fases e gates (agente padrão da sessão).
2. `product-spec` — especificação.
3. `tech-planner` — plano técnico, com perguntas até estar completo.
4. `architecture-review` — revisão ao cruzar serviços.
5. `backend-dev` / `angular-dev` — implementação.
6. `test-engineer` — testes.
7. `feature-validator` — validação final contra os critérios de aceite.
8. `code-reviewer` — revisão de PR (consultiva), com 6 sub-agents por lente: `reviewer-security`, `reviewer-requirements`, `reviewer-tests`, `reviewer-architecture`, `reviewer-regression` e `reviewer-performance`.

## Papéis de agentes

Use os briefings em `.opencode/agents/` ao delegar trabalho. Cada agente deve ficar no seu escopo, registrar as decisões que tomar e não implementar requisitos ainda em aberto.

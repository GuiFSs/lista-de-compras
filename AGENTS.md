# Guia de colaboração do projeto

Este repositório é, ao mesmo tempo, um produto utilizável e um ambiente de aprendizado de Angular, microserviços, arquitetura hexagonal, mensageria e IA no desenvolvimento.

## Fonte de verdade

Leia antes de alterar ou especificar uma feature:

- `docs/product/initial-scope.md`
- `docs/design/GUIA-DESIGN.md` — design mobile-first, UX e tokens visuais
- ADRs em `docs/decisions/`
- `docs/process/sdd-workflow.md` — fluxo, gates, DoR/DoD e handoffs
- Lições aplicáveis em `docs/lessons/`
- As skills aplicáveis em `.agents/skills/` (SDD do projeto, incl. `coding-style`) e `.opencode/skills/` (oficiais do framework, ex.: `angular-developer`)

Não presuma regras de produto, integrações, dados ou experiência de uso ainda não documentados. Durante a implementação de uma feature, faça perguntas apenas quando a resposta mudar o comportamento, o contrato ou a arquitetura.

## Regras de evolução

- Registre decisões arquiteturais relevantes como ADR em `docs/decisions/` antes ou junto da mudança correspondente.
- Escreva uma especificação e critérios de aceite da feature antes de implementá-la.
- Preserve a arquitetura hexagonal: domínio e casos de uso não dependem de framework, banco, broker ou HTTP.
- Cada serviço é dono exclusivo de seus dados; integração entre serviços ocorre por contratos HTTP ou eventos documentados.
- Nunca versionar credenciais, segredos, tokens nem senhas em texto puro.
- Git: commits por `T-*` em branch `feature/<nome>` (orquestrador, Conventional
  Commits); push, PR e merge só com aprovações explícitas e separadas do
  usuário (skill `git-workflow`).
- Testes: todas as falhas de teste DEVEM ser resolvidas antes de avançar para a próxima fase do SDD. Se uma falha não puder ser resolvida, pare e pergunte ao usuário como prosseguir — nunca avance para a próxima etapa com falhas da etapa atual. Exceção: testes que forem realmente difíceis de mockar/setar podem ser removidos, mas apenas com aprovação explícita do usuário.
- Nunca usar o tipo `any` do TypeScript no código (front-end e back-end, app e libs, produção e testes). Em vez dele, use `unknown` + *narrowing* (type guards), genéricos com `extends` ou tipos de domínio. A regra é imposta pelo lint: `@typescript-eslint/no-explicit-any: error` em `eslint.config.mjs` (raiz), então `npm run lint` falha se alguém reintroduzir um `any` — inclusive em arquivos de teste. Exceção só em casos raros, com aprovação explícita do usuário e com `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + justificativa escrita ao lado; sem isso, o gate de implementação não passa.
- Explique decisões e mudanças de modo didático no **chat, handoff, ADR ou `docs/lessons/`**, conectando-as aos objetivos de aprendizado. No **código**, siga a skill `coding-style`: comentários moderados que ajudam a ler o *porquê* não óbvio — sem prefácios que recontam SPEC/PLAN nem narrativa da linha seguinte.

## Ciclo SDD

Cada feature (e bugfix) segue: **Spec → Plano → Implementação → Validação**,
com `STATUS.md`, `SPEC.md`, `PLAN.md` e `VALIDATION.md` em
`docs/features/<feature>/`. Spec e plano só fecham com a frase canônica
`Aprovado pelo usuário em YYYY-MM-DD`. O `feature-validator` aprova a
validação; push, PR e merge continuam decisões do usuário. Processo canônico:
`docs/process/sdd-workflow.md` (retomada via STATUS, retrabalho, commit por T,
checklists de docs/design).

O `sdd-orchestrator` lê e, se preciso, corrige só o `STATUS.md`; delega por
tarefa do `PLAN.md` (sequencial por padrão; no máximo duas em paralelo se
independentes e com arquivos disjuntos); após cada T concluída com testes
verdes, comita sem nova aprovação (skill `git-workflow`).

Features/fixes com superfície de UI exigem evidência Playwright em
`apps/web-e2e` (comando + resultado; ADR 0008); backend-only fecha com
unitário/integração.

Após o PR (push aprovado), o `code-reviewer` pode revisar a pedido: consultivo,
parecer via `gh pr comment`, sem editar código. Detalhes em
`docs/plans/2026-10-06-sdd-setup.md`.

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

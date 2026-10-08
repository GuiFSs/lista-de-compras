# Plano técnico — <nome da feature>

**Status:** Rascunho | Em revisão | Aprovado
**Spec:** `docs/features/<feature>/SPEC.md`
**Última atualização:** AAAA-MM-DD
**Aprovação do usuário:** pendente | aprovada em AAAA-MM-DD

## Contexto

<Resumo da spec e da motivação.>

## Superfície de UI

- **Superfície de UI:** sim | não
- **Justificativa:** <mudanças em `apps/web` e/ou ACs observáveis em tela; ou
  backend-only sem UI — ADR 0008>

## Abordagem

<Passos principais de implementação.>

## Contratos

- HTTP: <método, path, request, response, erros e arquivo em `libs/contracts`; ou "nenhum">
- Eventos: <nome, versão, produtor, consumidores, payload, entrega e idempotência; ou "nenhum">

## Dados e ownership

- ...

## Revisão arquitetural

- Obrigatória: <sim/não e motivo>
- Parecer: `docs/features/<feature>/ARCHITECTURE-REVIEW.md` | não aplicável
- Estado: pendente | aprovada | aprovada com ressalvas

## Estratégia de testes

- Unitários: ...
- Integração/contrato: ...
- E2E Playwright (obrigatório se Superfície de UI = sim): cenários em
  `apps/web-e2e`, comando `npx nx e2e web-e2e` (ou filtro); se não-UI: N/A

### Matriz AC ↔ E2E (obrigatória se Superfície de UI = sim)

| AC | Observável na UI? | Cenário Playwright (arquivo / título) | Evidência não-E2E (se AC só backend) |
| --- | --- | --- | --- |
| AC-01 | sim / não | `apps/web-e2e/src/...` — "..." | unit/integração / — |

Todo AC com comportamento observável na UI deve ter ≥1 cenário E2E. Não criar
um teste Playwright por AC; preferir jornadas que cubram vários ACs.

## Riscos e trade-offs

- ...

## Tarefas

Cada tarefa deve ter escopo executável por um único agente. Só podem rodar em
paralelo tarefas sem dependência e com arquivos permitidos disjuntos.

Se Superfície de UI = sim, inclua ao menos uma tarefa `T-*` de E2E Playwright
(`test-engineer` ou `angular-dev`) com arquivos em `apps/web-e2e` e evidência
esperada = comando + resultado verde.

| ID | ACs | Agente | Descrição | Arquivos permitidos | Depende de | Testes/comandos | Evidência esperada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | AC-01 | backend-dev | ... | `apps/...` | — | `npx nx test ...` | teste X verde |
| T-XX | AC-.. | test-engineer | E2E Playwright da jornada | `apps/web-e2e/**` | T-.. | `npx nx e2e web-e2e` | suíte verde + matriz coberta |

## Decisões

- <ADR relacionada ou "nenhuma">

## Gate do plano

- [ ] Todas as tarefas referenciam ao menos um `AC-*` ou justificam trabalho técnico.
- [ ] `Superfície de UI: sim|não` está declarada com justificativa.
- [ ] Se UI = sim: matriz AC ↔ E2E completa e tarefa Playwright com comando `npx nx e2e web-e2e` (ou filtro).
- [ ] Dependências, arquivos permitidos, testes e evidências estão explícitos.
- [ ] Contratos e ownership estão definidos.
- [ ] Revisão arquitetural foi concluída quando obrigatória.
- [ ] Não há decisão de comportamento, contrato ou arquitetura em aberto.
- [ ] Usuário aprovou explicitamente o plano.

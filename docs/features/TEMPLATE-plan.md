# Plano técnico — <nome da feature>

**Status:** Rascunho | Em revisão | Aprovado
**Spec:** `docs/features/<feature>/SPEC.md`
**Última atualização:** AAAA-MM-DD
**Aprovação do usuário:** pendente | aprovada em AAAA-MM-DD

## Contexto

<Resumo da spec e da motivação.>

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
- E2E/manual: ...

## Riscos e trade-offs

- ...

## Tarefas

Cada tarefa deve ter escopo executável por um único agente. Só podem rodar em
paralelo tarefas sem dependência e com arquivos permitidos disjuntos.

| ID | ACs | Agente | Descrição | Arquivos permitidos | Depende de | Testes/comandos | Evidência esperada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | AC-01 | backend-dev | ... | `apps/...` | — | `npx nx test ...` | teste X verde |

## Decisões

- <ADR relacionada ou "nenhuma">

## Gate do plano

- [ ] Todas as tarefas referenciam ao menos um `AC-*` ou justificam trabalho técnico.
- [ ] Dependências, arquivos permitidos, testes e evidências estão explícitos.
- [ ] Contratos e ownership estão definidos.
- [ ] Revisão arquitetural foi concluída quando obrigatória.
- [ ] Não há decisão de comportamento, contrato ou arquitetura em aberto.
- [ ] Usuário aprovou explicitamente o plano.

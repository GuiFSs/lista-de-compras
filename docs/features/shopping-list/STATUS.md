# Estado da feature — Lista de compras

**Fase atual:** Implementação
**Gate atual:** plano **aprovado** — `PLAN.md` com a frase canônica
`Aprovado pelo usuário em 2026-10-13` (gate do plano fechado)
**Última atualização:** 2026-10-13
**Próxima ação:** concluir a Onda 2 — **T-03** (domínio,
`apps/shopping-list-service/src/domain/**`) está em andamento; T-07 (env/docs) já
concluída. Em seguida, Onda 3 — **T-04** (dep T-03) ∥ **T-08** (`apps/web/src/app/ui`),
comitando por `T-*` após cada tarefa com testes verdes.

## Artefatos

- Spec: `docs/features/shopping-list/SPEC.md` — **aprovada em 2026-10-13** (26 ACs;
  CD-01–CD-13; nenhuma decisão aberta)
- Plano: `docs/features/shopping-list/PLAN.md` — **aprovado em 2026-10-13**
  (17 tarefas `T-01…T-17`, matriz AC ↔ E2E com 26 ACs, `Superfície de UI: sim`,
  contrato HTTP completo, `Eventos: nenhum`; status `Aprovado`)
- ADR: `docs/decisions/0009-excecao-temporaria-ao-gateway-shopping-list-service.md`
  — registrada (exceção temporária à ADR 0001 para o `shopping-list-service`);
  ADR 0006 §1 e Consequências com nota apontando para a 0009
- Revisão arquitetural: **não aplicável** nesta rodada (um único serviço backend, sem
  contrato entre serviços, sem evento, sem mudança de ownership); revisão opcional e
  não bloqueante registrada no `PLAN.md` (limitada à ADR 0009 e ao contrato
  PWA↔serviço)
- Validação: pendente (`VALIDATION.md` só é criado na fase de Validação)

## Escopo desta rodada (confirmado com o usuário)

- **Somente a lista de compras ativa**: obter a lista, adicionar/editar/excluir/
  restaurar item, marcar/desmarcar item como comprado e concluir a compra.
- **Fora desta rodada**: histórico de preços, menor preço e comparação — virão em
  feature(s) futura(s) (`price-history` etc.). A conclusão da compra **não** publica
  evento, **não** grava registro e **não** expõe rota de histórico (RN-16/AC-21); o
  envio ao histórico por evento (previsto na ADR 0001) é contrato da **feature de
  histórico**, fora desta rodada, sem ADR criada aqui.

## Execução

- Tarefa em andamento: T-03 (domínio, `apps/shopping-list-service/src/domain/**`)
- Tarefas concluídas: T-01, T-02, T-07
- Critérios comprovados: nenhum AC fechado ainda (T-01/T-02 são arquitetura/base de
  contrato; habilitam AC-04–AC-24)
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- **Nenhum bloqueio.** O gate do plano está fechado (frase canônica registrada em
  2026-10-13); a implementação pode começar pela Onda 1.
- **Encaminhamento (não bloqueio):** o contrato do **evento de conclusão de compra**
  (previsto na ADR 0001) fica para a **feature de histórico** — fora desta rodada.

## Último handoff

- Agente: `backend-dev` (T-07, mais recente) e `backend-dev` (T-01/T-02)
- Tarefa: T-07 — env e docs (`.env.example`/`README.md`) (mais recente)
- Estado: concluída (T-07)
- Arquivos alterados: `.env.example` (`SHOPPING_LIST_CORS_ORIGINS` comentada,
  default `http://localhost:4200`), `README.md` (base URL local/ADR 0009, Docker
  obrigatório e comandos `db:generate`/`db:migrate`) — T-07
- ACs cobertos: nenhum (T-07 é infra/doc, sem AC de produto)
- Testes executados: revisão de doc (`git --no-pager diff -- .env.example README.md`)
  — sem suíte aplicável
- Decisões registradas: nenhuma nova (T-07 documenta ADR 0009 §1–§4 e ADR 0007)
- Commits: `a0e9941` (T-07)
- Pendências: os targets `db:generate`/`db:migrate` ainda não existem em
  `project.json` — são criados por T-04 (arquivos permitidos já incluem o
  `project.json`); o README documenta os nomes exatos do `PLAN.md`
- Próximo passo recomendado: concluir a Onda 2 (T-03 domínio, em andamento) e
  então a Onda 3 — T-04 (dep T-03) ∥ T-08 (`apps/web/src/app/ui`)

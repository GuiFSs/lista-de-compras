# Estado da feature — Lista de compras

**Fase atual:** Implementação
**Gate atual:** plano **aprovado** — `PLAN.md` com a frase canônica
`Aprovado pelo usuário em 2026-10-13` (gate do plano fechado)
**Última atualização:** 2026-10-13
**Próxima ação:** Onda 3 em curso — **T-04** (persistência) concluída; **T-08**
(primitivas de UI, `apps/web/src/app/ui`) em andamento. Em seguida, Onda 4 —
**T-05** (casos de uso; dep T-03/T-04) ∥ **T-09** (shell autenticado; dep T-08),
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

- Tarefa em andamento: T-08 (primitivas de UI, `apps/web/src/app/ui/**`)
- Tarefas concluídas: T-01, T-02, T-03, T-04, T-07
- Critérios comprovados: nenhum AC fechado ainda (T-01/T-02/T-03/T-07 são
  arquitetura/base/domínio; T-04 fecha o suporte de persistência de AC-09/AC-11/AC-24)
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- **Nenhum bloqueio.** O gate do plano está fechado (frase canônica registrada em
  2026-10-13); a implementação pode começar pela Onda 1.
- **Encaminhamento (não bloqueio):** o contrato do **evento de conclusão de compra**
  (previsto na ADR 0001) fica para a **feature de histórico** — fora desta rodada.

## Último handoff

- Agente: `backend-dev` (T-04, mais recente)
- Tarefa: T-04 — persistência Drizzle (`apps/shopping-list-service`)
- Estado: concluída
- Arquivos alterados: `infrastructure/persistence/drizzle/schema/index.ts`
  (tabela `shopping_list_items` + índice único parcial), `client.ts`
  (`ShoppingListDb`), `repository/{item-row.mapper.ts,shopping-list.repository.ts}`
  + spec do mapper, `shopping-list-repository.module.ts`, barrels;
  `application/ports/shopping-list-repository.port.ts` (+ `index.ts`);
  `project.json` (targets `db:generate`/`db:migrate`); migração
  `0000_superb_red_shift.sql` + `meta/`
- ACs cobertos: AC-09 (índice único parcial provado no banco), AC-11 (suporte a
  `removed_at`/restore via `findById`/`update`), AC-24 (persistência real)
- Testes executados: `npx nx test shopping-list-service` (54 verdes, 6 arquivos);
  `npx nx lint shopping-list-service` e `npx nx build shopping-list-service`
  verdes; `db:generate` → SQL com
  `CREATE UNIQUE INDEX ... ON shopping_list_items (name_normalized) WHERE removed_at is null`;
  `db:migrate` aplicado no banco `shopping_list` (Docker local) — duplicata
  barrada por índice e nome liberado após `removed_at` (verificado em transação)
- Decisões registradas: sem ADR nova; `numeric` em `mode: 'number'`; port só de
  persistência (sem regra de negócio — normalização/colisão/soma/ordenação/
  conclusão seguem no domínio de T-03); `findById` inclui removidos p/ Desfazer
- Commits: `9316850` (T-04)
- Pendências: nenhuma bloqueante. Consumidores: T-05 (casos de uso com repositório
  fake), T-06 (borda HTTP)
- Próximo passo recomendado: Onda 4 — T-05 (dep T-03/T-04) ∥ T-09 (dep T-08)

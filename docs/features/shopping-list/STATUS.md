# Estado da feature — Lista de compras

**Fase atual:** Implementação
**Gate atual:** plano **aprovado** — `PLAN.md` com a frase canônica
`Aprovado pelo usuário em 2026-10-13` (gate do plano fechado)
**Última atualização:** 2026-10-13
**Próxima ação:** Onda 3 em curso — T-04 e T-05 concluídas; **T-08** (primitivas de
UI) em andamento. Ao concluir T-08: **T-09** (shell autenticado; dep T-08) e, em
paralelo, **T-06** (borda HTTP; deps T-02/T-04/T-05 já concluídas — projeto
distinto, arquivos disjuntos). Depois **T-10** (camada de dados da PWA).

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
- Tarefas concluídas: T-01, T-02, T-03, T-04, T-05, T-07
- Critérios comprovados: nenhum AC fechado ainda (a prova integrada/final é T-06,
  T-15 e T-17); T-03/T-04/T-05 entregam as regras do domínio, a persistência e os
  casos de uso
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- **Nenhum bloqueio.** O gate do plano está fechado (frase canônica registrada em
  2026-10-13); a implementação pode começar pela Onda 1.
- **Encaminhamento (não bloqueio):** o contrato do **evento de conclusão de compra**
  (previsto na ADR 0001) fica para a **feature de histórico** — fora desta rodada.

## Último handoff

- Agente: `backend-dev` (T-05, mais recente)
- Tarefa: T-05 — casos de uso (`apps/shopping-list-service/src/application/use-cases/**`)
- Estado: concluída
- Arquivos alterados: use-cases (obter, criar, editar, excluir, restaurar, marcar,
  desmarcar, concluir) + `shopping-list-result.ts` (erros de negócio tipados) +
  `load-active-items.ts` + fake/fixtures em `use-cases/testing/` + specs (6 arquivos);
  `application/index.ts` e `use-cases/index.ts` (barrels)
- ACs cobertos: AC-07, AC-08/CD-13, AC-09, AC-11, AC-12, AC-16, AC-19, AC-20, AC-21,
  AC-24 (camada de aplicação; prova integrada fica em T-15)
- Testes executados: `npx nx test shopping-list-service` (82 verdes, 12 arquivos;
  28 de casos de uso); `npx nx lint shopping-list-service` verde;
  `npx nx typecheck shopping-list-service` e `build` verdes
- Decisões registradas: erros de negócio tipados sem HTTP/mensagem PT
  (`validation`→400, `not-found`→404, `duplicate-item-name`/`name-conflict`→409);
  toda operação devolve a lista ativa ordenada (RN-19); criação soma sem segundo
  item; edição em conflito não soma nem aplica (item inalterado); `id` via
  `randomUUID` e tempo via `new Date()` (sem port de relógio/id nesta rodada)
- Commits: `428d807` (T-05)
- Pendências: nenhuma. Consumidor direto: T-06 (borda HTTP, `useFactory` no módulo
  Nest, mapeando os `code` de `ShoppingListError` para 400/404/409)
- Próximo passo recomendado: T-09 (dep T-08) ∥ T-06 (deps concluídas)

# Estado da feature — Lista de compras

**Fase atual:** Implementação
**Gate atual:** plano **aprovado** — `PLAN.md` com a frase canônica
`Aprovado pelo usuário em 2026-10-13` (gate do plano fechado)
**Última atualização:** 2026-10-13
**Próxima ação:** Onda 3 — delegar **T-04** (persistência Drizzle + índice único
parcial + port/adaptador; dep T-03) ∥ **T-08** (primitivas de UI,
`apps/web/src/app/ui`), comitando por `T-*` após cada tarefa com testes verdes.
(Ondas 1–2 concluídas: T-01, T-02, T-03, T-07.)

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

- Tarefa em andamento: nenhuma (T-04 ∥ T-08 a delegar na Onda 3)
- Tarefas concluídas: T-01, T-02, T-03, T-07
- Critérios comprovados: nenhum AC fechado ainda (T-01/T-02/T-03/T-07 são
  arquitetura/base/domínio; habilitam AC-05–AC-21)
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- **Nenhum bloqueio.** O gate do plano está fechado (frase canônica registrada em
  2026-10-13); a implementação pode começar pela Onda 1.
- **Encaminhamento (não bloqueio):** o contrato do **evento de conclusão de compra**
  (previsto na ADR 0001) fica para a **feature de histórico** — fora desta rodada.

## Último handoff

- Agente: `backend-dev` (T-03, mais recente)
- Tarefa: T-03 — domínio puro (`apps/shopping-list-service/src/domain/**`)
- Estado: concluída
- Arquivos alterados: `domain/item-name.ts`, `domain/item-unit.ts`,
  `domain/item-validation.ts`, `domain/shopping-list-item.ts` (novos),
  `domain/index.ts` (barrel) e 3 specs; **mais** `tsconfig.app.json` e
  `tsconfig.spec.json` do serviço (referência de projeto a `libs/contracts`)
- ACs cobertos: AC-05, AC-06, AC-07, AC-08/CD-13, AC-09 (predicado de unicidade),
  AC-11 (removedAt), AC-12 (comprado segue na lista), AC-16, AC-18, AC-20, AC-21
- Testes executados: `npx nx test shopping-list-service` (48 verdes; 39 de
  domínio); `npx nx build shopping-list-service` (sucesso);
  `npx nx lint shopping-list-service` (sucesso); `npx nx sync:check` (up to date)
- Decisões registradas: nenhuma nova de produto/contrato — T-03 consome o contrato
  de T-02 (`ITEM_UNITS`/`ItemUnit`) sem duplicar a lista; erros de validação são
  códigos de domínio; a tradução PT/HTTP fica na borda (T-06); CD-13 exposta via
  união discriminada de `applyItemChanges`
- **Nota de escopo (correção autorizada):** T-03 teve o escopo **ampliado** para os
  dois `tsconfig` do serviço — o import de `@lista/contracts` no domínio exige a
  referência de projeto em `tsconfig.app.json`/`tsconfig.spec.json` (sincronização
  do Nx; mesma convenção do `auth-service`), sem a qual `nx build`/`nx sync:check`
  falhavam. Config de workspace, sem código de produto novo
- Commits: `6b97a1e` (T-03)
- Pendências: nenhuma. Consumidores do domínio: T-04 (adapter), T-05 (casos de uso),
  T-06 (borda HTTP)
- Próximo passo recomendado: Onda 3 — T-04 (dep T-03) ∥ T-08 (`apps/web/src/app/ui`)

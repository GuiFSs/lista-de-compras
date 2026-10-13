# Estado da feature — Lista de compras

**Fase atual:** Implementação
**Gate atual:** plano **aprovado** — `PLAN.md` com a frase canônica
`Aprovado pelo usuário em 2026-10-13` (gate do plano fechado)
**Última atualização:** 2026-10-13
**Próxima ação:** Onda 6 — delegar **T-11** (tela Lista; dep T-08/T-09/T-10) ∥
**T-15** (auditoria de testes do backend; dep T-06) — projetos disjuntos
(`web` × `shopping-list-service`). Depois **T-12** → T-13 → T-14 (sequenciais)
→ T-16 → T-17.

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

- Tarefa em andamento: **T-15** (auditoria de testes do backend; dep T-06) — em
  execução, em paralelo com T-11 (projetos/arquivos disjuntos)
- Tarefas concluídas: T-01, T-02, T-03, T-04, T-05, T-06, T-07, T-08, T-09, **T-10**
- Critérios comprovados: backend completo (T-01–T-07, 144 testes) e camada de
  dados da PWA (T-10 — API tipada + store em signals; suíte `web` com 96 testes
  verdes); a prova integrada com Postgres (AC-09/AC-21/AC-24) e a de UI
  (AC-01–AC-26) ainda dependem de T-15/T-16/T-17
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- **Nenhum bloqueio.** O gate do plano está fechado (frase canônica registrada em
  2026-10-13); a implementação pode começar pela Onda 1.
- **Encaminhamento (não bloqueio):** o contrato do **evento de conclusão de compra**
  (previsto na ADR 0001) fica para a **feature de histórico** — fora desta rodada.
- **Nota de escopo (resolvida):** para T-06 honrar o contrato **201 (criado) / 200
  (soma aplicada)** do `POST /items`, o orquestrador autorizou uma alteração
  **aditiva** em `create-shopping-list-item.use-case.ts`/`shopping-list-result.ts`
  (`created?: boolean`), agora implementada e com testes verdes (ver `Último handoff`).

## Último handoff

- Agente: `angular-dev` (T-10, mais recente concluída; **T-15 em execução** no
  `test-engineer`)
- Tarefa: T-10 — camada de dados da PWA
  (`apps/web/src/app/features/shopping-list/data/**`,
  `apps/web/src/app/features/shopping-list/state/**`,
  `apps/web/src/app/core/shopping-list/**`)
- Estado: concluída
- Arquivos alterados: `ShoppingListApiService` (8 rotas tipadas por
  `@lista/contracts`), `shopping-list-config.ts`
  (`SHOPPING_LIST_API_BASE_URL`, default `http://localhost:3000` — ADR 0009),
  `api-error.ts`, store em signals (`loading/loaded/error`, single-flight por
  operação, releitura silenciosa sem fantasma, janela de undo de 4s, 409
  distinguível: criação = fluxo × edição = conflito) + specs
- ACs cobertos: AC-02, AC-07, AC-08, AC-11, AC-19, AC-20, AC-22, AC-23, AC-24, AC-26
- Testes executados: `npx nx test web` (96 verdes, 14 arquivos); `npx nx lint` e
  `npx nx build` verdes
- Decisões registradas: a ordem/verdade vem do serviço (RN-19); nada da lista em
  `localStorage` (AC-24); base URL por `InjectionToken` (ADR 0009)
- Observações (não-AC, registradas): follow-ups opcionais do backend seguem em
  aberto (doc de `libs/contracts/README.md` poderia citar `Corpo da requisição
  inválido`; corpo malformado sem token responde 400 canônico, como no auth-service)
- Commits: `5c5c67f` (T-10)
- Pendências: nenhuma bloqueante. **Backend completo** (T-01–T-07) e **camada de
  dados da PWA completa** (T-10)
- Próximo passo recomendado: Onda 6 — T-11 (dep T-08/T-09/T-10) ∥ T-15
  (dep T-06, em execução)

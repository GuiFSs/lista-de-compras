# Estado da feature — Lista de compras

**Fase atual:** Implementação
**Gate atual:** plano **aprovado** — `PLAN.md` com a frase canônica
`Aprovado pelo usuário em 2026-10-13` (gate do plano fechado)
**Última atualização:** 2026-10-13
**Próxima ação:** Onda 8 — **T-13** (sheet de marcar/desmarcar comprado; dep
T-12) **em andamento** ∥ **T-18** (corretiva autorizada pelo usuário: corrida de
duplicidade no `POST /items` + nit do README de contratos) **em andamento**.
Depois **T-14** → **T-16** → **T-17**.

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

- Tarefa em andamento: **T-13** (sheet de marcar/desmarcar; `angular-dev`) ∥
  **T-18** (corretiva de backend; `backend-dev`) — arquivos disjuntos
- Tarefas concluídas: T-01 … T-12, T-15 (faltam T-13, T-14, T-16, T-17 + a
  corretiva T-18)
- Critérios comprovados: backend completo (T-01–T-07) + **prova com Postgres
  real** (T-15 — 156 testes, 14 arquivos); camada de dados (T-10), tela Lista
  (T-11) e sheet de item (T-12) da PWA — suíte `web` com **128 testes**, 17
  arquivos; E2E de auth sem regressão (`npx nx e2e web-e2e`, 6 verdes)
- ACs com evidência executável até aqui: AC-01–AC-13, AC-17–AC-22, AC-24–AC-26
  (unit/integração); **AC-14/AC-15/AC-16** dependem de T-13; a prova
  **Playwright** da matriz (AC-01–AC-26 na UI) fica em T-17
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- **Nenhum bloqueio** para T-12 (Onda 7). O gate do plano segue fechado.
- **Sync do workspace (resolvido):** T-10 passou `apps/web` a importar
  `@lista/contracts` sem registrar a *project reference*, deixando o workspace fora
  de sync (`nx sync:check`/`nx build` (workspace)/`nx e2e` falhavam antes de
  executar). O orquestrador rodou `nx sync` e commitou o ajuste de
  `apps/web/tsconfig.app.json` em `f5a68a4` (`npx nx sync:check` verde). **Gate de
  UI (T-17) desbloqueado.**
- **Decisão resolvida pelo usuário (2026-10-13):** em POSTs **concorrentes** com o
  mesmo nome, o `CreateShoppingListItemUseCase` faz *read-then-write* (TOCTOU) e o
  erro do índice único subia como **500 em vez de 409**. O usuário autorizou a
  correção — **T-18** (backend, em andamento): tratar a violação `23505` de forma
  *bounded* (reler e reaplicar a decisão de duplicidade; soma quando
  `duplicateResolution: 'sum-planned-quantity'`, senão **409** canônico), sem 500 e
  sem duplicata. A spec é silente sobre a corrida; a correção só alinha a corrida à
  regra de duplicidade **já documentada** (nenhum AC novo).
- **Encaminhamento (não bloqueio):** o contrato do **evento de conclusão de compra**
  (previsto na ADR 0001) fica para a **feature de histórico** — fora desta rodada.
- **Pré-requisito de teste (novo):** a suíte `shopping-list-service` agora **exige
  Docker no ar + `db:migrate`** (a integração de T-15 usa PostgreSQL real):
  `npm run docker:up` + `npx nx run shopping-list-service:db:migrate`.
- **Nit de doc (aprovado em 2026-10-13, em T-18):** `libs/contracts/README.md`
  passa a citar a mensagem canônica `Corpo da requisição inválido` (JSON malformado).
- **Nota de escopo (resolvida):** para T-06 honrar o contrato **201 (criado) / 200
  (soma aplicada)** do `POST /items`, o orquestrador autorizou uma alteração
  **aditiva** em `create-shopping-list-item.use-case.ts`/`shopping-list-result.ts`
  (`created?: boolean`), implementada e com testes verdes.

## Últimos handoffs

### T-12 — sheet de item adicionar/editar + duplicidade (`angular-dev`)

- Estado: concluída
- Arquivos alterados:
  `apps/web/src/app/features/shopping-list/item-form-sheet.{ts,html,scss,spec.ts}`
  (novo, 13 testes); `shopping-list-page.{ts,html,spec.ts}` (wiring: estados do
  form, `onOpenActions(item)`, `onFormSaved`, effect `mutationError` → toast)
- ACs cobertos: AC-04, AC-05, AC-06, AC-07, AC-08, AC-10, AC-23, AC-25, AC-26
- Testes executados: `npx nx test web` (**128 verdes**, 17 arquivos); `npx nx lint
  web` e `npx nx build web` verdes; `npx nx e2e web-e2e` (6 verdes)
- Decisões registradas: unidade via `[selected]` por `<option>` +
  `ngAfterViewInit` forçando `selectedIndex = -1` no estado "sem unidade" (o
  binding de `<select>` roda antes do `@for` criar as opções); a pergunta de soma
  empilha como 2º `app-bottom-sheet [closeOnBackdrop]="false"` sobre o form aberto
  (AC-07 exige o form visível); edição envia os opcionais com `null = limpar`
- Observações: o *host* de toasts é T-14 (aqui só se chama o service);
  `onOpenActions(item)` abre o form de edição como *seam* até o sheet de ações (T-14)
- Commit: `145ef02`

### T-15 — auditoria de testes do backend (`test-engineer`)

- Estado: concluída
- Arquivos alterados:
  `apps/shopping-list-service/src/integration/shopping-list-postgres.spec.ts`
  (novo — 12 testes com o `AppModule` real: Drizzle + Postgres, truncando
  `shopping_list_items` entre casos); `apps/shopping-list-service/vitest.config.mts`
  (remove `passWithNoTests: true`)
- ACs cobertos: AC-09, AC-21, AC-24 (prova com banco real) + contrato de
  AC-04–AC-13, AC-17–AC-20 (integrado à suíte `inject` já existente)
- Testes executados: `npx nx test shopping-list-service` (**156 verdes**, 14
  arquivos; pré-requisito `npm run docker:up` + `db:migrate`; banco deixado com 0
  linhas); `npx nx lint shopping-list-service` verde
- Decisões registradas: ADR 0001 (dono exclusivo dos dados — a suíte usa o banco
  real `shopping_list`); AC-24 provado com 2ª instância `NestFastifyApplication`
  (novo Pool); AC-21 provado por **ausência estrutural** (schema sem tabela de
  compra, sem rota `/history`, mensageria esqueleto) + hard delete físico
- Observações: os testes por `inject` usam repositório em memória; a **prova de
  banco real** veio só nesta tarefa (era a lacuna auditada)
- Commit: `940f291`

### T-11 — tela Lista (`angular-dev`)

- Estado: concluída
- Arquivos alterados:
  `apps/web/src/app/features/shopping-list/shopping-list-page.{ts,html,scss,spec.ts}`
  (novo), `apps/web/src/app/features/shopping-list/item-row.{ts,html,scss,spec.ts}`
  (novo), `apps/web/src/app/app.routes.ts` (`''` → `ShoppingListPage`), remoção de
  `apps/web/src/app/features/home/**`
- ACs cobertos: AC-01, AC-02, AC-03, AC-12, AC-18, AC-22, AC-24, AC-25
- Testes executados: `npx nx test web` (**112 verdes**, 16 arquivos); `npx nx lint
  web` e `npx nx build web` verdes; `npx nx e2e web-e2e` (6 verdes — regressão de auth)
- Decisões registradas: ordem/verdade vêm do serviço (a tela não reordena — RN-19);
  `ItemRow` é conteúdo puro com outputs `togglePurchased`/`openActions` para
  T-13/T-14; o conteúdo **não** readiciona o espaçamento da bottom nav (o shell já
  reserva via `.content-with-bottom-nav`)
- Observações: os sheets (T-12/T-13/T-14) ainda não existem — as ações ficam com
  *seams* no-op; o host de toasts é T-14
- Commit: `7018081`

### Correção de infraestrutura (`sdd-orchestrator`)

- `apps/web/tsconfig.app.json` — project reference de `libs/contracts` (via
  `nx sync`); desbloqueia `nx sync:check`/`nx build`/`nx e2e` (ver "Pendências").
  Commit `f5a68a4`.

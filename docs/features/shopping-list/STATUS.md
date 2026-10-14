# Estado da feature — Lista de compras

**Fase atual:** Implementação
**Gate atual:** plano **aprovado** — `PLAN.md` com a frase canônica
`Aprovado pelo usuário em 2026-10-13` (gate do plano fechado)
**Última atualização:** 2026-10-14
**Próxima ação:** Onda 11 — **T-17** (jornadas Playwright em `apps/web-e2e`;
dep T-14/T-16) — sozinha. É o **gate de ADR 0008**; o `feature-validator` **não**
deve ser delegado antes de T-17 fechar (superfície de UI = sim e o handoff do
`test-engineer` precisa registrar a corrida Playwright).

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

- Tarefa em andamento: **T-17** (jornadas Playwright; `test-engineer`)
- Tarefas concluídas: T-01 … T-16, T-18 (falta T-17)
- Critérios comprovados: backend completo (T-01–T-07) + **prova com Postgres real**
  (T-15) + **corrida de duplicidade corrigida** (T-18) — suíte
  `shopping-list-service` com **162 testes**, 14 arquivos; PWA completa em código e
  com **mapa AC → teste** (T-10–T-14, T-16) — suíte `web` com **177 testes**, 20
  arquivos; E2E de auth sem regressão (6 verdes)
- ACs com evidência unit/integração: AC-01–AC-26 (mapa em T-16); falta a **matriz
  Playwright** da UI (T-17) para fechar o gate de evidência de UI
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- **Nenhum bloqueio.** O gate do plano segue fechado e a corretiva T-18 está
  concluída.
- **Sync do workspace (resolvido):** T-10 passou `apps/web` a importar
  `@lista/contracts` sem registrar a *project reference*, deixando o workspace fora
  de sync (`nx sync:check`/`nx build` (workspace)/`nx e2e` falhavam antes de
  executar). O orquestrador rodou `nx sync` e commitou o ajuste de
  `apps/web/tsconfig.app.json` em `f5a68a4` (`npx nx sync:check` verde). **Gate de
  UI (T-17) desbloqueado.**
- **Decisão do usuário (2026-10-13) — resolvida em T-18:** em POSTs
  **concorrentes** com o mesmo nome, o `CreateShoppingListItemUseCase` fazia
  *read-then-write* (TOCTOU) e o erro do índice único subia como **500 em vez de
  409**. Corrigido (`3d20cd8`): a violação `23505` entra pelo **port** como
  `ActiveItemNameConflictError` (traduzida no adaptador Drizzle) e o caso de uso
  **relê uma vez** reaplicando a decisão de duplicidade — soma quando
  `duplicateResolution: 'sum-planned-quantity'`, senão **409** canônico
  (`duplicateOf`); degrada para 409 (nunca 500). Erro alheio ao índice continua
  propagando. A spec era silente sobre a corrida; a correção só alinha a corrida à
  regra de duplicidade **já documentada** (nenhum AC novo, sem migração e sem
  contrato HTTP novo).
- **Encaminhamento (não bloqueio):** o contrato do **evento de conclusão de compra**
  (previsto na ADR 0001) fica para a **feature de histórico** — fora desta rodada.
- **Pré-requisito de teste (novo):** a suíte `shopping-list-service` agora **exige
  Docker no ar + `db:migrate`** (a integração de T-15 usa PostgreSQL real):
  `npm run docker:up` + `npx nx run shopping-list-service:db:migrate`.
- **Porta do E2E:** `npx nx e2e web-e2e` (comando de evidência de T-17) falha se um
  `serve` já ocupar a 4200/3001 (o alvo implícito `web:serve:development` não sobe).
  Com um `ms-all` no ar, rodar `npx playwright test --config
  apps/web-e2e/playwright.config.mts`. Para o gate de T-17, garantir as portas livres.
- **Nit de doc (concluído em T-18, `3d20cd8`):** `libs/contracts/README.md` passou a
  citar a mensagem canônica `Corpo da requisição inválido` (JSON malformado).
- **Nota de escopo (resolvida):** para T-06 honrar o contrato **201 (criado) / 200
  (soma aplicada)** do `POST /items`, o orquestrador autorizou uma alteração
  **aditiva** em `create-shopping-list-item.use-case.ts`/`shopping-list-result.ts`
  (`created?: boolean`), implementada e com testes verdes.

## Últimos handoffs

### T-16 — auditoria/completude dos testes unitários da PWA (`test-engineer`)

- Estado: concluída
- Arquivos alterados (só specs):
  `.../features/shopping-list/state/shopping-list-store.spec.ts` (+75 — describe
  "o navegador não guarda o estado da lista (AC-24/RN-19)" com 2 testes);
  `.../features/shopping-list/shopping-list-page.spec.ts` (+74 — "salvar a edição
  atualiza a linha e confirma com toast (AC-10)" e "concluir com tudo comprado cai
  no estado vazio (AC-03)"). **Nenhum arquivo de produção alterado.**
- ACs cobertos (unit): AC-01–AC-08, AC-10–AC-20, AC-22, AC-23, AC-25, AC-26 (+ AC-21
  e AC-24 como cobertura extra); **mapa AC → teste completo no handoff da sessão**
  (não reproduzido aqui). AC-09 é backend-only (integração).
- Testes executados: `npx nx test web` → **177 verdes**, 20 arquivos (cache 0/1 hit ⇒
  execução real; reforçado com `--skip-nx-cache`); `npx nx lint web` verde
- Decisões registradas: falseabilidade provada por mutação temporária em produção
  (teste de AC-24 falhou) e **revertida** (diff de produção vazio) — os testes novos
  são guardas reais; convenção de AC-25 em jsdom mantida (valor **declarado** do
  token, não `44px`); deliberadamente **não** duplicado o duplo-toque em "Excluir"
  (o single-flight do store já cobre)
- Observações: **E2E não executado** — as jornadas `apps/web-e2e/src/shopping-list/**`
  ainda não existem (entregável de T-17); a auditoria registra explicitamente que o
  gate de UI de ADR 0008 **não** está satisfeito até T-17
- Commit: `7011c4c`

### T-14 — ações do item, exclusão com Desfazer e conclusão (`angular-dev`)

- Estado: concluída
- Arquivos alterados: `item-actions-sheet.{ts,html,scss,spec.ts}` (novo),
  `checkout-sheet.{ts,html,scss,spec.ts}` (novo), `shopping-list-page.{ts,html,spec.ts}`
  (wiring)
- ACs cobertos: AC-11, AC-17, AC-18, AC-19, AC-20, AC-21 (UI), AC-23, AC-25, AC-26
- Testes executados: `npx nx test web` (**173 verdes**, 20 arquivos); `npx nx lint
  web` e `npx nx build web` verdes; `npx playwright test --config
  apps/web-e2e/playwright.config.mts` (6 verdes)
- Decisões registradas: `requestSheet('item-actions' | 'checkout')` como entrada
  única (app bar → checkout; linha → item-actions com o item); o sheet de ações não
  muta estado (emite `togglePurchased`/`edit`/`remove`/`closed`, consumidos por
  `consumeActionsItem()` — uma ação por abertura) e "Marcar" **reusa o
  `PurchaseSheet`** de T-13; excluir é imediato + toast `'Item excluído'` com ação
  `'Desfazer'` → `store.undoRemove()` (sem timers na tela); `removing: Set<string>`
  espelha `unmarking`; `<app-toast-host />` montado no fim do template (fixed +
  `--z-toast`) — fecha a pendência de T-12/T-13; `[closeOnBackdrop]="false"` no
  checkout
- Observações: **`npx nx e2e web-e2e` exige as portas 4200/3001 livres** — com um
  `ms-all` no ar o alvo `web:serve:development` não sobe e o Nx sai 1 (o Playwright
  em si passa); usar `npx playwright test --config apps/web-e2e/playwright.config.mts`
  enquanto o stack estiver no ar
- Commit: `07e8b27`

### T-13 — sheet de marcar/desmarcar comprado (`angular-dev`)

- Estado: concluída
- Arquivos alterados:
  `apps/web/src/app/features/shopping-list/purchase-sheet.{ts,html,scss,spec.ts}`
  (novo, 14 testes); `shopping-list-page.{ts,html,spec.ts}` (wiring: `purchaseItem`,
  `purchaseDrafts`, `unmarking`, `onTogglePurchased`/`onPurchaseClosed`/`onPurchased`,
  `unmark`)
- ACs cobertos: AC-12, AC-13, AC-14, AC-15, AC-16, AC-17 (edição), AC-23, AC-26
  (e AC-06 — unidade em `select` de 7 opções)
- Testes executados: `npx nx test web` (**147 verdes**, 18 arquivos); `npx nx lint
  web` e `npx nx build web` verdes; `npx nx e2e web-e2e` (6 verdes)
- Decisões registradas: o sheet recebe um `draft: PurchaseDraft | null` — a página o
  monta de `item.purchased` no desmarcar (valores digitados devolvidos pelo serviço),
  atendendo RN-12/CD-04 sem `output` extra; aviso de divergência = 2º
  `app-bottom-sheet [closeOnBackdrop]="false"` empilhado; estado de abertura por
  signal `purchaseItem` + mapa `purchaseDrafts` em memória (recarregar volta ao
  prefill); `unmarking: Set<string>` deduplica toast em toque duplo; números via
  `formatDecimal`/`parseDecimal` (RN-06)
- Observações: o *host* de toasts e o sheet de ações/conclusão são T-14 (aqui o
  `requestSheet('item-actions' | 'checkout')` fica como *seam*)
- Commit: `0e1f2d2`

### T-18 — corrida de duplicidade na criação (`backend-dev`)

- Estado: concluída
- Arquivos alterados:
  `apps/shopping-list-service/src/application/ports/shopping-list-repository.port.ts`
  (novo `ActiveItemNameConflictError` — o erro entra **pelo port**; `@throws` em
  `insert`); `.../infrastructure/persistence/drizzle/repository/shopping-list.repository.ts`
  (`insert` traduz `23505` → erro do port via `isUniqueViolation`, percorrendo a
  cadeia `cause`);
  `.../application/use-cases/create-shopping-list-item.use-case.ts`
  (`recoverFromConcurrentCreate`: relê **uma vez** e reusa `resolveExisting`);
  `.../create-shopping-list-item.use-case.spec.ts` (+3 testes: leitura vencida,
  colisão, erro alheio **não** engolido);
  `.../src/integration/shopping-list-postgres.spec.ts` (+3 testes em Postgres real
  com `StaleReadShoppingListRepository`, que força a leitura vencida e conta as
  colisões no índice); `libs/contracts/README.md` (nit)
- ACs cobertos: robustez sob concorrência de AC-09/RN-04/CD-02 (sem AC novo);
  sequencial preservado (201 `created: true` / 200 soma) e PATCH/CD-13 inalterado
- Testes executados: `npx nx test shopping-list-service` (**162 verdes**, 14
  arquivos; pré-requisito `npm run docker:up` + `db:migrate`; banco com 0 linhas ao
  final); `npx nx lint shopping-list-service` e `npx nx build shopping-list-service`
  verdes
- Decisões registradas: violação de unicidade entra pelo **port** (casos de uso não
  conhecem Postgres — ADR 0001); recuperação **bounded** (uma releitura; degrada
  para 409 canônico — nunca 500); `isUniqueViolation` casa só por `code === '23505'`
  (seguro: a tabela só tem esse índice único além da PK uuid); a prova de concorrência
  ficou na spec de **integração** (dois arquivos com `truncate` cruzado na mesma
  tabela se atropelariam no Vitest paralelo); **sem migração** e **sem contrato HTTP
  novo**
- Commit: `3d20cd8`

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

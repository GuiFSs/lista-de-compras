# Estado da feature — Lista de compras

**Fase atual:** Validação — **aprovada** (26/26 ACs pelo `feature-validator`)
**Gate atual:** `SPEC.md` e `PLAN.md` **aprovados** (`Aprovado pelo usuário em
2026-10-13`); **gate de Implementação e testes fechado** (T-01…T-19 concluídas,
suítes verdes, corrida Playwright registrada); **gate de Validação fechado**
(`VALIDATION.md` com evidência por AC e checklists de design/documentação)
**Última atualização:** 2026-10-14
**Próxima ação:** **decisão do usuário** — push da branch e abertura de PR
(a skill `git-workflow` exige aprovação explícita e separada para push e para
PR; o merge é uma terceira aprovação). Antes disso, decidir o que fazer com os
3 `.opencode/agents/*.md` modificados (pré-existentes, fora desta feature).
Nenhum AC ou T reaberto.

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
- Validação: `docs/features/shopping-list/VALIDATION.md` — **aprovada em
  2026-10-14** pelo `feature-validator` (**26/26 ACs aprovados**, 0 reprovados);
  evidência por AC com Playwright nos ACs observáveis na UI e integração no AC-09

## Escopo desta rodada (confirmado com o usuário)

- **Somente a lista de compras ativa**: obter a lista, adicionar/editar/excluir/
  restaurar item, marcar/desmarcar item como comprado e concluir a compra.
- **Fora desta rodada**: histórico de preços, menor preço e comparação — virão em
  feature(s) futura(s) (`price-history` etc.). A conclusão da compra **não** publica
  evento, **não** grava registro e **não** expõe rota de histórico (RN-16/AC-21); o
  envio ao histórico por evento (previsto na ADR 0001) é contrato da **feature de
  histórico**, fora desta rodada, sem ADR criada aqui.

## Execução

- Tarefa em andamento: **nenhuma**
- Tarefas concluídas: T-01 … T-19 (todas)
- Critérios comprovados: backend completo (T-01–T-07) + **prova com Postgres real**
  (T-15) + **corrida de duplicidade corrigida** (T-18) — suíte
  `shopping-list-service` com **162 testes**, 14 arquivos; PWA completa em código e
  com **mapa AC → teste** (T-10–T-14, T-16) — suíte `web` com **177 testes**, 20
  arquivos; **E2E de UI da feature (T-17)** — `apps/web-e2e` com **32 testes**
  (6 jornadas da lista + 6 de auth), `npx nx e2e web-e2e` → **32 verdes**;
  `npx nx typecheck web` verde (T-19) e `npx nx sync:check` verde
- ACs com evidência unit/integração: AC-01–AC-26 (mapa em T-16)
- ACs com evidência Playwright (UI): AC-01–AC-08, AC-10–AC-20, AC-22–AC-26 (matriz
  do `PLAN.md`; AC-09 é backend-only — integração). **Gate de UI de ADR 0008
  satisfeito.**
- **Validação:** `VALIDATION.md` registra **26/26 ACs aprovados**; a corrida
  Playwright (`npx nx e2e web-e2e` → 32 passed) foi executada pelo
  `feature-validator` e reconferida pelo orquestrador; banco deixado com 0 linhas
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
- **Regressão de `typecheck` causada pela T-10 (corrigida na T-19, `b16f000`):**
  `apps/web` passou a importar `@lista/contracts` (T-10, `5c5c67f`) e a *project
  reference* foi adicionada **só** ao `tsconfig.app.json` (`f5a68a4`) — o
  `tsconfig.spec.json` ficou sem ela, então `npx nx typecheck web` falhava com
  **10 erros** (`TS6059` + `TS6307`). `build`/`test`/`lint`/`e2e` **não** pegam
  porque usam outros tsconfigs. Prova de que é **nossa** regressão e não
  pré-existente: `git log --reverse -S"@lista/contracts" -- apps/web/src` → o
  primeiro commit é `5c5c67f` (T-10). Correção: a mesma reference no
  `tsconfig.spec.json` (T-19). **O handoff de T-17 rotulou esses erros como
  "pré-existentes/alheios" — está incorreto; corrigido aqui.**
- **Correção de flake no E2E de auth (T-17, fora do escopo da feature):**
  `apps/web-e2e/src/app.spec.ts` › "duplo toque gera uma requisição (AC-04)" era
  **instável sob carga** (falhava com 2 requisições no run completo e passava
  isolado). Causa: o teste simulava o duplo toque com `click()` + `click({ force:
  true })`; o 2º `click` **re-resolve o locator pelo nome acessível** e, com a 1ª
  resposta já de volta, o "2º toque" virava um **envio novo** (não um duplo toque).
  O comportamento do produto está correto (`isSubmitting` síncrono + `disabled`).
  Corrigido para `submit.dblclick()` (mesmo padrão já usado em AC-26), sem mudar a
  asserção (`requests === 1`). Evidência antes/depois registrada no handoff de T-17.
  **Revisar/aceitar ou reverter** livremente — não altera a evidência de nenhum AC
  da lista.
- **Observação de UI (não bloqueante, sem AC):** o toast de **erro persistente**
  (AC-23) fica em `--z-toast (300)`, acima do `--z-overlay (200)` dos bottom
  sheets, e é ancorado logo acima do bottom nav — ele **cobre** os botões do rodapé
  de um sheet aberto. As jornadas de T-17 contornam descartando o toast (botão
  "Dispensar", previsto em AC-23) antes de interagir com o sheet. Se o
  comportamento desejado for outro (ex.: o sheet empurrar/ocultar o toast), é
  decisão de design para uma tarefa própria — **não** foi alterado nesta rodada.
- **Recomendações não bloqueantes da validação** (o `feature-validator` julgou as
  três como **não** bloqueantes — ver `## Julgamentos exigidos pelo DoD` no
  `VALIDATION.md`); ficam para decisão do usuário/features futuras:
  1. **Toast × sheet:** decidir se o toast de erro deve cobrir o rodapé do sheet
     ou se o sheet deve ocultá-lo/empurrá-lo (hoje `--z-toast` 300 > `--z-overlay`
     200, com o toast ancorado acima do bottom nav).
  2. **Nit de doc em `libs/contracts/README.md`:** explicitar que, na borda,
     **JSON malformado responde 400 antes do `401`** do `JwtAuthGuard` (precedência
     de parse; paridade com o `auth-service`). Não é pendência de contrato.
  3. **`docs/lessons/`:** promover os aprendizados de T-18 (erro de unicidade pelo
     port, recuperação *bounded*) e T-19 (`typecheck` valida *project references*;
     `build`/`test` não) se forem considerados transferíveis.
- **Higiene antes do PR:** os 3 arquivos `.opencode/agents/*.md` aparecem
  modificados (**pré-existentes, fora desta feature** — alteram `bash: deny` →
  `bash: ask`). Decidir se entram em algum commit, viram commit próprio ou ficam de
  fora; **nenhuma** T desta feature os tocou.

## Últimos handoffs

### VALIDAÇÃO — feature aprovada (`feature-validator`)

- Estado: **aprovada** — **26/26 ACs** (AC-01…AC-26), 0 reprovados, 0 a reabrir
- Arquivo: `docs/features/shopping-list/VALIDATION.md` (novo; 230 linhas, template
  completo: evidências por critério, checklist de documentação, checklist de design,
  verificações transversais, pendências, julgamentos do DoD, comandos executados,
  parecer)
- Evidência: 25 ACs com cenário Playwright citado + corrida real; **AC-09**
  backend-only comprovado por integração com Postgres real (índice único parcial +
  `409` HTTP direto + corrida)
- Comandos executados (resultado real, registrado no `VALIDATION.md`):
  `npx nx e2e web-e2e` → **32 passed** (20.0s; `--skip-nx-cache` → 32 passed);
  `npx nx test web` → **177 passed / 20 arquivos**; `db:migrate` + `npx nx test
  shopping-list-service` → **162 passed / 14 arquivos**; `lint` (web, web-e2e,
  shopping-list-service) verdes; `npx nx typecheck web` e `npx nx sync:check`
  verdes; `shopping_list_items` com **0 linhas** ao final
- Julgamentos exigidos pelo DoD (detalhados no `VALIDATION.md`): **(1)** toast de
  erro persistente acima do rodapé do sheet — decisão de design, **não** viola AC
  (AC-23 só exige nova tentativa possível, provada descartando o toast);
  **(2)** deflake do E2E de auth preserva a prova (`requests === 1`), produção
  intacta; **(3)** `400` de corpo malformado **antes** do `JwtAuthGuard` é ordem de
  validação documentada (nada é retornado; paridade com o `auth-service`), nit de
  doc, não pendência de contrato. **Nenhum dos três bloqueia.**
- Decisões registradas: nenhuma ADR nova (ADR 0009 já versionada nesta feature)
- Pendências: nenhuma bloqueante; recomendações não bloqueantes na seção
  `## Pendências` abaixo
- Commit: **este commit de docs** (`docs(shopping-list): registra a validacao
  aprovada (26/26 ACs)`) — a referência é descritiva porque o `STATUS.md` está
  dentro do próprio commit; o hash final está no `git log`

### T-19 — correção do `typecheck` do `web` (`angular-dev`)

- Estado: concluída
- Arquivos alterados: `apps/web/tsconfig.spec.json` (+ bloco `references` para
  `../../libs/contracts/tsconfig.lib.json`, espelhando o `tsconfig.app.json`)
- ACs cobertos: nenhum (config de build; sem mudança de comportamento/contrato/UI)
- Testes executados: `npx nx typecheck web` → **verde** (antes: `Found 10 errors`
  — `TS6059` + `TS6307`); `npx nx sync:check` verde; `npx nx test web` (**177
  verdes**, 20 arquivos), `npx nx lint web` e `npx nx build web` verdes
- Decisões registradas: correção mínima de **uma** *project reference* — sem
  ajuste em `apps/web/tsconfig.json` e sem relaxar `strict`/`rootDir`. O
  `tsconfig.spec.json` é um **projeto TS separado** (compila `src/**/*.ts`
  **incluindo** specs, com `types: ["vitest/globals"]`), e *project reference*
  vale por projeto: declarar em `app.json` não vale para `spec.json`. `build`
  (esbuild) e `test` (Vitest/esbuild) **não** rodam `tsc --build`, por isso
  passavam; só o `typecheck` valida a *file list* e o `rootDir` de cada projeto
  referenciado
- Observações: tarefa **corretiva** autorizada pelo orquestrador (mesmo
  tratamento do `f5a68a4`), fora do `PLAN.md`; o handoff de T-17 rotulava esses
  erros como "pré-existentes/alheios" — **incorreto**, e a prova é que
  `git log --reverse -S"@lista/contracts" -- apps/web/src` aponta `5c5c67f`
  (T-10) como o primeiro commit
- Commit: `b16f000`

### T-17 — E2E Playwright das jornadas da UI (`test-engineer`)

- Estado: concluída
- Arquivos alterados (novos):
  `apps/web-e2e/src/support/session.ts` (login hermético com JWT fake),
  `apps/web-e2e/src/support/shopping-list-fake-api.ts` (contrato HTTP em memória
  tipado por `@lista/contracts`; rota por **RegExp** `\/api\/shopping-list(?:\/|$)`,
  exige `Authorization` e devolve `Bearer`; hooks `failNext`/`setLoadFailure`,
  `delayMs`, `requests()`/`countRequests()`),
  `apps/web-e2e/src/support/shopping-list-journey.ts` (`openShoppingList`),
  `apps/web-e2e/src/support/ui.ts` (medidas/tokens/toque; `listRows` isola o `main`),
  e as **6 jornadas** em `apps/web-e2e/src/shopping-list/`:
  `load.spec.ts` (6), `items.spec.ts` (6), `duplicates.spec.ts` (2),
  `purchase.spec.ts` (7), `delete-undo.spec.ts` (1), `checkout.spec.ts` (4) — 26
  cenários. Alterados: `apps/web-e2e/tsconfig.json` (project reference de
  `libs/contracts` para o typecheck do e2e) e `apps/web-e2e/src/app.spec.ts`
  (flake de duplo toque — ver Pendências).
- ACs cobertos (Playwright/UI): AC-01–AC-08, AC-10–AC-20, AC-22–AC-26; **AC-09 é
  backend-only** (integração `npx nx test shopping-list-service`). ≥1 jornada
  (`checkout.spec.ts` — AC-24) afirma a base `http://localhost:3000/api/shopping-list`
  **com** `Authorization` (ADR 0009).
- Mapa `AC → jornada/teste` (títulos = matriz do `PLAN.md`):
  - AC-01 → `load.spec.ts` "abre na Lista: app bar … bottom nav … desabilitadas que não navegam"
  - AC-02 → `load.spec.ts` "primeira carga mostra skeleton na forma da lista (sem spinner) e depois a lista"
  - AC-03 → `load.spec.ts` "lista vazia mostra empty state com CTA primary Adicionar item"
  - AC-04 → `items.spec.ts` "adiciona item só com o nome: aparece pendente com opcionais vazios"
  - AC-05 → `items.spec.ts` "salvar sem nome/só com espaços: erro no campo e nenhuma requisição"
  - AC-06 → `items.spec.ts` "unidade oferece exatamente as 7 opções, sem digitação livre (item e compra)"
  - AC-07 → `duplicates.spec.ts` "`cafe`/`Café`: pergunta somar; confirmar soma e mantém um item; recusar mantém o form com o digitado"
  - AC-08 → `duplicates.spec.ts` "editar para um nome existente: conflito visível no formulário, a edição **não** é aplicada e **nada** é somado; renomear para o próprio nome aplica"
  - AC-09 → **backend-only** (integração com Postgres; sem jornada de UI)
  - AC-10 → `items.spec.ts` "editar planejados e salvar atualiza a linha"
  - AC-11 → `delete-undo.spec.ts` "excluir sai na hora; Desfazer restaura com os mesmos dados (inclusive comprado); sem desfazer permanece excluído"
  - AC-12 → `purchase.spec.ts` "marcar com os 3 campos: item comprado com `line-through` e alvo ≥44px, **continua na lista**"
  - AC-13 → `purchase.spec.ts` "sem um dos campos obrigatórios: erro no campo e nenhuma requisição de marcação"
  - AC-14 → `purchase.spec.ts` "quantidade diferente avisa e só marca após confirmar; sem quantidade planejada não avisa"
  - AC-15 → `purchase.spec.ts` "pré-preenche quantidade/unidade planejadas e deixa o preço por unidade vazio"
  - AC-16 → `purchase.spec.ts` "desmarcar volta a pendente e reabrir preserva os digitados; recarregar usa o prefill de AC-15"
  - AC-17 → `purchase.spec.ts` "item comprado continua podendo ser editado e excluído"
  - AC-18 → `load.spec.ts` "com pendentes e comprados, os pendentes aparecem primeiro"
  - AC-19 → `checkout.spec.ts` "resumo N saem/M permanecem; confirmar remove só os comprados + toast; cancelar mantém a lista"
  - AC-20 → `checkout.spec.ts` "concluir sem itens comprados mantém a lista exatamente como estava"
  - AC-21 → `checkout.spec.ts` "o resumo não pede mercado nem data" (+ integração: sem rota/tabela de histórico)
  - AC-22 → `load.spec.ts` "falha ao carregar: erro visível na área + Tentar novamente recarrega e exibe a lista"
  - AC-23 → `items.spec.ts` + `purchase.spec.ts` "falha de rede ao salvar/marcar/concluir: toast persistente, digitado preservado, sem estado fantasma"
  - AC-24 → `checkout.spec.ts` "adicionar/editar/marcar/excluir e **recarregar a PWA**: estado mantido (GET refeito no serviço; nada em `localStorage`)"
  - AC-25 → `load.spec.ts` "viewport 360px e desktop (`--container-max`), tema claro e escuro, uma única primary, alvos ≥44px, `:focus-visible` visível"
  - AC-26 → `items.spec.ts` "duplo toque no Salvar: rótulo `Salvando…`, botão desabilitado e **1** requisição"
- Testes executados (comando + resultado, corrida real):
  - `npx nx e2e web-e2e` → `Running 32 tests using 6 workers` → **32 passed (28.2s)**
    (6 jornadas de auth + 26 da lista); portas 4200/3001/3000 livres antes da corrida
  - Confirmação de não-flake: `npx nx e2e web-e2e --skip-nx-cache` → **32 passed** (2×)
  - Filtro por jornada: `npx nx e2e web-e2e -- --grep "Lista —"` → **26 passed (24.6s)**
  - `npx nx lint web-e2e` → **verde, 0 warnings** (o warning pré-existente
    `no-force-option` saiu junto com o `force` do flake de auth)
  - `npx tsc --build tsconfig.json --emitDeclarationOnly` (cwd `apps/web-e2e`) →
    **exit 0**. Nota do orquestrador: `npx nx typecheck web-e2e` fica bloqueado
    pelo `web:typecheck`, que falha com 10 erros — **não** são pré-existentes nem
    alheios: são **regressão da T-10** (falta a *project reference* em
    `apps/web/tsconfig.spec.json`), corrigida na **T-19**. O `tsc --build` direto
    do e2e passa porque compila só o projeto do e2e, não o grafo do `web`.
- Decisões registradas: interceptação **hermética** por `page.route` com RegExp (glob
  `**/api/shopping-list` é ancorado no fim e perde sub-rotas) e store em memória
  tipado por `@lista/contracts` (`ITEM_UNITS`); `playwright.config.mts` **inalterado**
  (sem novo `webServer`); `localStorage` só com `lcd.accessToken` (AC-24);
  `listRows` limita ao `main` porque o bottom nav também tem `listitem`; skeleton
  provado por `role`/`aria-busy` (o `role=status` não recebe nome acessível do
  conteúdo); duplo toque via `locator.dblclick()` (o clique por coordenada não
  disparava o submit)
- Observações: sem `any`, sem `test.skip`/`passWithNoTests`, sem `waitForTimeout`;
  a base `http://localhost:3000/api/shopping-list` + `Authorization` é afirmada em
  AC-24 (ADR 0009); ver Pendências para o flake de auth (corrigido) e para o toast
  sobre o sheet (apenas observado)
- Commit: `61a8335` (o orquestrador reconferiu `npx nx e2e web-e2e` → **32 passed
  (28.2s)** antes de commitar)

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

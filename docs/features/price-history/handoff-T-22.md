# Handoff T-22 — E2E Playwright (price-history)

Tarefa: T-22 (E2E Playwright — jornadas herméticas da feature `price-history`)
Estado: **concluída** — suíte completa verde (56/56), lint 0, matriz AC ↔ E2E coberta por jornada. Superfície de UI = sim (ADR 0008); evidência executada de verdade, comando + resultado abaixo (sem inferência).

Escopo: criar/evoluir jornadas Playwright em `apps/web-e2e/**` cobrindo todos os ACs observáveis na UI, manter o E2E hermético (contrato interceptado; `nx e2e` sobe `web` :4200 + `auth-service` :3001), corrigir a prova fraca de `purchase.spec.ts` e registrar a base `http://localhost:3002/api/price-history` com `Authorization: Bearer` (AC-21 / ADR 0010).

## Arquivos alterados

Novos (specs de jornada):
- `apps/web-e2e/src/price-history/nav.spec.ts` (4 testes): navegação real da bottom nav (AC-01/AC-02), contrato da base+Bearer (AC-21), 401 → login com returnUrl (AC-18), viewport/tema/alvos (AC-19).
- `apps/web-e2e/src/price-history/history.spec.ts` (7 testes): lista+detalhe (AC-06/AC-11), consumo → Histórico (AC-06), skeleton (AC-13), empty rico (AC-12/AC-19), 3 jornadas de falha/retry/404 (AC-14).
- `apps/web-e2e/src/price-history/lowest-price.spec.ts` (7 testes): menor preço + agregação café/cafe (AC-08/AC-10), busca `q` com empty de busca (AC-09), skeleton (AC-13), empty rico (AC-12/AC-19), 3 jornadas de falha/retry da lista e da busca (AC-14).

Novos (suporte):
- `apps/web-e2e/src/support/price-history-fake-api.ts`: serviço de histórico em memória, tipado por `@lista/contracts`; registra cada requisição (`url`, `path`, `authorization`, `query`), `failNext`/`setLoadFailure`/`setUnauthorized` para falhas reais, `addPurchase` para o "consumo" (AC-06) e o filtro `q` com a **mesma normalização do serviço** (RN-06) para a busca exercitar o `q` de verdade.
- `apps/web-e2e/src/support/price-history-journey.ts`: `openPriceHistory(page, rota, seeds)` — as duas APIs falsas entram **antes** de qualquer requisição, sessão via login real, `goto` na rota.
- `apps/web-e2e/src/support/price-history-fixtures.ts`: seeds de contrato (`PURCHASES`, `LOWEST_PRICES`, `TWO_CAFE_PURCHASES`/`CAFE_LOWEST` para AC-10, `completedPurchase()` para o consumo de AC-06).
- `apps/web-e2e/src/support/dates.ts`: `todayLocal`, `displayDate` e `futureLocal` (perna de data futura, AC-04).

Evoluídos:
- `apps/web-e2e/src/shopping-list/checkout.spec.ts`: describe renomeado para `Lista — concluir compra (checkout)` (grep do PLAN); reforço com asserção de **una única** `.btn-primary:visible` no sheet; **+2 testes novos**: AC-15 (falha real de rede no `POST /checkout` com `failNext` → toast persistente, digitado preservado, lista intacta, retry fecha) e AC-20 (`dblclick` → `Concluindo…`, CTA desabilitado, **1** requisição); **+perna AC-04 "data futura"** na jornada de confirmação (erro no campo, `aria-invalid`, 0 POST, correção para hoje limpa o erro).
- `apps/web-e2e/src/shopping-list/purchase.spec.ts`: **prova fraca corrigida** (handoff T-21, "perna de AC-15 clica sem preencher mercado"): agora dispensa o toast de erro anterior (`Dispensar`), afirma `.toast--error` = 0, preenche `#checkout-market`, derruba só o `POST /checkout` e prova erro + mercado preservado + lista intacta + exatamente 1 POST.
- `apps/web-e2e/src/support/ui.ts`: estendido com `contentRows`/`listRows` (delegação aos seletores das duas telas), `hexToRgb` e `usesTokenColor` (prova de cor **pelo token**, nunca por rgb literal).

Não tocados (regressão preservada, todos verdes dentro dos 56): `load.spec.ts`, `items.spec.ts`, `duplicates.spec.ts`, `delete-undo.spec.ts`, `app.spec.ts` e o restante do suporte pré-existente. Nenhum arquivo fora de `apps/web-e2e/**` (produção, backend, `libs/contracts`, `STATUS.md` intactos); nenhum comando git.

## ACs cobertos

Todos os ACs observáveis na UI têm jornada Playwright executável (matriz abaixo). AC-16/AC-17 **não são observáveis na UI** — evidência é backend (integração do consumidor/outbox, T-20); nenhum E2E foi inventado para eles.

### Matriz AC ↔ E2E (jornada → teste → estado)

| AC | Jornada Playwright (arquivo → título exato) | Estado |
| --- | --- | --- |
| AC-01 | `price-history/nav.spec.ts` → "toca Histórico e Menor preço: navega para a rota real, aba ativa e sem \"em breve\" (AC-01/AC-02)" (+ regressão `shopping-list/load.spec.ts` → "abre na Lista: … abas de Histórico/Menor preço que navegam (AC-01/AC-02)") | verde |
| AC-02 | `price-history/nav.spec.ts` → mesmo teste (clique em Menor preço → `/menor-preco`, aba ativa, aba Lista volta a `/`) | verde |
| AC-03 | `shopping-list/checkout.spec.ts` → "com comprados, o resumo mostra Mercado e Data (hoje pré-preenchido, sem data futura)" + "resumo N saem/M permanecem…" (corpo do POST exato `{ market, purchaseDate }`) | verde |
| AC-04 | `shopping-list/checkout.spec.ts` → "resumo N saem/M permanecem…" — pernas: mercado só espaços → `Mercado é obrigatório` + `aria-invalid` + 0 POST; **data futura → `Data da compra não pode ser futura` + `aria-invalid` + digitado preservado + 0 POST** (nova nesta tarefa); `max=today` provado no teste de AC-03 | verde |
| AC-05 | `shopping-list/checkout.spec.ts` → "resumo N saem/M permanecem; confirmar remove só os comprados + toast; cancelar mantém a lista" | verde |
| AC-06 | `price-history/history.spec.ts` → "após o consumo do evento, a compra aparece no Histórico com a mesma data e mercado (AC-06)" (consumo = `addPurchase` no fake) + "lista as compras (mais recente primeiro)…" | verde |
| AC-07 | `shopping-list/checkout.spec.ts` → "concluir sem itens comprados mantém a lista exatamente como estava" (sem campos mercado/data, POST sem fantasma, reload sem rastro) | verde |
| AC-08 | `price-history/lowest-price.spec.ts` → "a lista completa mostra cada item com o menor preço na ordem do serviço (AC-08)" + "lista cada item distinto com o MENOR preço por unidade; café/cafe como um único item (AC-08/AC-10)" | verde |
| AC-09 | `price-history/lowest-price.spec.ts` → "busca por nome: `cafe` acha `café` (envia o q), sem resultado mostra empty de busca e Limpar busca volta à lista (AC-09)" (+ "falha na busca: Tentar novamente repete a MESMA busca…") | verde |
| AC-10 | `price-history/lowest-price.spec.ts` → "lista cada item distinto com o MENOR preço por unidade; café/cafe como um único item (AC-08/AC-10)" — duas compras de café (R$ 10,00 e R$ 7,50) agregam em 1 item com R$ 7,50; o detalhe do histórico prova que as duas fontes diferem | verde |
| AC-11 | `price-history/history.spec.ts` → "lista as compras (mais recente primeiro) com data/mercado e abre o detalhe com os itens (AC-06/AC-11)" | verde |
| AC-12 | `price-history/history.spec.ts` → "sem compras, o Histórico mostra empty state rico com uma única primary (AC-12/AC-19)"; `price-history/lowest-price.spec.ts` → "sem preços, o Menor preço mostra empty state rico com uma única primary (AC-12/AC-19)" | verde |
| AC-13 | `price-history/history.spec.ts` → "primeira carga mostra skeleton na forma do conteúdo, nunca spinner sozinho (AC-13)"; `price-history/lowest-price.spec.ts` → "primeira carga mostra skeleton na forma das linhas nome+preço (AC-13)" | verde |
| AC-14 | `price-history/history.spec.ts` ×3 → "falha ao carregar o Histórico: erro visível e Tentar novamente refaz o GET (AC-14)", "falha ao carregar o detalhe: Tentar novamente repete a MESMA compra (AC-14)", "detalhe de compra inexistente: 404 vira erro com volta ao Histórico (AC-14)"; `price-history/lowest-price.spec.ts` ×2 → "falha ao carregar os menores preços: erro visível e Tentar novamente refaz o GET (AC-14)", "falha na busca: Tentar novamente repete a MESMA busca, não a lista completa (AC-14)" | verde |
| AC-15 | `shopping-list/checkout.spec.ts` → "falha de rede ao concluir com mercado/data preenchidos: toast persistente, digitado preservado, lista intacta e nova tentativa funciona (AC-15)" — **POST real derrubado com `failNext`**, não validação local; `shopping-list/purchase.spec.ts` → "falha de rede ao marcar/concluir…" **prova fraca corrigida** (toast anterior dispensado, 0 `.toast--error`, `#checkout-market` preenchido, 1 POST) | verde |
| AC-16 | **não observável na UI** — sem E2E; evidência: `npx nx test price-history-service` (idempotência do ingest, T-20) | fora da UI |
| AC-17 | **não observável na UI** — sem E2E; evidência: integração/arquitetura (ingest só via evento, outbox, T-20) | fora da UI |
| AC-18 | `price-history/nav.spec.ts` → "sessão inválida no histórico: 401 volta ao login com returnUrl (AC-18)" (`returnUrl=/historico`, storage limpo, a chamada que gerou 401 **tinha** Bearer) | verde |
| AC-19 | `price-history/nav.spec.ts` → "viewport ~360px e desktop, tema claro/escuro, uma primary e alvos ≥44px (AC-19)" (canvas/azul lidos **dos tokens** via `usesTokenColor`; `--container-max`=960px; alvos ≥44px na lista e no campo de busca) + empties de AC-12 e a única primary do sheet | verde |
| AC-20 | `shopping-list/checkout.spec.ts` → "duplo toque em Concluir compra: rótulo Concluindo…, CTA desabilitado e uma única requisição (AC-20)" (sheet real, POST atrasado no fake) | verde |
| AC-21 | `price-history/nav.spec.ts` → "a PWA chama http://localhost:3002/api/price-history/* com Authorization (AC-21)" — URL base exata nas **3 operações** (lista, detalhe `/purchases/compra-2`, `/lowest-prices`) + `Authorization: Bearer …` em todas | verde |

## Testes executados (comando + resultado, sem inferência)

1. **Filtro da feature** (sem `--skip-nx-cache`; deps 2/6 do cache do Nx, o target `e2e` em si executou o Playwright):
   `npx nx e2e web-e2e -- --grep "[Hh]istórico|[Mm]enor preço|checkout"`
   → `Running 25 tests using 5 workers` → **`25 passed (24.4s)`** — inclui as 4 jornadas de nav, 7 de Histórico, 7 de Menor preço e as 6 de checkout.
2. **Suíte completa com cache pulado**:
   `npx nx e2e web-e2e --skip-nx-cache`
   → `Running 56 tests using 6 workers` → **`56 passed (33.3s)`**, `Run duration: 49.9s`, `Cache: Skipped (--skip-nx-cache)`.
   - **Baseline verificado antes da tarefa: 36 testes → total novo: 56** (+20: +4 nav, +7 history, +7 lowest-price, +2 checkout; a perna AC-04 entrou dentro de teste existente, sem mudar a contagem). Os 36 pré-existentes (auth + shopping-list) permanecem todos verdes — regressão confirmada.
3. **Lint**:
   `npx nx lint web-e2e --skip-nx-cache`
   → `eslint .` sem saída → **`Successfully ran target lint for project web-e2e`** → **0 problems** (nenhum `any`, regra `@typescript-eslint/no-explicit-any` respeitada).
4. **Registro honesto de uma corrida encontrada e corrigida** (não declaro verde por inferência): o 1º filtro executado (`--grep "[Hh]istórico|[Mm]enor preço"`, sem checkout) deu `Running 19 tests` → **18 passed, 1 failed** — `nav.spec.ts:52` (AC-21) falhou com `purchasesRead` `undefined`: `page.goto` resolve antes do bootstrap Angular disparar o `GET`, então a leitura do registro acontecia antes da gravação. Correção: **esperar o conteúdo renderizado** (`expect` de Playwright: `.history__item`/`contentRows`, `.detail__market`, linhas de menor preço) antes de cada `readOf(...)` — sem `waitForTimeout` nem espera arbitrária. Reexecuções seguintes (itens 1 e 2) verdes.

## Decisoes registradas

- **Fake semeia o contrato pronto, mas não reimplementa o serviço.** As respostas são as do contrato (`PurchaseListResponse` etc., compilador confere a paridade com `@lista/contracts`); a **única** regra de negócio reproduzida é o filtro de busca (`q` normalizado = trim + sem acentos + minúsculas, RN-06) — sem isso a jornada de AC-09 seria um filtro local e não provaria o `q`. Agregação/ordenação/menor preço vêm prontos, como o HTTP os define (a prova delas é da integração do serviço).
- **AC-06 sem broker, de propósito (CD-06).** O "consumo do evento" no E2E hermético é o fake ganhar a compra via `addPurchase()`; a prova ponta-a-posta (evento → ingest → 1 registro) fica na integração dos serviços (T-09/T-20), como o PLAN determina.
- **AC-19 prova cor por token, não por literal.** `usesTokenColor(page, locator, '--color-…')` lê o valor do token e compara com a cor computada (`hex → rgb`), em claro e escuro — um rgb hardcoded no teste seria a própria falsificação que o GUIA/AC-19 proíbe.
- **AC-04 "data futura" era lacuna real e foi fechada.** O PLAN pedia "mercado vazio **ou data futura**: erro no campo…"; só existia a perna de mercado. Como o `<form>` do sheet usa `novalidate`, quem valida é a regra do produto (computed `dateError`), então a asserção é determinística no Chromium: fill de data > hoje → mensagem `Data da compra não pode ser futura`, `aria-invalid`, mercado preservado, 0 POST; voltar a hoje limpa o erro e a conclusão acontece. Perna adicionada **dentro** da jornada de confirmação existente (mesmo teste, mesma abertura de sheet) — contagem da suíte não muda.
- **Prova fraca de AC-15 em `purchase.spec.ts` corrigida, nunca enfraquecida.** A perna agora limpa o estado de erro anterior e derruba o `POST /checkout` com a tela preenchida; a prova forte de AC-15 ficou em `checkout.spec.ts` (falha real de rede + retry que fecha).
- **Sem arbitrariedade de tempo.** Nenhum `waitForTimeout`: todas as esperas são `expect(...)` de Playwright sobre DOM/requisição; o único atraso é `delayMs` do fake, que *cria* a janela observável (skeleton/`Concluindo…`) — e mesmo assim a asserção é de estado, não de tempo.
- **Corrida de AC-21 virou aprendizado registrado** (item 4 dos testes): em E2E de SPA, ler log de requisição exige que o *efeito* do bootstrap já esteja na tela; a correção foi acoplar a leitura ao conteúdo, não aumentar timeout.
- **Grep do filtro é case-sensitive**: o padrão funcional é `"[Hh]istórico|[Mm]enor preço|checkout"` (o describe do checkout foi renomeado para `Lista — concluir compra (checkout)` para casar o terceiro termo do PLAN).
- **Escopo respeitado.** Somente `apps/web-e2e/**` foi alterado; sem comandos git; `STATUS.md` e docs além deste handoff intactos; nenhum comportamento ausente da SPEC foi inventado (ex.: detalhe 404 continua caindo no erro com "Voltar para o histórico", sem empty state que a SPEC não pede).

## Pendencias

- AC-16/AC-17: sem E2E **por definição** (não observáveis na UI); evidência fica na integração backend registrada no handoff T-20. Nada a executar aqui.
- (baixa) O fake espelha a normalização de busca do serviço; se a RN-06 mudar no backend, atualizar `support/price-history-fake-api.ts`. A paridade de **tipo** é garantida por `@lista/contracts` (compilador); a de **comportamento**, pelos testes de integração do serviço — o E2E não é o guard dessa regra.
- (para o orquestrador) `STATUS.md` não foi tocado por escopo: registrar lá a T-22 verde com os 3 comandos + resultados acima e a matriz AC ↔ E2E fechada (gate de implementação do ADR 0008).

## Proximo passo recomendado

**Retorno ao orquestrador**: T-22 verde com evidência registrada (suíte completa 56/56 com `--skip-nx-cache`, filtro da feature 25/25, lint 0). Com T-20 (backend), T-21 (unitário web) e T-22 (E2E) fechados, todos os ACs têm caminho de validação executável — seguir para a **validação final da feature** (`VALIDATION.md` / `feature-validator`) e, se aprovada, ao ciclo de git/PR (decisão do usuário, skill `git-workflow`).

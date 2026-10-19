Tarefa: T-21 (Auditoria unitária PWA)
Estado: concluída
Escopo: auditoria dos testes **unit/integração da camada web** do price-history (`apps/web/**`, deps T-17/T-18/T-19). A feature tem Superfície de UI = sim (ADR 0008), mas a evidência Playwright dos ACs observáveis na UI é da **T-22** (não executada aqui). Esta tarefa mapeia cada AC para evidência executável e completa só o que é pequeno, inequívoco e cabe em `apps/web/**`. Nenhuma linha de produção foi alterada.

Arquivos alterados:
- apps/web/src/app/app.routes.spec.ts (novo): 3 testes da **tabela de rotas**. Fecha a lacuna nomeada no handoff T-16 ("sem `app.routes.spec.ts` novo") e prova a área "`/` continua a Lista" (RN-12): a raiz é filha do `AuthenticatedShell` com `authGuard` e entrega `ShoppingListPage`; `historico`, `historico/:id` e `menor-preco` resolvem o `loadComponent` **lazy de verdade** (`import()` do chunk) e entregam `HistoryPage` / `HistoryDetailPage` / `LowestPricePage`; o curinga `**` é o último filho e entrega `NotFound`. Complementa a spec da bottom nav (que prova o `href`/aba ativa) com a prova do registro real em `appRoutes`.
- apps/web/src/app/design-tokens.smoke.spec.ts (novo): 12 testes de **fumaça de tokens do GUIA-DESIGN**. Lê do disco os `.scss`/`.html` da superfície nova (6 arquivos da feature Histórico/detalhe/Menor preço + `checkout-sheet.{scss,html}` + `bottom-nav.{scss,html}` = 10 arquivos) e barra cor hardcoded (`#hex`, `rgb[a](`, `hsl[a](`) — RN-14/AC-19 exigem tokens only. É o guard que o PLAN pede ("teste de fumaça que leia os arquivos e barra hex/`rgb(` hardcoded fora dos tokens"): diferente dos specs de componente (que checam DOM), este lê o texto-fonte dos templates/estilos. O 3º teste é a falsificação da premissa — afirma que `styles/_tokens.scss` **tem** cor literal, provando que o regex do guard não é vácuo.

ACs cobertos (camada unit/integração web): AC-01…AC-15, AC-18, AC-19, AC-20, AC-21. AC-16/AC-17 são backend-only (fechados na T-20). Os ACs observáveis **apenas** na jornada de UI ficam com a T-22 (lista ao final).

Mapa AC → evidência executável (arquivo → título exato do teste):

AC-01 (tocar Histórico na bottom nav navega; aba ativa; sem "em breve"):
- apps/web/src/app/layout/bottom-nav/bottom-nav.spec.ts → "tocar em Histórico navega para /historico e ativa a aba (AC-01)"; "marca a aba Lista como ativa na rota da lista (AC-01)"; "nenhuma aba vem desabilitada nem exibe "em breve" (AC-01/AC-02)"; "é um marco de navegação com as três abas"
- apps/web/src/app/app.routes.spec.ts → "mantém a Lista em `/` dentro do shell autenticado"; "registra Histórico, detalhe e Menor preço entregando a tela real"
- apps/web/src/app/features/price-history/history-page.spec.ts → "contribui o título "Histórico" na app bar e devolve ao default ao sair (AC-01)"

AC-02 (tocar Menor preço navega; aba ativa; sem "em breve"):
- apps/web/src/app/layout/bottom-nav/bottom-nav.spec.ts → "tocar em Menor preço navega para /menor-preco e ativa a aba (AC-02)"; "nenhuma aba vem desabilitada nem exibe "em breve" (AC-01/AC-02)"
- apps/web/src/app/app.routes.spec.ts → "registra Histórico, detalhe e Menor preço entregando a tela real"
- apps/web/src/app/features/price-history/lowest-price-page.spec.ts → "contribui o título "Menor preço" na app bar e devolve ao default ao sair (AC-02)"

AC-03 (sheet mostra resumo + Mercado obrigatório + Data de hoje, editável, sem futura):
- apps/web/src/app/features/shopping-list/checkout-sheet.spec.ts → "com comprados, mostra os campos Mercado e Data com hoje pré-preenchido e `max` = hoje (AC-03)"; "enviar com mercado/data válidos envia o payload e emite `confirmed` (AC-03)"; "é um sheet de confirmação com o resumo de quantos saem e quantos permanecem (AC-19)"
- apps/web/src/app/features/shopping-list/shopping-list-page.spec.ts → "o resumo da conclusao pede mercado e data com itens comprados (AC-03)"

AC-04 (mercado vazio/só espaços ou data futura → erro no campo; nada sai):
- apps/web/src/app/features/shopping-list/checkout-sheet.spec.ts → "mercado vazio mostra o erro no campo, com aria-invalid, e nao envia nada (AC-04)"; "data futura mostra o erro no campo e nao envia nada (AC-04)"; "data vazia ou inválida mostra a mensagem própria e nao envia nada (AC-04)"
- apps/web/src/app/features/shopping-list/state/shopping-list-store.spec.ts → "400 de mercado entrega a mensagem do envelope e não mexe na lista (AC-04)"; "400 de data futura entrega a mensagem do envelope (AC-04/CD-07)"

AC-05 (confirma com mercado/data válidos: só comprados saem; toast de sucesso; broker fora não bloqueia):
- apps/web/src/app/features/shopping-list/state/shopping-list-store.spec.ts → "envia o payload do contrato e aplica a lista devolvida (AC-05)"
- apps/web/src/app/features/shopping-list/shopping-list-page.spec.ts → "a app bar abre o resumo; confirmar remove só os comprados e confirma com toast (AC-19)"
- (falha preservando digitado) checkout-sheet.spec.ts → "erro 400 com mensagem PT mantém o sheet aberto e o digitado para nova tentativa (AC-05/AC-15)"

AC-06 (após consumo, a compra aparece no Histórico com mesma data/mercado; detalhe lista todos os itens):
- apps/web/src/app/features/price-history/state/price-history-store.spec.ts → "começa em loading e aplica a ordem recebida do serviço (AC-06)"
- apps/web/src/app/features/price-history/history-page.spec.ts → "lista cada compra com data e mercado, na ordem do serviço (AC-06/RN-08)"
- apps/web/src/app/features/price-history/history-detail-page.spec.ts → "mostra data, mercado e os itens comprados daquela conclusão (AC-11)"

AC-07 (sem nenhum comprado: lista igual; sem campos exigidos; sem registro/evento):
- apps/web/src/app/features/shopping-list/checkout-sheet.spec.ts → "sem nenhum comprado, nao há campos de mercado/data (RN-09)"; "sem nenhum comprado, confirmar envia sem payload e mantém a lista como estava (RN-09)"
- apps/web/src/app/features/shopping-list/shopping-list-page.spec.ts → "concluir sem itens comprados mantém a lista exatamente como estava (AC-20)"; "sem itens comprados, o resumo da conclusao nao tem campos de mercado/data (RN-09/AC-07)"
- apps/web/src/app/features/shopping-list/state/shopping-list-store.spec.ts → "sem nenhum comprado, o corpo é omitido e a lista volta como estava (RN-09)"

AC-08 (Menor preço: cada item distinto com o menor preço em R$; café/cafe como um item):
- apps/web/src/app/features/price-history/lowest-price-page.spec.ts → "lista cada item com o nome e o menor preço em R$, na ordem do serviço (AC-08/AC-10/RN-07)"
- apps/web/src/app/features/price-history/state/price-history-store.spec.ts → "aplica os itens do serviço sem agregar ou calcular no cliente (AC-08/AC-10)"
- apps/web/src/app/core/price-history/price-history-api.service.spec.ts → "menores preços sem busca não envia query (AC-08)"

AC-09 (busca por nome; `cafe` acha `café`; sem resultado = empty de busca):
- apps/web/src/app/features/price-history/lowest-price-page.spec.ts → "busca sem resultado mostra o empty de busca distinto, com "Limpar busca" (AC-09)"; "digitar dispara a busca com debounce, envia o termo e nao filtra no cliente (AC-09)"; ""Limpar busca" volta à lista completa e limpa o campo (AC-09)"; "campo de busca tem rótulo visível associado (AC-09/AC-19)"
- apps/web/src/app/features/price-history/state/price-history-store.spec.ts → "busca vai ao serviço como q e registra o termo (AC-09)"
- apps/web/src/app/core/price-history/price-history-api.service.spec.ts → "busca vai ao serviço como query q (AC-09)"

AC-10 (dois preços → exibe o menor, sem média/tendência):
- apps/web/src/app/features/price-history/lowest-price-page.spec.ts → "lista cada item com o nome e o menor preço em R$, na ordem do serviço (AC-08/AC-10/RN-07)"
- apps/web/src/app/features/price-history/state/price-history-store.spec.ts → "aplica os itens do serviço sem agregar ou calcular no cliente (AC-08/AC-10)"

AC-11 (abrir uma compra: detalhe com data, mercado e itens):
- apps/web/src/app/features/price-history/history-page.spec.ts → "tocar numa compra abre o detalhe daquela compra (AC-11)"
- apps/web/src/app/features/price-history/history-detail-page.spec.ts → "mostra data, mercado e os itens comprados daquela conclusão (AC-11)"; "o voltar retorna à lista do histórico (AC-11)"; "contribui o título na app bar e descarta a seleção ao sair (AC-11/RN-19)"
- apps/web/src/app/features/price-history/state/price-history-store.spec.ts → "seleciona a compra e busca o id no serviço (AC-11)"
- apps/web/src/app/core/price-history/price-history-api.service.spec.ts → "detalhe da compra vai em /purchases/{id} com Authorization (AC-11)"

AC-12 (empty state rico no Histórico e no Menor preço; nunca área em branco):
- apps/web/src/app/features/price-history/history-page.spec.ts → "sem compras, mostra o empty state rico com um único CTA primary (AC-12)"
- apps/web/src/app/features/price-history/lowest-price-page.spec.ts → "sem itens de preço, mostra o empty de lista com um único CTA primary (AC-12)"
- apps/web/src/app/features/shopping-list/shopping-list-page.spec.ts → "concluir com tudo comprado cai no estado vazio, nunca numa área em branco (AC-03)"

AC-13 (primeira carga = skeleton no formato do conteúdo):
- apps/web/src/app/features/price-history/history-page.spec.ts → "busca as compras ao entrar e mostra o skeleton na forma da lista (AC-13)"
- apps/web/src/app/features/price-history/history-detail-page.spec.ts → "busca a compra do id da rota e mostra o skeleton na forma do detalhe (AC-13)"
- apps/web/src/app/features/price-history/lowest-price-page.spec.ts → "ao entrar, pede a lista completa e mostra o skeleton na forma das linhas (AC-08/AC-13)"

AC-14 (falha de carga = erro visível com "Tentar novamente"; nova tentativa refetcha a chamada correta):
- apps/web/src/app/features/price-history/history-page.spec.ts → "em falha de carga, mostra o erro na área e "Tentar novamente" refaz o GET (AC-14)"
- apps/web/src/app/features/price-history/history-detail-page.spec.ts → "compra inexistente (404) cai no erro e "Tentar novamente" repete a seleção (AC-14)"
- apps/web/src/app/features/price-history/lowest-price-page.spec.ts → "em falha, mostra o erro e "Tentar novamente" refaz a MESMA busca (AC-14)"
- apps/web/src/app/features/price-history/state/price-history-store.spec.ts → "falha vira erro visível e a nova tentativa refaz o GET (AC-14)"; "404 vira erro e repetir sem id refaz o GET da seleção (AC-14)"; "erro + repetir sem termo refaz a MESMA busca (AC-14)"

AC-15 (falha ao concluir: erro visível, digitado permanece, sem fantasma, nova tentativa possível) — **prova de falha de REDE real** no unitário:
- apps/web/src/app/features/shopping-list/state/shopping-list-store.spec.ts → "falha não descarta o digitado: o payload segue intacto para a nova tentativa (AC-05)" — dispara `store.checkout(...)` com payload **congelado** (`Object.freeze`), força `http.expectOne(url('/checkout')).error(new ProgressEvent('error'))` (queda de rede **durante o POST**, não validação local) e prova: erro de rede com mensagem própria, `concluding()` volta a `false`, o objeto do formulário segue **idêntico** (inclusive espaços) e a nova tentativa com o **mesmo** digitado envia o corpo idêntico ao serviço.
- apps/web/src/app/features/shopping-list/checkout-sheet.spec.ts → "erro 400 com mensagem PT mantém o sheet aberto e o digitado para nova tentativa (AC-05/AC-15)"
- apps/web/src/app/features/shopping-list/shopping-list-page.spec.ts → "falha ao concluir mostra o erro em toast e preserva o digitado no sheet (AC-05/AC-15)"

AC-16/AC-17 — **não** observáveis na UI; evidência só backend, fechada na T-20 (handoff-T-20.md).

AC-18 (HTTP sem JWT → 401; PWA trata como sessão inválida → login):
- apps/web/src/app/features/price-history/state/price-history-store.spec.ts → "401 chega como erro de carga; o redirect ao login é do interceptor (AC-18)"
- apps/web/src/app/core/price-history/price-history-api.service.spec.ts → "401 no histórico encerra a sessão e volta ao login (AC-18)" (prova: storage limpo, `hasValidSession()` falso, `navigate(['/login'], { queryParams: { returnUrl: '/historico' } })`)
- apps/web/src/app/core/auth/auth.interceptor.spec.ts → "401 numa requisição autenticada → logout + volta ao login com returnUrl" (ponto de prova genérico e agnóstico de URL que cobre qualquer endpoint autenticado)
- (parte backend: JWT guard / 401 uniforme — fechado na T-20)

AC-19 (GUIA-DESIGN: 4 estados, uma primary, tokens only, ≥44px, ~360px/desktop, claro/escuro):
- **novo** apps/web/src/app/design-tokens.smoke.spec.ts → "encontra os arquivos da superfície: o guard não pode passar vazio"; "%s não hardcoda cor — só `var(--*)`" (10 arquivos, um caso por arquivo); "o guard não é vácuo: os tokens são o lugar das cores literais"
- apps/web/src/app/features/shopping-list/checkout-sheet.spec.ts → "as ações têm alvo ≥44px e a confirmação é a única primary do sheet (AC-25)"
- apps/web/src/app/features/price-history/lowest-price-page.spec.ts → "campo de busca tem rótulo visível associado (AC-09/AC-19)"
- (viewport ~360px/desktop e tema claro/escuro: verificação de jornada → T-22)

AC-20 (botão desabilitado com rótulo de progresso; toques repetidos não geram 2ª conclusão):
- apps/web/src/app/features/shopping-list/state/shopping-list-store.spec.ts → "toques repetidos no CTA compartilham uma única requisição (AC-20, single-flight)" (2 chamadas concorrentes → 1 POST; `http.expectNone` confirma a ausência de 2ª requisição)
- apps/web/src/app/features/shopping-list/checkout-sheet.spec.ts → "durante o envio o CTA mostra "Concluindo…" desabilitado; toque duplo não reenvia (AC-20/AC-15)" (rótulo `Concluindo…` com `disabled`; 2º clique não gera novo POST)

AC-21 (PWA chama o price-history-service direto, com JWT no header):
- apps/web/src/app/core/price-history/price-history-api.service.spec.ts → "lista compras em localhost:3002 com Authorization (ADR 0010 / AC-21)" (URL literal `http://localhost:3002/api/price-history/purchases` + `Authorization: Bearer <token>`); "usa a base do token PRICE_HISTORY_API_BASE_URL no lugar do default" (ADR 0010 §3)

ACs que ficam **para a T-22** (observáveis na jornada de UI, sem equivalente unitário possível):
- AC-01/AC-02 (jornada real de navegação pela bottom nav) — `price-history/nav.spec.ts`
- AC-06 (após consumo do evento, a compra aparece no Histórico) — `price-history/history.spec.ts`
- AC-08/AC-09/AC-10 (jornadas de Menor preço + busca) — `price-history/lowest-price.spec.ts`
- AC-11/AC-12/AC-13/AC-14 (jornadas nas duas telas) — `history.spec.ts` / `lowest-price.spec.ts`
- AC-19 (viewport ~360px/desktop, tema claro/escuro, alvos ≥44px na tela real)
- AC-20 (jornada de duplo toque no sheet real)
- AC-15 (jornada de falha do shopping-list no checkout — hoje `purchase.spec.ts:179` prova fraco, ver pendências)
- AC-18 (jornada PWA 401 → volta ao login) e AC-21 (asserção da base `http://localhost:3002` + `Authorization` na jornada)

Testes executados (comando + resultado, sem inferência):
- npx nx test web --skip-nx-cache → **29 arquivos, 278 testes, 0 falhas** (era 27/263 antes desta tarefa; +15 testes = 12 do design-tokens smoke + 3 do app.routes). Run duration 7.4s.
- npx nx lint web --skip-nx-cache → **0 problemas** ("All files pass linting"); nenhum `any` introduzido.
- **Falsificação do guard de tokens** (garante que o smoke não passa por acidente): injetei `color: #ff0000;` em apps/web/src/app/features/price-history/history-page.scss → a suíte ficou **vermelha** exatamente em `design-tokens.smoke.spec.ts > …history-page.scss não hardcoda cor — só var(--*)` (1 falha / 274 passados, quando a suíte tinha 275 testes). Injeção revertida.
- **Falsificação da tabela de rotas** (garante que a spec prende o mapa real): apontei temporariamente o `loadComponent` de `historico` para `lowest-price-page` em apps/web/src/app/app.routes.ts → a suíte ficou **vermelha** exatamente em `apps/web/src/app/app.routes.spec.ts:47` ("registra Histórico, detalhe e Menor preço entregando a tela real"): *Test Files 1 failed | 28 passed (29)*, *Tests 1 failed | 277 passed (278)*. `app.routes.ts` revertido ao estado commitado (confirmado por `git status`: nenhuma alteração em `app.routes.ts`).

Decisoes registradas:
- **AC-15 já tinha a prova real de rede — não dupliquei.** A pergunta da tarefa era se o unitário cobria "falha de rede durante o POST preservando o digitado" ou só a validação local que bloqueia antes do POST. A prova está em `shopping-list-store.spec.ts` → "falha não descarta o digitado…" com `http.expectOne(url('/checkout')).error(new ProgressEvent('error'))` e payload **congelado**: é erro de transporte no POST, não validação. As pernas de `checkout-sheet.spec.ts` e `shopping-list-page.spec.ts` cobrem a camada de UI (sheet aberto + toast + digitado preservado). Nada a adicionar.
- **AC-20 já estava coberto — não dupliquei.** O single-flight tem prova dupla: no store (`http.expectNone` após 2 chamadas concorrentes) e na UI (rótulo `Concluindo…` + `disabled` + 1 POST). Nada a adicionar.
- **401 no store: não criei teste por endpoint.** O ponto de prova real é o `authInterceptor` **agnóstico de URL** (`auth.interceptor.spec.ts` → "401 numa requisição autenticada → logout + volta ao login com returnUrl") somado ao teste do serviço do price-history (`price-history-api.service.spec.ts` → "401 no histórico encerra a sessão e volta ao login (AC-18)") e ao teste do store (401 chega como erro de carga; o redirect é do interceptor). Criar um 401 por método (`listPurchases`/`getPurchase`/`getLowestPrices`) só repetiria a mesma asserção sobre um interceptor que não olha a URL. Registrado abaixo como endurecimento opcional de baixa prioridade.
- **Dois specs novos, ambos objetivos e pequenos.** A tabela de rotas fecha uma lacuna **nomeada** (handoff T-16) e o smoke de tokens atende a um pedido **explícito** do PLAN (linha T-21: "design tokens smoke"). Ambos foram falsificados de verdade (acima) para não serem testes vácuos.
- **Sem mudança de produção.** Nenhuma linha de `apps/web/**` de produção foi tocada; as duas mutações de `app.routes.ts`/`history-page.scss` foram temporárias e revertidas (confirmado por git). `apps/web-e2e/**`, backend, `libs/contracts`, `STATUS.md` e docs além deste handoff não foram tocados.
- **Não inventei comportamento ausente da SPEC.** O detalhe de compra **não** tem empty state por design (404 cai no erro — AC-14); não fabriquei um empty onde a SPEC não pede. A ordem/agregação/normalização de nome são do serviço (RN-06…RN-08): os specs da web provam que o cliente **não** recalcula (aplicam a resposta idêntica ao contrato).

Pendencias:
- (baixa, opcional) Aumentar o guard de tokens de "proibido hex/rgb/hsl" para também prender tamanhos/cores via `var(--*)` esperados por tela — hoje o smoke só barra cor literal; os alvos ≥44px são checados em componente (`checkout-sheet.spec.ts`), não por arquivo.
- (baixa, opcional) Endurecimento de AC-18 no store: um caso por operação (`listPurchases`/`getPurchase`/`getLowestPrices`) com 401 real. Decisão: **não** implementado — duplicaria a prova do interceptor agnóstico de URL; se o time quiser explicitar cada rota, é barato.
- (para a T-22, já registrado no handoff-T-17-e2e) Em `apps/web-e2e/src/shopping-list/purchase.spec.ts:179` a perna "falha ao concluir" clica o CTA sem preencher mercado; com a validação local nova nenhum POST `/checkout` acontece ali e a asserção de "Falha de rede" é satisfeita pelo toast persistente de uma falha anterior de `PUT /purchase`. O teste **passa**, mas a prova de AC-15 naquele arquivo ficou fraca — deve ser coberta de verdade em `checkout.spec.ts` (T-22).
- (para a T-22) Toda a matriz AC ↔ E2E de jornadas de UI (AC-01/02, AC-06, AC-08–AC-14 journeys, AC-15, AC-18 PWA 401, AC-19 viewport/tema, AC-20 duplo toque, AC-21 base `localhost:3002` + Authorization) permanece aberta — não executada nesta tarefa por escopo.
- (informativa) `npx nx test web` usa `@angular/build:unit-test` (Vitest, jsdom); o `design-tokens.smoke.spec.ts` precisa de `/// <reference types="node" />` porque `apps/web/tsconfig.spec.json` fixa `types: ["vitest/globals"]` (sobrepõe o `types: ["*"]` da base) — sem isso o compilador Angular falha com `TS2591`. Registrado para quem mexer no `tsconfig.spec.json`.

Proximo passo recomendado: **T-22** (E2E Playwright) quando a onda estiver liberada — criar/evoluir as jornadas herméticas (`price-history/nav.spec.ts`, `history.spec.ts`, `lowest-price.spec.ts`, `shopping-list/checkout.spec.ts`), afirmar a base `http://localhost:3002/api/price-history` com `Authorization`, corrigir a prova fraca de `purchase.spec.ts:179` e fechar o gate com `npx nx e2e web-e2e` (comando + resultado no handoff).

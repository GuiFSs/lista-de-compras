# Validação — Histórico de preços

**Spec:** `docs/features/price-history/SPEC.md` (aprovada em 2026-10-16 — 21 ACs, RN-01…RN-16, CD-01…CD-07)
**Plano:** `docs/features/price-history/PLAN.md` (aprovado em 2026-10-16 — matriz AC ↔ E2E + T-01…T-22)
**Data:** 2026-10-19
**Resultado:** **Aprovada** — 21/21 ACs com evidência executável (superfície de UI: Playwright)
**Superfície de UI (do plano):** **sim** (ADR 0008)

DoR da validação (§4 do `docs/process/sdd-workflow.md`): implementação e testes
concluídos (T-01…T-22 commitadas, **nenhum AC/T reaberto** no `STATUS.md`), e o
handoff do `test-engineer` **registra a corrida Playwright** (T-22:
`npx nx e2e web-e2e --skip-nx-cache` → 56/56). Gate da ADR 0008 satisfeito —
e **reproduzido por mim** (comandos ao final).

## Conferência do STATUS contra o repositório

- `git status --porcelain` → **vazio** (nenhum trabalho não commitado pendente).
- `git branch --show-current` → `feature/price-history`.
- Todos os hashes do `STATUS.md` existem no `git log`: T-01 `69ce52d`, T-02
  `457f4f1`, T-03+T-04 `cf997bf`, T-05 `ae5d4ec`, T-10 `6a3f425`, T-06
  `2676397`, T-11 `a17b14b`, T-07 `fa16503`, T-12 `dbe340a`, T-08 `903d5d8`,
  T-13 `54368c2`, T-09 `9ea5e66`, T-14 `db7966f`, T-15 `1ade4b2`, T-16
  `a995c07`, T-17 `c810aee` + correção ratificada `a74b4a4`, T-18 `cbe8ea1`,
  T-20 `3e0d298`, T-19 `a24e633`, T-21 `723c239`, T-22 `38f1722`, STATUS
  `3234561`.
- **ACs reabertos: nenhum. Tarefas reabertas: nenhuma.**
- **Divergência de ambiente (não de código/status):** o contexto informado
  pelo orquestrador dizia "Docker (Postgres + RabbitMQ) está no ar", mas na
  minha primeira corrida o container `lista-de-compras-rabbitmq` estava
  **`Exited (0)` há 43 horas** (só o Postgres `Up`). Efeito registrado: 1
  falha no SL (`rabbitmq-event-publisher.spec` — `ECONNREFUSED :5672`) e 1
  suíte falha no PH (consumidor de integração — 3 skipped). **Resolução de
  ambiente:** `docker start lista-de-compras-rabbitmq` (pré-requisito do
  plano, `npm run docker:up`) e re-execução completa → todas as suítes
  verdes. Nenhum código foi alterado; nenhum AC afetado. Recomendação ao
  orquestrador: conferir `docker ps` antes dos gates.

## Evidências por critério

Legenda: **Comando E2E** = `npx nx e2e web-e2e` (`--skip-nx-cache`), corrida
real de **56/56** registrada em "Comandos executados". **Unit web** =
`npx nx test web` (278/278). **Unit/integração backend** =
`npx nx test shopping-list-service` (206/206) e
`npx nx test price-history-service` (104/104). Títulos entre crases =
`arquivo › título`; todos conferidos no código-fonte e verdes na corrida que
executei.

| AC | Estado | Evidência Playwright (ADR 0008) — corrida 56/56 | Evidência unit/integração | Observação |
| --- | --- | --- | --- | --- |
| AC-01 | **aprovado** | `price-history/nav.spec.ts › toca Histórico e Menor preço: navega para a rota real, aba ativa e sem "em breve" (AC-01/AC-02)` + regressão `shopping-list/load.spec.ts › abre na Lista: … abas de Histórico/Menor preço que navegam (AC-01/AC-02)` | Unit: `bottom-nav.spec.ts › tocar em Histórico navega para /historico e ativa a aba (AC-01)` e `› nenhuma aba vem desabilitada nem exibe "em breve" (AC-01/AC-02)`; `app.routes.spec.ts › registra Histórico, detalhe e Menor preço entregando a tela real`; `history-page.spec.ts › contribui o título "Histórico" na app bar… (AC-01)` | Rota real + aba ativa em `--color-primary-text`; sem "em breve" |
| AC-02 | **aprovado** | Mesmo teste de nav (`nav.spec.ts`): clique em Menor preço → `/menor-preco`, aba ativa, sem "em breve" | Unit: `bottom-nav.spec.ts › tocar em Menor preço navega para /menor-preco e ativa a aba (AC-02)`; `lowest-price-page.spec.ts › contribui o título "Menor preço" na app bar… (AC-02)` | — |
| AC-03 | **aprovado** | `shopping-list/checkout.spec.ts › com comprados, o resumo mostra Mercado e Data (hoje pré-preenchido, sem data futura)` | Unit: `checkout-sheet.spec.ts › com comprados, mostra os campos Mercado e Data com hoje pré-preenchido e \`max\` = hoje (AC-03)` e `› enviar com mercado/data válidos envia o payload e emite \`confirmed\` (AC-03)`; backend: `checkout-validation.spec.ts › aceita mercado e data hoje ou passados, com mercado aparado` | `max=today` no E2E impede data futura; resumo N saem/M permanecem preservado |
| AC-04 | **aprovado** | `checkout.spec.ts › resumo N saem/M permanecem…` — pernas: mercado só espaços → `Mercado é obrigatório` + `aria-invalid` + **0 POST**; **data futura** → `Data da compra não pode ser futura` + `aria-invalid` + digitado preservado + 0 POST (correção para hoje limpa o erro) | Unit web: `checkout-sheet.spec.ts › mercado vazio mostra o erro no campo, com aria-invalid, e não envia nada (AC-04)`, `› data futura mostra o erro no campo e não envia nada (AC-04)`, `› data vazia ou inválida mostra a mensagem própria e não envia nada (AC-04)`; backend: `shopping-list.controller.spec.ts › 400 — checkout inválido (%s) usa o envelope canônico, nada sai da lista e não grava outbox (AC-04)` (9 casos via `it.each`) + `checkout-validation.spec.ts` + `purchase-completion.spec.ts › ≥1 comprado com mercado só espaços ou data futura: invalid, sem payload (AC-04)`; integração `shopping-list-postgres.spec.ts › 400 — mercado/data inválidos param antes de qualquer escrita no banco` | "Nenhum evento publicado / nenhum registro criado": corpo não passa do domínio → sem outbox (`não grava outbox`) → sem evento |
| AC-05 | **aprovado** | `checkout.spec.ts › resumo N saem/M permanecem; confirmar remove só os comprados + toast; cancelar mantém a lista` (sucesso sem broker no ambiente hermético — CD-06) | Unit web: `shopping-list-store.spec.ts › envia o payload do contrato e aplica a lista devolvida (AC-05)`; backend: `shopping-list.controller.spec.ts › 200 — remove (hard delete) só os comprados, devolve os pendentes e grava o outbox (AC-05)`, `checkout-shopping-list.use-case.spec.ts › com comprados grava o DELETE e o outbox na mesma operação atômica (AC-05)`, integração `› 500 — violar unique(completion_id) desfaz o DELETE dos comprados (rollback real)`, outbox publisher: `outbox-publisher.spec.ts › em falha grava attempts e last_error e re-tenta depois (retry)` | Broker indisponível não bloqueia: prova por composição (`CheckoutShoppingListUseCase.length === 2`; publisher é serviço à parte com retry) + jornada E2E sem broker; ver "Julgamento 1" |
| AC-06 | **aprovado** | `history.spec.ts › após o consumo do evento, a compra aparece no Histórico com a mesma data e mercado (AC-06)` (consumo = `addPurchase` no fake, hermético por decisão do PLAN/CD-06) + `› lista as compras (mais recente primeiro) com data/mercado e abre o detalhe com os itens (AC-06/AC-11)` | Backend: `price-history.controller.spec.ts › 200 — lista mais recente primeiro no shape exato do contrato` e `› 200 — detalhe com data, mercado e itens comprados`; `list-purchases.use-case.spec.ts › lista as compras da mais recente para a mais antiga, com itemCount (AC-06)`; ponta-a-ponta evento→ingest: `rabbitmq-purchase-completed-consumer.integration.spec.ts` (RabbitMQ real); unit web: `price-history-store.spec.ts › começa em loading e aplica a ordem recebida do serviço (AC-06)` | E2E hermético × integração real é o desenho aprovado no PLAN (risco "E2E hermético × full-stack") |
| AC-07 | **aprovado** | `checkout.spec.ts › concluir sem itens comprados mantém a lista exatamente como estava` (sem campos mercado/data, POST sem fantasma, reload sem rastro) | Unit web: `checkout-sheet.spec.ts › sem nenhum comprado, não há campos de mercado/data (RN-09)` e `› sem nenhum comprado, confirmar envia sem payload e mantém a lista como estava (RN-09)`; backend: `shopping-list.controller.spec.ts › 200 — sem itens comprados mantém a lista exatamente como estava e não grava outbox (RN-09/AC-07)`, `checkout-shopping-list.use-case.spec.ts › sem comprados não grava outbox nem exige mercado/data (AC-07/RN-09)`, integração `› 200 — sem comprados o corpo é opcional e nada vai para o outbox (RN-09)` | Sem outbox = sem evento = sem registro |
| AC-08 | **aprovado** | `lowest-price.spec.ts › lista cada item distinto com o MENOR preço por unidade; café/cafe como um único item (AC-08/AC-10)` + `› a lista completa mostra cada item com o menor preço na ordem do serviço (AC-08)` | Unit web: `lowest-price-page.spec.ts › lista cada item com o nome e o menor preço em R$, na ordem do serviço (AC-08/AC-10/RN-07)`; backend: `list-lowest-prices.use-case.spec.ts › une café e cafe em um item com o menor preço (AC-08, AC-10)`, `lowest-price-search.spec.ts › busca sem acento encontra o item registrado com acento (AC-09)` | Comparação RN-06/CD-05 provada nos dois lados |
| AC-09 | **aprovado** | `lowest-price.spec.ts › busca por nome: \`cafe\` acha \`café\` (envia o q), sem resultado mostra empty de busca e Limpar busca volta à lista (AC-09)` | Unit web: `lowest-price-page.spec.ts › busca sem resultado mostra o empty de busca distinto, com "Limpar busca" (AC-09)`, `› digitar dispara a busca com debounce, envia o termo e não filtra no cliente (AC-09)`; backend: `price-history.controller.spec.ts › 200 — \`q=cafe\` encontra o registrado como \`café\` (AC-09)` e `› 200 — \`q\` sem resultado devolve lista vazia (empty de busca, AC-09)` | O E2E assere o `q` enviado ao serviço (não filtro local) |
| AC-10 | **aprovado** | Mesmo teste AC-08/AC-10: duas compras de café (R$ 10,00 e R$ 7,50) exibem **R$ 7,50** em um único item | Unit web: `lowest-price-page.spec.ts › lista cada item… (AC-08/AC-10/RN-07)` + `price-history-store.spec.ts › aplica os itens do serviço sem agregar ou calcular no cliente (AC-08/AC-10)`; backend: `lowest-prices.spec.ts › expõe o menor preço por unidade, sem média nem último preço (AC-10)` | Sem média/último/tendência (fora de escopo da spec) |
| AC-11 | **aprovado** | `history.spec.ts › lista as compras … e abre o detalhe com os itens (AC-06/AC-11)` | Unit: `history-page.spec.ts › tocar numa compra abre o detalhe daquela compra (AC-11)`; `history-detail-page.spec.ts › mostra data, mercado e os itens comprados daquela conclusão (AC-11)` e `› o voltar retorna à lista do histórico (AC-11)`; backend: `get-purchase.use-case.spec.ts › devolve o detalhe com data, mercado e itens da compra` | — |
| AC-12 | **aprovado** | `history.spec.ts › sem compras, o Histórico mostra empty state rico com uma única primary (AC-12/AC-19)` + `lowest-price.spec.ts › sem preços, o Menor preço mostra empty state rico com uma única primary (AC-12/AC-19)` | Unit: `history-page.spec.ts › sem compras, mostra o empty state rico com um único CTA primary (AC-12)`; `lowest-price-page.spec.ts › sem itens de preço, mostra o empty de lista com um único CTA primary (AC-12)` | Nunca área de conteúdo em branco |
| AC-13 | **aprovado** | `history.spec.ts › primeira carga mostra skeleton na forma do conteúdo, nunca spinner sozinho (AC-13)` + `lowest-price.spec.ts › primeira carga mostra skeleton na forma das linhas nome+preço (AC-13)` | Unit: `history-page.spec.ts › busca as compras ao entrar e mostra o skeleton na forma da lista (AC-13)`; `history-detail-page.spec.ts › … skeleton na forma do detalhe (AC-13)`; `lowest-price-page.spec.ts › … skeleton na forma das linhas (AC-08/AC-13)` | Skeleton por `role=status`, sem spinner centralizado |
| AC-14 | **aprovado** | 5 jornadas: `history.spec.ts › falha ao carregar o Histórico: erro visível e Tentar novamente refaz o GET (AC-14)`, `› falha ao carregar o detalhe: Tentar novamente repete a MESMA compra (AC-14)`, `› detalhe de compra inexistente: 404 vira erro com volta ao Histórico (AC-14)`; `lowest-price.spec.ts › falha ao carregar os menores preços: erro visível e Tentar novamente refaz o GET (AC-14)`, `› falha na busca: Tentar novamente repete a MESMA busca, não a lista completa (AC-14)` | Unit: `price-history-store.spec.ts › falha vira erro visível e a nova tentativa refaz o GET (AC-14)`, `› 404 vira erro e repetir sem id refaz o GET da seleção (AC-14)`, `› erro + repetir sem termo refaz a MESMA busca (AC-14)` + specs das 3 telas | Retry refetcha a chamada correta (mesma query/seleção) |
| AC-15 | **aprovado** | `checkout.spec.ts › falha de rede ao concluir com mercado/data preenchidos: toast persistente, digitado preservado, lista intacta e nova tentativa funciona (AC-15)` — **POST real derrubado com `failNext`**; + `purchase.spec.ts › falha de rede ao marcar/concluir…` (prova fraca corrigida na T-22: toast anterior dispensado, mercado preenchido, 1 POST) | Unit: `shopping-list-store.spec.ts › falha não descarta o digitado: o payload segue intacto para a nova tentativa (AC-05)` (queda de rede real no POST: `ProgressEvent('error')` + payload `Object.freeze`); `checkout-sheet.spec.ts › erro 400 com mensagem PT mantém o sheet aberto e o digitado para nova tentativa (AC-05/AC-15)`; `shopping-list-page.spec.ts › falha ao concluir mostra o erro em toast e preserva o digitado no sheet (AC-05/AC-15)` | Broker fora **não** é falha desta conclusão (AC-05/CD-06) |
| AC-16 | **aprovado** | **N/A — não observável na UI** (matriz do `PLAN.md` §3; nenhum E2E inventado) | Backend: `ingest-purchase.use-case.spec.ts › reentrega do mesmo completionId não cria segundo registro (AC-16)`; `purchase-completed-handler.spec.ts › reentrega do mesmo completionId → ack com created false e 1 registro (AC-16/RN-11)`; **RabbitMQ real**: `rabbitmq-purchase-completed-consumer.integration.spec.ts › exchange → fila → ingest com ack; 2 publicações do mesmo completionId = 1 registro (AC-16)`; **Postgres real**: `purchase.repository.spec.ts › reentrega do mesmo completionId não duplica compra nem itens (AC-16)`; produtor: `purchase-completion.spec.ts › gera completionId distinto a cada conclusão (chave de idempotência — AC-16)` | Suíte `price-history-service` → **104/104** na minha corrida (inclui Postgres + RabbitMQ reais) |
| AC-17 | **aprovado** | **N/A — não observável na UI** (matriz do `PLAN.md` §3) | Backend: `db-ownership.spec.ts › responde 200 com o banco da lista apontando para um host morto` + `› o cliente Drizzle composto conecta no banco \`price_history\`` (T-20, lacuna fechada); `shopping-list-postgres.spec.ts` tripwire `publicTables = ['outbox_messages','shopping_list_items']` (banco da lista **sem** tabela de histórico), `› a mensageria virou módulo real e a conclusão tem o outbox como segundo colaborador`, `› 500 — violar unique(completion_id) desfaz o DELETE dos comprados (rollback real)`; produtor usa outbox + retry (ver AC-05) | Persistência depende do evento (outbox → RabbitMQ → ingest); sem client cross-DB. Guard de module boundaries ausente é pendência aceita (ver Pendências) |
| AC-18 | **aprovado** | `nav.spec.ts › sessão inválida no histórico: 401 volta ao login com returnUrl (AC-18)` (`returnUrl=/historico`, storage limpo, a chamada que gerou 401 tinha `Bearer`) | Backend: `price-history.controller.spec.ts › sem token responde 401 uniforme — %s` (3 rotas) + `› token inválido também é 401 uniforme — %s`; `jwt-auth.guard.spec.ts` (ausente/inválido/malformado/expirado/`iss` divergente) + SL `shopping-list.controller.spec.ts › %s — sem token responde 401 uniforme` (8 rotas); Unit web: `price-history-api.service.spec.ts › 401 no histórico encerra a sessão e volta ao login (AC-18)` + `auth.interceptor.spec.ts › 401 numa requisição autenticada → logout + volta ao login com returnUrl` | Endurecimento "1 caso por operação no store" = pendência opcional baixa (não bloqueia) |
| AC-19 | **aprovado** | `nav.spec.ts › viewport ~360px e desktop, tema claro/escuro, uma primary e alvos ≥44px (AC-19)` (cor lida **do token** via `usesTokenColor`, nunca literal) + empties ricos de AC-12 (única primary) | Unit: `design-tokens.smoke.spec.ts` (12 testes: 10 arquivos da superfície nova sem cor hardcoded + guard não-vácuo; **falsificado** na T-21); `checkout-sheet.spec.ts › as ações têm alvo ≥44px e a confirmação é a única primary do sheet (AC-25)`; `lowest-price-page.spec.ts › campo de busca tem rótulo visível associado (AC-09/AC-19)` | Ver checklist de design abaixo (tokens, 4 estados, mobile-first, foco/toque, erro visível, dark, hierarquia, whitespace, receita §4) |
| AC-20 | **aprovado** | `checkout.spec.ts › duplo toque em Concluir compra: rótulo Concluindo…, CTA desabilitado e uma única requisição (AC-20)` (sheet real, POST atrasado no fake) | Unit: `shopping-list-store.spec.ts › toques repetidos no CTA compartilham uma única requisição (AC-20, single-flight)` (`http.expectNone`); `checkout-sheet.spec.ts › durante o envio o CTA mostra "Concluindo…" desabilitado; toque duplo não reenvia (AC-20/AC-15)` | E2E assere `count === 1` no `POST /checkout` |
| AC-21 | **aprovado** | `nav.spec.ts › a PWA chama http://localhost:3002/api/price-history/* com Authorization (AC-21)` — URL base exata nas **3 operações** (lista, detalhe `/purchases/…`, `/lowest-prices`) + `Authorization: Bearer …` em todas | Unit: `price-history-api.service.spec.ts › lista compras em localhost:3002 com Authorization (ADR 0010 / AC-21)` e `› usa a base do token PRICE_HISTORY_API_BASE_URL no lugar do default` | ADR 0010 **Aceita** (exceção temporária CD-04); base `localhost:3002` |

Regras (ADR 0008): Superfície de UI = **sim**; **19 ACs observáveis na UI**
têm cenário Playwright citado acima e corrida real (56/56, registrada).
**AC-16 e AC-17 são backend-only** (matriz do `PLAN.md`) — evidência de
integração (coluna Playwright = N/A por definição, não por omissão).

## Checklist de documentação

- [x] **Contratos HTTP/eventos coerentes com a implementação.**
      `libs/contracts/README.md` documenta o checkout evoluído
      (`POST /api/shopping-list/checkout` com `{ market, purchaseDate }`, 200/400,
      mensagens PT), as 3 rotas do `price-history-service`
      (`GET /api/price-history/purchases`, `/purchases/{id}`, `/lowest-prices?q=`)
      e o evento `shopping-list.purchase-completed` v1 (routing key
      `shopping-list.purchase-completed.v1`, fila
      `price-history.shopping-list.purchase-completed`, idempotência por
      `completionId`) — conferindo com a tabela do `PLAN.md` e com os shapes
      assertados em `price-history.controller.spec.ts` /
      `shopping-list.controller.spec.ts`. Evento publicado só com ≥1 comprado
      (outbox), nunca com 0 (RN-09).
- [x] **ADR registrada porque houve decisão arquitetural: ADR 0010**
      (`docs/decisions/0010-excecao-temporaria-ao-gateway-price-history-service.md`
      — **Aceita**: base `http://localhost:3002`, CORS, critérios de saída,
      `PRICE_HISTORY_*`), com ponte na **ADR 0006 §1** (terceira exceção ao
      gateway) — T-01. Revisão arquitetural **Aprovada com ressalvas**
      (`ARCHITECTURE-REVIEW.md`), ressalvas incorporadas ao plano e cumpridas
      (outbox na mesma transação — rollback real provado; ack pós-ingest;
      ordem best-effort). ADRs 0007/0008 vigentes.
- [x] **README / `.env.example` atualizados (T-04).** `.env.example` traz
      `PRICE_HISTORY_DB_PASSWORD`, `PRICE_HISTORY_DATABASE_URL`,
      `PRICE_HISTORY_API_PORT=3002`, `PRICE_HISTORY_CORS_ORIGINS` (comentada) e
      a nota de uso de `RABBITMQ_URL` pelos dois serviços; `README.md` cita
      `price-history` 15 vezes (serviço, porta 3002, comandos `db:*`).
      Nenhum segredo novo.
- [x] **`docs/lessons/`** — **N/A nesta rodada**: nenhum arquivo novo (só
      `2026-10-07-setup-inicial.md`). Os aprendizados transferíveis
      (corrida de E2E de SPA acoplada ao conteúdo renderizado — T-22;
      falsificações de guard de tokens/rotas — T-21; rollback por `23505` —
      T-13) estão registrados de forma versionada nos handoffs/`STATUS.md` e
      guardados por testes. Promovê-los a lição é recomendação **não
      bloqueante** (mesmo precedente da validação da lista).
- [x] **Documentação da feature atualizada quando ambiguidades resolvidas.**
      D-01…D-04 → CD-04…CD-07 registradas na `SPEC.md`; SPEC e `PLAN.md` com a
      frase canônica `Aprovado pelo usuário em 2026-10-16`; nenhuma decisão
      aberta remanescente.
- [x] **`STATUS.md` final com próxima ação.** Esta validação **não** editou o
      `STATUS.md` (arquivo do orquestrador); o handoff ao final indica o que
      atualizar (fase → Validação aprovada; artefato VALIDATION; próxima ação
      → decisão de push/PR do usuário).

## Checklist de design (Superfície de UI = sim)

- [x] **Tokens: sem cor, espaço ou raio hardcoded.** Busca por
      `#[0-9a-fA-F]{3,8}`, `rgb(`, `hsl(` nos `.scss` de
      `features/price-history/**` e `checkout-sheet.scss`: **0 ocorrências**
      (minha execução). Guard reforçado por `design-tokens.smoke.spec.ts`
      (12 testes que leem o fonte; falsificado de verdade na T-21) e pela
      asserção E2E `usesTokenColor` (cor lida do token, nunca literal).
      Dimensionamento com `var(--space-*)`, `var(--touch-target-min)`,
      `var(--radius-*)`, `var(--font-size-*)`.
- [x] **Quatro estados** em todas as telas, cada um com evidência:
      **carregando** = skeleton (AC-13, E2E + unit nas 3 telas; checkout =
      `Concluindo…` em AC-20); **vazio** = empty state rico (AC-12, E2E + unit);
      **erro** = conteúdo + `Tentar novamente` (AC-14, 5 jornadas E2E), campo
      `aria-invalid` (AC-04) e toast persistente (AC-15); **sucesso** = lista
      (AC-06/AC-08) e toast na conclusão (AC-05).
- [x] **Mobile-first / uma coluna:** E2E AC-19 valida ~360px e desktop com
      `--container-max`; padding reserva a bottom nav; toasts acima da nav.
- [x] **Foco e toque:** alvos ≥ 44px medidos na E2E (AC-19: linhas, campo de
      busca; AC-20: CTA do sheet) e no unit (`min-height: var(--touch-target-min)`
      conferido nos `.scss`; `checkout-sheet.spec.ts` ≥44px);
      `:focus-visible` visível (regressão `load.spec.ts` AC-25 verde na mesma
      corrida).
- [x] **Erro visível na UI (nunca só no console):** campo com `aria-invalid`
      + mensagem ligada (AC-04 E2E), área de conteúdo com `Tentar novamente`
      (AC-14 E2E ×5), toast persistente até o descarte (AC-15 E2E) — RN-13.
- [x] **Modo escuro via tokens:** E2E AC-19 com
      `emulateMedia({ colorScheme: 'dark' })` lendo `--color-canvas` /
      `--color-primary-text` **do token** (verde na corrida).
- [x] **Hierarquia tipográfica:** 26 usos de
      `--font-size-h2/title/body/caption` nos `.scss` da feature (app bar título
      em h2, apoio em caption/ink-muted, linhas em body, empty state em title).
- [x] **Agrupamento por whitespace:** `gap`/`padding-block` em `--space-xxs…lg`
      nas 3 telas e no sheet (conferido nos `.scss`), hairline entre linhas —
      grupos por ritmo, não `gap` uniforme.
- [x] **Receita do tipo de tela (guia §4):** Histórico, Menor preço e detalhe
      são **lista/conteúdo** (app bar + coluna única + empty state rico com
      sticker/título/frase/CTA — E2E AC-12) e o checkout é **formulário em bottom
      sheet** nomeado pelo tipo de fluxo (`Concluir compra`), com CTA no terço
      inferior — **nenhum form/conteúdo solto no void** (anti-padrão).

## Verificações transversais

- [x] Contratos HTTP/eventos refletem a implementação (README × PLAN × specs de controller).
- [x] ADRs necessárias versionadas (0010 Aceita + ponte na 0006; revisão arquitetural aprovada com ressalvas).
- [x] Testes planejados executados e resultados registrados (seção abaixo).
- [x] **`npx nx e2e web-e2e` executado por mim** → **56 passed (33.6s)** com `--skip-nx-cache` (gate ADR 0008 reproduzido).
- [x] Checklists de documentação e de design acima completas.
- [x] Lint 0 (`web`, `web-e2e`, `shopping-list-service`, `price-history-service`) — regra `no-explicit-any` sem ocorrências.
- [x] `npx nx build web` (produção) verde com chunks lazy das 3 telas.
- [x] Nenhum segredo/credencial versionado (`git ls-files` → só `.env.example`; busca por chave privada em arquivos versionados = só texto de doc da validação anterior, falso positivo).
- [x] Árvore limpa antes e depois das corridas (`git status --porcelain` vazio).

## Pendências e ressalvas aceitas (não bloqueantes)

**Nenhuma pendência de comportamento, contrato ou arquitetura em aberto.**
Os pontos abaixo são **conhecidos e aceitos**; nenhum rebaixa um AC:

1. **Exceções ratificadas pelo usuário (2)** — (a) T-16 editou
   `apps/web-e2e/src/shopping-list/load.spec.ts` fora do escopo declarado
   (exigido por AC-01/AC-02; ratificada no chat 2026-10-17, commit da T-16);
   (b) correção de 2 testes de `checkout.spec.ts` que codificavam o
   comportamento antigo (executada em `a74b4a4`, ratificada no chat
   2026-10-17). Ambas são mudanças **em arquivos de teste** exigidas pelos ACs;
   a suíte completa está verde com elas.
2. **Pendência histórica do STATUS fechada pela T-22** — a nota "AC-15 e AC-20
   ainda sem jornada E2E" no bloco de exceção descreve o estado **pós-T-17**;
   a T-22 a acrescentou (+2 testes) e ambos passaram na minha corrida
   (`checkout.spec.ts` AC-15 e AC-20). Não há AC sem jornada.
3. **Endurecimento opcional de AC-18** (1 caso por operação no store) — hoje
   provado pelo interceptor agnóstico de URL + serviço PH + guarda JWT
   (unit) + jornada E2E. Não muda comportamento.
4. **Guard de tokens estendido** (tamanhos/cores esperados por tela) — hoje o
   smoke barre cor hardcoded e ≥44px é checado em componente + E2E.
5. **Id não-UUID em `GET /purchases/:id`** — comportamento **indefinido na
   SPEC**; se virar requisito, é decisão para o `product-spec` (contrato novo),
   não retrabalho desta rodada.
6. **Teste "HTTP 200 com broker morto"** — endurecimento opcional; AC-05 é
   provado por composição (tripwire + rollback real + publisher com retry) e
   pela jornada E2E sem broker.
7. **Guard de module boundaries ausente no eslint** (`sourceTag: '*' → '*'`)
   — AC-17 apoia-se no teste comportamental novo (`db-ownership.spec.ts`) +
   tripwire `publicTables`. Arquitetural, porém mitigado; recomendação de
   tooling separada.
8. **DLQ fora da v1** — decisão de produto registrada (handoff T-09); payload
   tóxico é descartado com log (nack sem requeue).
9. **Fake do E2E espelha a RN-06 do serviço** — paridade de tipo garantida por
   `@lista/contracts`, de comportamento pelas integrações do serviço; se a
   regra mudar, atualizar `support/price-history-fake-api.ts`.
10. **Ambiente** — RabbitMQ fora do ar na 1ª corrida (registrado acima);
    resolvido com `docker start`. Monitorar nos gates futuros.

Nada disto muda comportamento, contrato ou arquitetura: **não há devolução ao
orquestrador por lacuna e nenhum AC a reabrir.**

## Comandos executados

Todos executados por mim em 2026-10-19 na branch `feature/price-history`
(árvore limpa). Registro honesto da corrida **que falhou por ambiente** e da
re-execução verde:

```text
git status --porcelain            # → vazio (sem trabalho não commitado)
git log --oneline -40             # → todos os hashes T-01…T-22 + STATUS conferem

npx nx test web --skip-nx-cache
# Test Files 29 passed (29); Tests 278 passed (278) — 9.57s — exit 0

# 1ª corrida backend (RabbitMQ fora do ar):
npx nx test shopping-list-service --skip-nx-cache
# 1 failed | 19 passed (20 files); Tests 1 failed | 205 passed (206)
# FAIL rabbitmq-event-publisher.spec › publica no exchange domain.events… → ECONNREFUSED ::1:5672
npx nx test price-history-service --skip-nx-cache
# FAIL rabbitmq-purchase-completed-consumer.integration.spec → ECONNREFUSED :5672 (3 skipped)

docker ps -a
# lista-de-compras-postgres   Up … (healthy)
# lista-de-compras-rabbitmq   Exited (0) 43 hours ago          ← divergência do estado informado

docker start lista-de-compras-rabbitmq
# → Up (health: starting)  — pré-requisito do plano (npm run docker:up)

# Re-execução (ambiente corrigido; nada de código alterado):
npx nx test shopping-list-service --skip-nx-cache
# Test Files 20 passed (20); Tests 206 passed (206) — exit 0
npx nx test price-history-service --skip-nx-cache
# Test Files 20 passed (20); Tests 104 passed (104) — exit 0
#   (inclui RabbitMQ real: "2 publicações do mesmo completionId = 1 registro (AC-16)",
#    Postgres real e db-ownership AC-17)

npx nx e2e web-e2e --skip-nx-cache
# Running 56 tests using 6 workers → 56 passed (33.6s) — exit 0
# (18 da feature: 4 nav + 7 history + 7 lowest-price; 6 checkout (AC-03…AC-07, AC-15, AC-20);
#  38 de regressão auth/lista — todos listados na saída com os títulos citados na matriz)

npx nx lint web                   # Successfully ran target lint — 0 problemas
npx nx lint web-e2e               # 0 problemas
npx nx lint shopping-list-service # 0 problemas
npx nx lint price-history-service # 0 problemas

npx nx build web --skip-nx-cache
# Application bundle generation complete — chunks lazy history-page / history-detail-page /
# lowest-price-page — Successfully ran target build for project web
```

## Parecer

**Aprovada.** Os **21 critérios de aceite** possuem evidência executável
registrada: **19 com cenário Playwright** citado na matriz e corrida real
reproduzida por mim (`npx nx e2e web-e2e --skip-nx-cache` → **56 passed**) e
**AC-16 / AC-17** (backend-only, não observáveis na UI — matriz do `PLAN.md`)
com evidência de integração com **Postgres e RabbitMQ reais**
(`npx nx test price-history-service` → **104/104**;
`npx nx test shopping-list-service` → **206/206**). O gate da ADR 0008 está
satisfeito (comando + resultado no handoff T-22 e nesta seção). O `STATUS.md`
confere com o repositório (hashes, árvore limpa, nenhum AC/T reaberto). As
checklists de documentação e de design estão completas; contratos, ADR 0010,
revisão arquitetural, README/`.env.example` e segurança transversal (sem
segredo versionado) foram conferidos. As 2 exceções ratificadas e as
pendências de baixa prioridade foram analisadas e **nenhuma** constitui
pendência de comportamento, contrato ou arquitetura — **nenhum AC a reabrir**.
A única ocorrência anormal foi de **ambiente** (RabbitMQ parado), resolvida
sem tocar em código. Push/PR/merge permanecem decisão do usuário.

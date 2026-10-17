# Estado da feature — Histórico de preços

**Fase atual:** Implementação
**Gate atual:** plano fechado — `Aprovado pelo usuário em 2026-10-16`; revisão arquitetural **Aprovada com ressalvas**; ADR 0010 **Aceita**
**Última atualização:** 2026-10-17
**Próxima ação:** onda 12 — delegar **T-21** (auditoria unitária PWA, `test-engineer`) sozinha; dependências T-17/T-18/T-19 satisfeitas. Depois a onda 13 — **T-22** (E2E Playwright), gate de UI antes do `feature-validator` (ADR 0008).

## Artefatos

- Spec: `docs/features/price-history/SPEC.md` — **aprovada** (`Aprovado pelo usuário em 2026-10-16`)
- Plano: `docs/features/price-history/PLAN.md` — **aprovado** (`Aprovado pelo usuário em 2026-10-16`)
- ADR 0010: **Aceita**
- Revisão arquitetural: **Aprovada com ressalvas** (`ARCHITECTURE-REVIEW.md`)
- Validação: pendente

## Execução

- Branch: `feature/price-history`
- Tarefas concluídas e commitadas:
  - **T-01** (`69ce52d`) — ADR 0010 + ponte na ADR 0006
  - **T-02** (`457f4f1`) — contratos HTTP + evento v1 (`libs/contracts`)
  - **T-03** + **T-04** (`cf997bf`) — scaffold `price-history-service` + env/README
  - **T-05** (`ae5d4ec`) — domínio PH (AC-08, AC-09, AC-10)
  - **T-10** (`6a3f425`) — domínio checkout SL (AC-03, AC-04, AC-05, AC-07, AC-16)
  - **T-06** (`2676397`) — persistência PH (AC-06, AC-11, AC-16, AC-17)
  - **T-11** (`a17b14b`) — outbox SL (AC-05, AC-07, AC-16, AC-17 — base)
  - **T-07** (`fa16503`) — casos de uso PH (AC-06, AC-08–AC-12, AC-16)
  - **T-12** (`dbe340a`) — checkout + publisher SL (AC-05, AC-07, AC-16, AC-17)
  - **T-08** (`903d5d8`) — borda HTTP PH (AC-06, AC-08–AC-12, AC-14, AC-18, AC-21)
  - **T-13** (`54368c2`) — HTTP checkout SL + wiring (AC-04, AC-05, AC-07; rollback 23505 fecha pendência da T-11)
  - **T-09** (`9ea5e66`) — consumidor RabbitMQ PH (AC-06, AC-16, AC-17, RN-02, RN-11)
  - **T-14** (`db7966f`) — camada de dados PWA do histórico (AC-21, AC-18, AC-14, AC-12, AC-13)
  - **T-15** (`1ade4b2`) — API e store do checkout no PWA (AC-03, AC-04, AC-05, AC-07, AC-15, AC-20 — camada)
  - **T-16** (`a995c07`) — bottom nav + rotas /historico, /menor-preco (AC-01, AC-02, AC-19 nav)
  - **T-17** (`c810aee`) — checkout sheet com Mercado\* e Data\* (AC-03–AC-05, AC-07, AC-15, AC-19, AC-20) + correção E2E ratificada (`a74b4a4`)
  - **T-18** (`cbe8ea1`) — telas Histórico + detalhe (AC-01, AC-06, AC-11–AC-14, AC-19)
  - **T-20** (`3e0d298`) — auditoria backend: mapa AC→teste + lacuna AC-17 preenchida (104 testes PH)
  - **T-19** (`a24e633`) — tela Menor preço com busca por nome (AC-02, AC-08–AC-10, AC-12–AC-14, AC-19)
- Tarefa em andamento: nenhuma (aguarda onda 12: **T-21** sozinha)
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma
- **Exceção ratificada nº 2 (2026-10-17, chat):** após a T-17, 2 testes de `apps/web-e2e/src/shopping-list/checkout.spec.ts` (arquivo da T-22) ficaram vermelhos por codificarem o comportamento antigo do resumo (sem mercado/data). Usuário **ratificou** a correção; executada pelo `test-engineer` e commitada em `a74b4a4` (jornada agora preenche mercado/data; AC-04 como perna da jornada; caso 0 comprados no teste existente). Pendência conhecida da T-22: AC-15 e AC-20 ainda sem jornada E2E; observação sobre `purchase.spec.ts:179` registrada no handoff T-17-e2e.
- **Exceção ratificada (2026-10-17, chat):** a T-16 editou `apps/web-e2e/src/shopping-list/load.spec.ts` (arquivo da T-22, fora do escopo declarado) — o teste afirmava o comportamento antigo da nav (abas desabilitadas "em breve"); a mudança era exigida pelos AC-01/AC-02 e sem ela a suíte E2E ficaria vermelha. O subagente alegou autorização que não passou pelo orquestrador; **aceita e ratificada pelo usuário** — registrado no commit da T-16 e aqui.

## Pendências e bloqueios

- Nenhum. Suíte do SL 206/206; PH **104/104**; web **263/263**; **E2E 36/36**; lint 0 em todos os escopos (revalidado pelo orquestrador após a onda 11: `nx test web`, `nx lint web`, `nx build web`, `nx e2e web-e2e`).
- Pendências de produto/roadmap registradas (fora do escopo das T): **DLQ** para payloads tóxicos (fora da v1, handoff T-09); **T-22** fecha a matriz AC↔E2E restante (AC-15 e AC-20 de checkout sem jornada; asserção de base `localhost:3002` + Authorization; jornadas Histórico/Menor preço) e revisa o `load.spec.ts`/`checkout.spec.ts` editados sob ratificação (ver Exceções).
- `PRICE_HISTORY_API_BASE_URL` é token injetável com default `http://localhost:3002` (ADR 0010 §3 — ponto de saída para o gateway; handoff T-14).
- Observação do handoff T-17-e2e: `purchase.spec.ts:179` tem perna "falha ao concluir" que hoje passa mas prova fraco (validação local bloqueia antes do POST) — T-22 deve cobrir AC-15 de verdade.
- Pendências da T-20 (baixa, registradas no handoff): id malformado/não-UUID em `GET purchases/:id` é indefinido na SPEC (devolver ao product-spec se relevante); endurecimento opcional de AC-05 com teste "HTTP 200 com broker morto"; ausência de guard de module boundaries no eslint (AC-17 apoia-se no spec novo + tripwire `publicTables`).
- **Observação de processo:** o subagente da T-20 editou `STATUS.md` apesar da delegação proibir (não executou git, mas gravou o próprio handoff no STATUS). O orquestrador reconciliou o arquivo (hashes reais, T-18 confirmada como concluída — o T-20 a marcava como pendente por desconhecer o resultado paralelo). Nenhum dado foi aceito sem verificação: os gates das duas tarefas foram re-executados pelo orquestrador.

## Últimos handoffs

### T-19 — tela Menor preço (`a24e633`)

```text
Tarefa: T-19
Estado: concluída
Arquivos alterados: features/price-history/lowest-price-page.{ts,html,scss,spec} (substituíram o placeholder da T-16 em lugar; rota /menor-preco inalterada); reuso de purchase-format.ts (T-18), sem ajuste nele
ACs cobertos: AC-02 (título "Menor preço" via ShellChromeService), AC-08 (nome + menor preço em R$, ordem do serviço), AC-09 (busca vai como q ao serviço, debounce 300ms, zero filtro no cliente), AC-10 (busca vazia → lista completa), AC-12 (empty de lista vazia), AC-13 (empty distinto de busca sem resultado), AC-14 (erro + Tentar novamente refaz a MESMA query via loadLowestPrices() sem argumento), AC-19 (tokens, alvos ≥44px, label no campo, uma primary)
Testes executados: web → 27 arquivos, 263/263 (eram 253); lint 0; build verde (chunk lazy lowest-price-page); e2e → 36/36 (sem regressão)
Decisões registradas: Subject + debounceTime(300) + takeUntilDestroyed para a busca (sem filtro local); busca vazia chama loadLowestPrices('') explícita; dois empties visualmente distintos (lista vs busca) com ação coerente; erro reusa o bloco padrão com retry sem argumento; formatUnitPrice de purchase-format reusado; web-e2e intocado (jornadas são da T-22)
Pendências: nenhuma no escopo; jornada E2E de menor preço fica com a T-22
Próximo passo recomendado: onda 12 — T-21 (auditoria unitária PWA) sozinha
```

### T-18 — telas Histórico + detalhe (`cbe8ea1`)

```text
Tarefa: T-18
Estado: concluída
Arquivos alterados: features/price-history/{history-page, history-detail-page}.{ts,html,scss,spec} (substituíram os placeholders em lugar, rotas inalteradas); purchase-format.ts + spec (data DD/MM/AAAA, quantidade, R$ — sem Intl, determinístico)
ACs cobertos: AC-01 (título via ShellChromeService), AC-06 (data+mercado na ordem do serviço — RN-08), AC-11 (linha abre detalhe; voltar aria-label em todos os estados; clearPurchase no destroy — RN-19), AC-12 (empty rico com 1 primary), AC-13 (skeleton na forma do conteúdo, role=status), AC-14 (erro + Tentar novamente refaz o GET; 404 no mesmo bloco), AC-19 (tokens, ≥44px, aria-labels)
Testes executados: web → 26 arquivos, 253/253 (eram 238); lint 0; build verde (chunks lazy history-page/history-detail-page); e2e → 36/36
Decisões registradas: data como linha primária com legenda "mercado · N itens"; linha é <a [routerLink]> com min-height 44px e margem inline negativa; sem Intl (determinismo em CI); voltar dentro do conteúdo (shell sem slot à esquerda, layout/ fora do escopo); 404 exibe a mensagem do serviço no bloco de erro padrão; retry do detalhe sem id (store repete a última seleção); route.snapshot.paramMap (fluxo sempre lista→detalhe)
Pendências: nenhuma no escopo; web-e2e intocado (jornadas de histórico são da T-22)
Próximo passo recomendado: onda 11 — T-19 (sequencial por compartilhar a pasta)
```

### T-20 — auditoria backend (`3e0d298`; handoff completo em `handoff-T-20.md`)

```text
Tarefa: T-20 (Auditoria backend)
Estado: concluída e commitada (`3e0d298`)
Arquivos alterados: apps/price-history-service/src/app/db-ownership.spec.ts (novo — 2 testes de AC-17; nenhuma linha de produção tocada); docs/features/price-history/handoff-T-20.md
ACs cobertos: AC-03, AC-04, AC-05, AC-06, AC-07, AC-16, AC-17 e AC-18 (backend, 401) + contratos HTTP — mapa AC→teste completo no handoff. ACs observáveis só na UI (AC-01/AC-02, AC-05…AC-15, AC-19…AC-21 e a parte PWA de AC-18) ficam com a T-22.
Testes executados: npx nx test shopping-list-service --skip-nx-cache → 20 arquivos, 206/206; npx nx test price-history-service --skip-nx-cache → 20 arquivos, 104/104 (era 19/102); npx vitest run src/app/db-ownership.spec.ts → 2/2; npx eslint apps/shopping-list-service/src apps/price-history-service/src → 0 problemas; npx tsc -p apps/price-history-service/tsconfig.spec.json --noEmit → exit 0
Decisões registradas: T-20 é auditoria backend (Playwright é da T-22; sem E2E para ACs backend-only); única lacuna preenchida = AC-17 no lado PH (item nomeado no PLAN: "ausência de DATABASE_URL do shopping-list / sem client cross-DB"), com o menor teste comportamental (AppModule real + DATABASE_URL do shopping-list em host morto → GET /purchases 200) e o cliente Drizzle preso ao banco price_history; não adicionado teste redundante de "broker fora" (AC-05 provado por composição: CheckoutShoppingListUseCase.length === 2 + retry do publisher); nenhum comportamento inventado (o HTTP do PH não define 400 nem paginação na SPEC)
Pendências: (baixa) id malformado/não-UUID em `GET purchases/:id` é indefinido na SPEC (Postgres real daria 500) — devolver ao product-spec; (baixa, opcional) 1 teste de integração "HTTP 200 com RABBITMQ_URL morto" para AC-05; (baixa) sem guard de module boundaries (eslint permissivo) — AC-17 apoia-se no spec novo + tripwire `publicTables`
Próximo passo recomendado: T-18 (telas Histórico) e, na sequência, T-19/T-21/T-22; a T-22 roda `npx nx e2e web-e2e` e fecha o gate de UI
```

### T-17 — checkout sheet (`c810aee`) + correção E2E (`a74b4a4`)

```text
Tarefa: T-17 (checkout sheet) + correção E2E ratificada
Estado: concluída
Arquivos alterados: features/shopping-list/checkout-sheet.{ts,html,scss,spec} (campos Mercado*/Data*, validação local PT, confirming via concluding, tokens GUIA); shopping-list-page.spec.ts (só specs — página não mudou); apps/web-e2e/src/shopping-list/checkout.spec.ts (correção ratificada, feita pelo test-engineer)
ACs cobertos: AC-03 (campos com comprados, hoje pré-preenchido, max=today), AC-04 (vazio/futuro/inválido → erro no campo + 0 requisição), AC-05 (erro preserva digitado + toast), AC-07/RN-09 (0 comprados → sem campos, checkout(null)), AC-15 (sheet aberto + mensagem + retry), AC-19 (labels, aria-invalid, role=alert, tokens, primary única), AC-20 (Concluindo… + disabled + 1 request)
Testes executados: web → 238/238; lint 0; build verde; e2e → 36/36 (correção dos 2 vermelhos que codificavam o comportamento antigo)
Decisões registradas: validação só após submit (submitted); mensagens PT espelham o backend; data futura comparada como texto + isCalendarDate rejeita 2026-02-31; localDateString() exportada p/ specs; single-flight redundante de propósito (store + guard); AC-04 como perna da jornada E2E (sem teste novo); caso 0-comprados no teste existente (sem duplicar); todayLocal() no spec E2E em vez de importar o componente (Playwright não deve puxar @angular/core)
Pendências: T-22 fecha matriz AC-15/AC-20 e revisa purchase.spec.ts:179 (prova fraca de falha de checkout)
Próximo passo recomendado: onda 10 — T-18 ∥ T-20
```

### T-16 — bottom nav + rotas (`a995c07`)

```text
Tarefa: T-16
Estado: concluída (com exceção de escopo ratificada pelo usuário — ver Execução)
Arquivos alterados: app.routes.ts (3 rotas filhas lazy sob authGuard: historico, historico/:id, menor-preco; / segue Lista); layout/bottom-nav/{ts,html,scss,spec} (abas viram <a routerLink> com routerLinkActive + aria-current; removidos :disabled e "em breve"); features/price-history/{history-page, history-detail-page, lowest-price-page}.{ts,html,scss} (placeholders mínimos navegáveis, lazy chunks); apps/web-e2e/src/shopping-list/load.spec.ts (fora de escopo — atualizado ao novo comportamento da nav; aprovado no chat 2026-10-17)
ACs cobertos: AC-01, AC-02 (abas navegam, ativas em --color-primary-text, sem "em breve"), AC-19 nav (nav aria-label, aria-current, alvos ≥44px, tokens), AC-18 (sem regressão de auth)
Testes executados: web → 232/232; lint 0; build verde (chunks lazy 3 telas); e2e → 36/36 (regressão auth/lista/shell)
Decisões registradas: Lista usa routerLinkActiveOptions exact (senão / prefixa tudo); match padrão nos filhos mantém aba Histórico ativa em /historico/:id; placeholders dentro de features/price-history/** declarados no handoff (T-18/T-19 substituem em lugar); cada placeholder contribui título no app bar via ShellChromeService; sem app.routes.spec novo (prova via hrefs da nav + chunks no build + E2E)
Pendências: placeholders temporários até T-18/T-19; load.spec.ts revisado por T-22
Próximo passo recomendado: onda 9 — T-17 (checkout sheet) sozinha
```

### T-15 — API e store do checkout PWA (`1ade4b2`)

```text
Tarefa: T-15
Estado: concluída
Arquivos alterados: features/shopping-list/data/shopping-list-api.service.ts (checkout(request?) tipado com @lista/contracts); features/shopping-list/state/shopping-list-store.ts (transporta payload, aplica resposta, sinal concluding, single-flight na chave checkout); state/shopping-list-store.spec.ts (checkout virou describe com 6 specs)
ACs cobertos: AC-03, AC-04 (POST { market, purchaseDate } literal), AC-05 (falha preserva digitado — payload congelado no spec), AC-07/RN-09 (0 comprados → corpo null), AC-15 (mensagem + preservado + retry na camada), AC-20 (1 request por duplo toque + concluding)
Testes executados: web → 232/232 (225→230 na T-15; +2 da T-16 paralela); lint 0; build verde
Decisões registradas: sucesso = aplicar a resposta do POST (sem refetch — contrato devolve a lista ativa; expectNone prova); sem trim no cliente (validação é do serviço T-13); concluding é signal dedicado (saving é contador de todas as mutações); 400 devolve a mensagem canônica do envelope sem mapear código→campo; queda de rede = releitura best-effort (padrão AC-23); sem spec próprio do serviço HTTP (wire provado nos specs do store)
Pendências: checkout-sheet.ts (T-17) ainda chama store.checkout() sem payload — T-17 passa { market, purchaseDate } e usa concluding; spec "não pede mercado nem data" é da T-17
Próximo passo recomendado: onda 9 — T-17 sozinha
```

### T-14 — camada de dados PWA do histórico (`db7966f`)

```text
Tarefa: T-14
Estado: concluída
Arquivos alterados: core/price-history/{price-history-config, price-history-api.service, price-history-api.service.spec, index}; features/price-history/{data/index, state/price-history-store, state/price-history-store.spec, state/index} (todos novos)
ACs cobertos: AC-21 (URL literal localhost:3002 + Authorization via authInterceptor), AC-18 (401 → logout + /login com returnUrl), AC-14 (refetch repete última seleção/busca), AC-12/AC-13 (estados loading/loaded/error), AC-06/AC-11 (payload aplicado sem reordenar), AC-08–AC-10 (consumo puro, busca como query q); AC-01/AC-02 observáveis só com T-16/T-18
Testes executados: web → 23 arquivos, 225/225 verdes (20 novos); lint 0; build production verde
Decisões registradas: base como token injetável `PRICE_HISTORY_API_BASE_URL` com default 3002 (espelho de SHOPPING_LIST_API_BASE_URL; nome igual ao da ADR 0010 §3); store único com 3 seções em estado composto {status,data,error}; guarda de sequência por seção (última carga vence) em vez de singleFlight; `apiErrorMessage` reusado de features/shopping-list/data (extração para core/http se usuário pedir)
Pendências: nenhuma no escopo; features/price-history/data contém só barrel (serviço em core/price-history — mover se preferir espelho exato)
Próximo passo recomendado: onda 8 — T-15 ∥ T-16
```

### T-09 — consumidor RabbitMQ PH (`9ea5e66`)

```text
Tarefa: T-09
Estado: concluída
Arquivos alterados: infrastructure/messaging/{topology, purchase-completed-handler, rabbitmq-purchase-completed-consumer, purchase-completed-consumer.service, messaging.module, index} + specs (5 arquivos novos); app/app.module.ts (wiring)
ACs cobertos: AC-06, AC-16 (2× publish → 1 compra, integração RabbitMQ real), AC-17 (só PRICE_HISTORY_DATABASE_URL; nenhum client do DB shopping_list), RN-02, RN-11 (start() nunca derruba o app HTTP; backoff 1s→30s)
Testes executados: price-history-service → 19 arquivos, 102/102 verdes (18 novos); build webpack ok; eslint 0
Decisões registradas: ack só após ingest OK (inclusive created=false); payload tóxico → nack sem requeue + log (DLQ fora da v1 — pendência de produto); falha transitória → nack com requeue; porta estreita MessageHandling/ConsumeDecision; PurchaseCompletedHandler provisionado no MessagingModule com PurchaseRepositoryModule (decisão do handoff T-08); prefetch(1); corte VITEST no ciclo de vida p/ specs HTTP não disputarem a fila durable; integração com filas únicas + deleteQueue
Pendências: DLQ fora da v1; STATUS intocado (escopo)
Próximo passo recomendado: onda 8 — T-15 ∥ T-16
```

### T-13 — HTTP checkout SL + wiring (`54368c2`)

```text
Tarefa: T-13
Estado: concluída
Arquivos alterados: src/api/http/shopping-list/{controller, request, messages, errors, module, controller.spec}; src/integration/shopping-list-postgres.spec.ts
ACs cobertos: AC-04, AC-05, AC-07 (lado HTTP/serviço); pré-requisito de AC-15/AC-20 (UI nas ondas seguintes)
Testes executados: controller.spec → 73/73; integração Postgres → 19/19; suíte completa → 20 arquivos, 206/206 verdes; build webpack ok; eslint 0 problemas (verificado novamente pelo orquestrador antes do commit)
Decisões registradas: borda não valida — repassa corpo cru ao domínio (RN-03 só exige market/purchaseDate com ≥1 comprado; RN-09 mantém corpo omitido); mensagens PT por código de validação (Record<CheckoutValidationError, string>); wiring no ShoppingListModule (importa OutboxRepositoryModule + MessagingModule → publisher no grafo, checkout não fala com broker); tripwires reescritos sem afrouxar ACs (mensageria virou módulo real; CheckoutShoppingListUseCase.length === 2); rollback transacional provado: violação 23505 no INSERT do outbox desfaz o DELETE dos comprados (fecha pendência da T-11)
Pendências: nenhuma no escopo; rota de histórico permanece 404 nesta rodada (é do price-history-service)
Próximo passo recomendado: onda 7 — T-09 (consumidor RabbitMQ PH) ∥ T-14 (camada de dados PWA)
```

### T-12 — checkout + publisher SL (`dbe340a`)

```text
Tarefa: T-12
Estado: concluída
Arquivos alterados: application/use-cases/checkout-shopping-list.use-case.ts (DELETE+INSERT no outbox na mesma transação, envelope com eventId/occurredAt); checkout-shopping-list.use-case.spec.ts (re-escrito com InMemoryOutboxRepository); testing/in-memory-outbox-repository.ts (novo); infrastructure/messaging/index.ts, messaging.module.ts, outbox-publisher.ts, outbox-publisher.service.ts, rabbitmq-event-publisher.ts, topology.ts, specs (outbox-publisher.spec.ts, outbox-publisher.service.spec.ts, rabbitmq-event-publisher.spec.ts); barrels atualizados conforme necessário
ACs cobertos: AC-05, AC-07, AC-16, AC-17
Testes executados: npx nx test shopping-list-service -- use-cases → 6 arquivos, 38 testes, 0 falhas; npx nx test shopping-list-service -- messaging → 3 arquivos, 7 testes, 0 falhas (inclui integração com RabbitMQ real); npx nx build shopping-list-service → webpack compiled; npx eslint apps/shopping-list-service/src → 0 problemas. npx nx test shopping-list-service → 20 arquivos, 191 testes, 3 falhas — todas fora do escopo da T-12: (1) src/api/http/shopping-list/shopping-list.controller.spec.ts (comportamento antigo — T-13), (2) src/domain/shopping-list-errors.ts (TS2339 relacionado à tipagem) e (3) src/integration/shopping-list-postgres.spec.ts (500 inesperado por controller não adaptado e tripwire "mensageria é esqueleto" — T-13)
Decisões registradas: atomicidade DELETE+INSERT via deletePurchasedAndEnqueue (T-11); attempts = tentativas que falharam; sucesso limpa last_error e seta published_at; publisher best-effort (at-least-once), nack/requeue no consumidor T-09; não espera broker na resposta HTTP; persistent delivery; messageId/eventType/eventVersion; exchange domain.events (topic, durable), routing key shopping-list.purchase-completed.v1
Pendências (fora de escopo, para T-13): (a) atualizar ShoppingListController para nova API do use case (ou adaptar), (b) incluir CheckoutValidationError em shopping-list-errors para mapeamento PT, (c) fornecer OutboxRepository/EventPublisher/MessagingModule no ShoppingListModule, (d) ajustar tripwires nos specs de integração e controller (CheckoutShoppingListUseCase.length, mensageria deixa de ser esqueleto).
Próximo passo recomendado: T-13 — HTTP checkout SL + wiring (e T-08 — HTTP PH em paralelo).
```

### T-07 — casos de uso PH (`b301a23`)

```text
Tarefa: T-07
Estado: concluída
Arquivos alterados (apenas application/use-cases/** + application/index.ts): ingest-purchase.use-case.ts+spec, list-purchases.use-case.ts+spec, get-purchase.use-case.ts+spec, list-lowest-prices.use-case.ts+spec, testing/in-memory-purchase-repository.ts, testing/purchase-fixtures.ts; application/index.ts inalterado
ACs cobertos: AC-06, AC-08–AC-12, AC-16
Testes executados: npx nx test price-history-service → 13 arquivos, 64 testes, 0 falhas (49 anteriores + 15 novos); npx nx test price-history-service -- use-cases → 4 arquivos, 15 testes, 0 falhas; build → webpack ok; eslint → 0 problemas; tsc spec → 0 erros
Decisões registradas: ingest retorna ok/created/error (created:false = reentrega idempotente, sem exceção); createdAt = ISO da ingestão; detalhe inexistente → null (borda mapeia 404); query q vazia devolve lista completa
Pendências: T-08 consome os 4 use-cases; T-09 consome IngestPurchaseUseCase
Próximo passo recomendado: T-08 — borda HTTP PH
```

### T-06 — persistência PH (`2676397`)

- Ver handoff em `docs/features/price-history/handoff-T-06.md`.

### T-11 — outbox SL (`a17b14b`)

- Ver handoff em `docs/features/price-history/handoff-T-11.md`.

## Nota de retomada (2026-10-16)

- `STATUS.md` reconstituído corretamente após edições com encoding corrompido (reescrito com UTF-8).
- PH: `npx nx test price-history-service` → 64/64 verdes. SL: in-scope T-12 verde (use-cases 38/38, messaging 7/7), 3 falhas da suíte completa registradas como fora de escopo para T-13 (ratificadas no handoff).
- Commits T-07 (`b301a23`) e T-12 (`dbe340a`) pelo orquestrador nesta retomada; handoffs versionados.
- Próxima ação: delegar **T-08 ∥ T-13**.
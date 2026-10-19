Tarefa: T-20 (Auditoria backend)
Estado: concluída
Escopo: auditoria de testes **backend** do price-history (deps T-08/T-09/T-13). A feature tem Superfície de UI = sim (ADR 0008), mas a matriz AC↔E2E do PLAN dá Playwright às ondas de front; a evidência Playwright dos ACs observáveis na UI é da **T-22** (não executada aqui). Esta tarefa mapeia e completa só a evidência backend, conforme a linha T-20 do PLAN (`npx nx test shopping-list-service`; `npx nx test price-history-service`).

Arquivos alterados:
- apps/price-history-service/src/app/db-ownership.spec.ts (novo): 2 testes de **AC-17**. Sobe o `AppModule` **real** (sem substituir `PurchaseRepository`, ao contrário do spec de borda HTTP): com `DATABASE_URL` — a variável do shopping-list — apontando para um host morto, `GET /api/price-history/purchases` responde **200**; e o único cliente Drizzle do grafo conecta no banco `price_history`. Nenhuma linha de produção foi tocada.

ACs cobertos: AC-03, AC-04, AC-05, AC-06, AC-07, AC-16, AC-17 e AC-18 (parte backend, 401) + contratos HTTP. Os ACs observáveis apenas na UI (AC-01/AC-02, AC-05…AC-15, AC-19…AC-21 e a parte PWA de AC-18) ficam com a T-22.

Mapa AC → evidência executável (arquivo → título exato do teste):

AC-03 (sheet com Mercado obrigatório / Data de hoje, sem futura) — observável na UI (T-22); contribuição backend:
- apps/shopping-list-service/src/domain/checkout-validation.spec.ts → "aceita mercado e data hoje ou passados, com mercado aparado"; "recusa data futura e aceita a data de hoje (AC-04/CD-07)"
- contrato `CheckoutShoppingListRequest` em libs/contracts/src/http/shopping-list.ts (auditado; shape do corpo do checkout).

AC-04 (mercado vazio/só espaços ou data futura → 400; nada sai, nenhum evento, nenhum registro) — observável na UI (T-22); backend:
- apps/shopping-list-service/src/api/http/shopping-list/shopping-list.controller.spec.ts → `it.each(invalidCheckoutBodies)` "400 — checkout inválido (%s) usa o envelope canônico, nada sai da lista e não grava outbox (AC-04)" — 9 casos (corpo ausente; mercado ausente/vazio/só espaços; data ausente/vazia/inválida/fora do formato/futura)
- apps/shopping-list-service/src/application/use-cases/checkout-shopping-list.use-case.spec.ts → `it.each([...])` "com comprados e entrada inválida devolve $code sem tocar na lista (AC-04)" — 4 códigos
- apps/shopping-list-service/src/domain/checkout-validation.spec.ts → "recusa mercado vazio, só espaços ou não texto (AC-04)"; "recusa data ausente"; "recusa data fora do formato YYYY-MM-DD ou impossível no calendário"; "valida mercado antes da data (ordem dos campos do contrato)"
- apps/shopping-list-service/src/domain/purchase-completion.spec.ts → "≥1 comprado com mercado só espaços ou data futura: invalid, sem payload (AC-04)"
- apps/shopping-list-service/src/integration/shopping-list-postgres.spec.ts → "400 — mercado/data inválidos param antes de qualquer escrita no banco"

AC-05 (confirma com mercado/data válidos: só comprados saem; outbox na mesma transação; broker fora não bloqueia) — observável na UI (T-22); backend:
- apps/shopping-list-service/src/api/http/shopping-list/shopping-list.controller.spec.ts → "200 — remove (hard delete) só os comprados, devolve os pendentes e grava o outbox (AC-05)"
- apps/shopping-list-service/src/application/use-cases/checkout-shopping-list.use-case.spec.ts → "com comprados grava o DELETE e o outbox na mesma operação atômica (AC-05)"; "o envelope leva completionId, mercado trimado, data e itens comprados (AC-05)"
- apps/shopping-list-service/src/domain/purchase-completion.spec.ts → "válido: completionId UUID + payload só com os comprados (AC-05/AC-16)"
- apps/shopping-list-service/src/integration/shopping-list-postgres.spec.ts → "200 — o corpo vira o evento: mercado trimado, data e itens comprados no outbox"; "remove fisicamente os comprados e não deixa dado de compra consultável"; "500 — violar unique(completion_id) desfaz o DELETE dos comprados (rollback real)"
- apps/shopping-list-service/src/infrastructure/persistence/drizzle/repository/outbox.repository.spec.ts → "grava a mensagem pendente junto com a remoção dos comprados"
- apps/shopping-list-service/src/infrastructure/messaging/outbox-publisher.spec.ts → "publica pendentes mais antigas e marca published_at (CD-06)"; "em falha grava attempts e last_error e re-tenta depois (retry)"; "não bloqueia o lote em falha de um item (best-effort)"; "publica com a routing key correta (domain.events/topic)"
- apps/shopping-list-service/src/infrastructure/messaging/rabbitmq-event-publisher.spec.ts → "publica no exchange domain.events com routing key e recebe confirm"
- independência do broker: apps/shopping-list-service/src/integration/shopping-list-postgres.spec.ts → "a mensageria virou módulo real e a conclusão tem o outbox como segundo colaborador" (`CheckoutShoppingListUseCase.length === 2` — o broker não é colaborador do caso de uso) + o ciclo do publisher é um serviço à parte (retry acima).

AC-06 (após o consumo, a compra aparece no Histórico com a mesma data/mercado; detalhe lista todos os itens) — observável na UI (T-22); backend:
- apps/price-history-service/src/api/http/price-history/price-history.controller.spec.ts → "200 — lista mais recente primeiro no shape exato do contrato"; "200 — detalhe com data, mercado e itens comprados"
- apps/price-history-service/src/application/use-cases/list-purchases.use-case.spec.ts → "lista as compras da mais recente para a mais antiga, com itemCount (AC-06)"
- apps/price-history-service/src/application/use-cases/ingest-purchase.use-case.spec.ts → "persiste a compra do payload válido com nome normalizado (RN-06)"
- apps/price-history-service/src/infrastructure/messaging/purchase-completed-handler.spec.ts → "evento válido → ack com created true e a compra fica no repositório"
- apps/price-history-service/src/infrastructure/messaging/rabbitmq-purchase-completed-consumer.integration.spec.ts → "exchange → fila → ingest com ack; 2 publicações do mesmo completionId = 1 registro (AC-16)"
- apps/price-history-service/src/infrastructure/persistence/drizzle/repository/purchase.repository.spec.ts → "insere compra nova e o detalhe faz round-trip completo"; "findAllWithItems devolve todas as compras com os itens agregados"
- apps/price-history-service/src/application/use-cases/get-purchase.use-case.spec.ts → "devolve o detalhe com data, mercado e itens da compra"

AC-07 (sem nenhum comprado: lista igual, sem campos mercado/data exigidos, sem registro e sem evento) — observável na UI (T-22); backend:
- apps/shopping-list-service/src/api/http/shopping-list/shopping-list.controller.spec.ts → "200 — sem itens comprados mantém a lista exatamente como estava e não grava outbox (RN-09/AC-07)"
- apps/shopping-list-service/src/application/use-cases/checkout-shopping-list.use-case.spec.ts → "sem comprados não grava outbox nem exige mercado/data (AC-07/RN-09)"
- apps/shopping-list-service/src/domain/purchase-completion.spec.ts → "0 comprados: sem payload e sem exigir mercado/data (AC-07/RN-09)"
- apps/shopping-list-service/src/integration/shopping-list-postgres.spec.ts → "200 — sem comprados o corpo é opcional e nada vai para o outbox (RN-09)"; "concluir sem comprados não remove nada (AC-20 com banco real)"

AC-16 (reentrega do mesmo evento não cria segundo registro) — **não** observável na UI; evidência só backend:
- apps/price-history-service/src/application/use-cases/ingest-purchase.use-case.spec.ts → "reentrega do mesmo completionId não cria segundo registro (AC-16)"
- apps/price-history-service/src/infrastructure/messaging/purchase-completed-handler.spec.ts → "reentrega do mesmo completionId → ack com created false e 1 registro (AC-16/RN-11)"
- apps/price-history-service/src/infrastructure/messaging/rabbitmq-purchase-completed-consumer.integration.spec.ts → "exchange → fila → ingest com ack; 2 publicações do mesmo completionId = 1 registro (AC-16)" (RabbitMQ real)
- apps/price-history-service/src/infrastructure/persistence/drizzle/repository/purchase.repository.spec.ts → "reentrega do mesmo completionId não duplica compra nem itens (AC-16)" (Postgres real, PK)
- lado produtor/outbox: apps/shopping-list-service/src/domain/purchase-completion.spec.ts → "gera completionId distinto a cada conclusão (chave de idempotência — AC-16)"; checkout-shopping-list.use-case.spec.ts → "cada conclusão gera um completionId novo (idempotência do consumidor)"; outbox.repository.spec.ts → "completion_id duplicado é recusado pelo índice único"

AC-17 (o price-history não lê o banco do shopping-list; a persistência depende do evento, com outbox+retry no produtor) — **não** observável na UI; evidência backend:
- **[novo, lacuna preenchida]** apps/price-history-service/src/app/db-ownership.spec.ts → "responde 200 com o banco da lista apontando para um host morto"; "o cliente Drizzle composto conecta no banco `price_history`"
- apps/shopping-list-service/src/integration/shopping-list-postgres.spec.ts → "remove fisicamente os comprados e não deixa dado de compra consultável" (contém o tripwire `publicTables(db) === ['outbox_messages','shopping_list_items']`: o banco da lista **não** tem tabela de histórico); "a mensageria virou módulo real e a conclusão tem o outbox como segundo colaborador"; "não existe rota de histórico nesta rodada (404)"
- apps/price-history-service/src/infrastructure/messaging/messaging.module.spec.ts → "provisiona IngestPurchaseUseCase, handler e consumidor"; "sob Vitest não registra o ciclo de vida — specs HTTP não disputam a fila de produção"
- apps/price-history-service/src/infrastructure/messaging/rabbitmq-purchase-completed-consumer.spec.ts → "start sem RABBITMQ_URL resolve sem conectar (app HTTP não cai)"; "start com broker inacessível resolve (log + backoff) e stop cancela o retry"
- composição: apps/price-history-service/src/infrastructure/persistence/drizzle/drizzle.provider.ts resolve **só** `PRICE_HISTORY_DATABASE_URL` (auditado; é o que o spec novo prende).

AC-18 — backend 401 (a parte PWA "401 → login" é da T-22):
- apps/shopping-list-service/src/api/http/shopping-list/shopping-list.controller.spec.ts → `it.each(protectedRoutes)` "%s — sem token responde 401 uniforme" (8 rotas); "401 — token inválido também é 401 uniforme"
- apps/price-history-service/src/api/http/price-history/price-history.controller.spec.ts → `it.each(PROTECTED_ROUTES)` "sem token responde 401 uniforme — %s" (3 rotas); "token inválido também é 401 uniforme — %s"
- apps/price-history-service/src/api/http/auth/jwt-auth.guard.spec.ts → "401 uniforme com token ausente/inválido"; "401 uniforme com header Authorization malformado"; "401 uniforme com token expirado"; "401 uniforme com iss divergente"; "200 com JWT válido (mesma chave pública do auth)"
- apps/shopping-list-service/src/integration/shopping-list-postgres.spec.ts → "erros de contrato no banco real: 400/404/409/401 com envelope canônico"

Contratos HTTP (auditados como evidência):
- apps/price-history-service/src/api/http/price-history/price-history.controller.spec.ts → shapes exatos de list/detail/lowest, ordenação (mais recente primeiro, `q`), 404 canônico, 500 canônico sem detalhe interno, CORS (ADR 0010)
- apps/shopping-list-service/src/api/http/shopping-list/shopping-list.controller.spec.ts → envelope canônico 400/404/409/500 + CORS
- apps/shopping-list-service/src/integration/shopping-list-postgres.spec.ts → "percorre as 8 rotas devolvendo a lista ativa completa com o status do contrato"

Lacuna preenchida: AC-17 no lado do price-history (item nomeado no PLAN, linha "Estratégia de testes": "ausência de `DATABASE_URL` do shopping-list / sem client cross-DB"). Era o único critério backend sem teste dedicado.

Testes executados (comando + resultado, sem inferência):
- npx nx test shopping-list-service --skip-nx-cache → 20 arquivos, **206 testes, 0 falhas** (inclui Postgres e RabbitMQ reais)
- npx nx test price-history-service --skip-nx-cache → **20 arquivos, 104 testes, 0 falhas** (era 19/102 antes do spec novo; inclui Postgres `price_history` e RabbitMQ reais)
- npx vitest run --config apps/price-history-service/vitest.config.mts --run src/app/db-ownership.spec.ts → 1 arquivo, 2 testes, 0 falhas
- npx eslint apps/shopping-list-service/src apps/price-history-service/src → **0 problemas** (exit 0)
- npx tsc -p apps/price-history-service/tsconfig.spec.json --noEmit → exit 0
- Falsificação da premissa do AC-17 (garante que o 200 não é vácuo): conexão a `postgresql://…@127.0.0.1:59999/shopping_list` falha com `ECONNREFUSED` — ou seja, se o histórico dependesse desse alvo, o `GET /purchases` daria 500, não 200.

Decisoes registradas:
- T-20 é auditoria backend: não escrevi E2E para ACs backend-only (AC-16/AC-17) e não toquei Playwright (T-22). Os ACs de UI permanecem com a matriz do PLAN para as ondas de front.
- Lacuna preenchida com o **menor** teste que prova o critério: um spec comportamental (200 com o alvo do shopping-list morto) em vez de introspecção frágil; a 2ª asserção lê a `connectionString` crua do `Pool` do `pg` (que **não** popula `options.database` — verificado).
- Não adicionei teste redundante de "broker fora não falha o HTTP": a independência do broker em AC-05 é provada por composição — o `CheckoutShoppingListUseCase` tem exatamente 2 colaboradores (`CheckoutShoppingListUseCase.length === 2`) e a publicação é um serviço à parte com retry (`outbox-publisher.spec.ts`). Um teste HTTP dedicado exigiria mudar o harness de integração (que desliga a mensageria), o que é maior que uma lacuna de teste; registrado abaixo como endurecimento opcional de baixa prioridade.
- Não inventei comportamento ausente da SPEC: o HTTP do price-history não define `400` nem paginação, então nada disso foi testado (não há regra para escolher).

Pendencias:
- (baixa) `GET /api/price-history/purchases/:id` com id **malformado/não-UUID** é indefinido na SPEC: o Postgres real faria o cast e provavelmente devolveria **500** (não o 404 canônico). Não implementei nem testei — é ambiguidade de contrato a devolver ao product-spec se for relevante (sugestão: task de contrato → validar id na borda e devolver 404/400 canônico, com teste).
- (baixa, opcional) Endurecer AC-05 com 1 teste de integração "HTTP 200 com `RABBITMQ_URL` morto e outbox gravado" — hoje coberto por composição (tripwire + retry), não por teste único. Requer ajuste no harness de integração do shopping-list.
- (baixa, arquitetura) Não há guard automatizado de fronteira de módulo (o `eslint` está com module boundaries permissivo: `sourceTag: '*' → '*'`); AC-17 depende do teste comportamental novo + do tripwire `publicTables` do lado da lista.
- (informativa) DLQ fora da v1 (decisão registrada na T-09) — não é lacuna de teste.
- Playwright dos ACs observáveis na UI permanece para a T-22 (não executado nesta tarefa).

Proximo passo recomendado: T-22 (validação de UI/Playwright) quando as ondas de front (T-17–T-19) estiverem prontas, fechando o gate de implementação com `npx nx e2e web-e2e` (comando + resultado) registrado; em paralelo, levar a pendência do id malformado ao product-spec caso o time queira contrato explícito.

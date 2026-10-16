Tarefa: T-08 (borda HTTP price-history-service)
Estado: concluída
Arquivos alterados (apenas no escopo permitido `api/http/**` + `app/**` + `main.ts`):
- apps/price-history-service/src/api/http/price-history/price-history.controller.ts (reescrito — `@Controller('price-history')` com `GET purchases`, `GET purchases/:id` (null → 404) e `GET lowest-prices` com `@Query('q')`; try/catch de infra → 500 canônico com detalhe só no log; `parseSearchQuery` normaliza `q` repetida (array no Fastify) para `string`, sem `any`)
- apps/price-history-service/src/api/http/price-history/price-history.module.ts (reescrito — `imports: [PurchaseRepositoryModule]` + os 3 casos de uso via `inject: [PurchaseRepository]` + `useFactory`, mesmo padrão do `ShoppingListModule`)
- apps/price-history-service/src/api/http/price-history/price-history-errors.ts (novo — `canonicalError`, `purchaseNotFound()` e as mensagens PT `Compra não encontrada` / `Erro interno`)
- apps/price-history-service/src/api/http/price-history/price-history.controller.spec.ts (reescrito — 20 specs de integração via `app.inject`)
- apps/price-history-service/src/app/app.module.ts (`PriceHistoryModule` adicionada aos imports)
- apps/price-history-service/src/app/configure-app.ts (só comentários: o "stub mínimo da T-03" virou descrição definitiva; código de prefixo/CORS intocado)
- apps/price-history-service/src/main.ts: **inalterado** — já lia `PRICE_HISTORY_API_PORT` (3002) e delegava CORS ao `configureApp`; nenhuma mudança necessária.
- (o arquivo `price-history.exceptions.ts` criado como rascunho inicial nesta T foi removido — substituído por `price-history-errors.ts`, sem resíduo)

ACs cobertos: AC-06 (GET purchases 200 `PurchaseListResponse`, mais recente primeiro, shape exato do contrato), AC-11 (GET purchases/:id 200 com data/mercado/itens, sem vazamento de `nameNormalized`; id inexistente → 404 `{ statusCode: 404, message: "Compra não encontrada" }`), AC-08/AC-10 (lowest-prices sem `q` agrega `café`+`cafe` em um item com o menor preço — R$ 7,50 × R$ 10,00), AC-09 (`?q=cafe` encontra `café`; `q` vazia → lista completa; sem resultado → `items: []`), AC-12 (listas vazias como insumo dos empty states), AC-14 (caminho de erro de infra → 500 canônico), AC-18 (401 uniforme `{ statusCode: 401, message: "Não autorizado" }` nas 3 rotas, sem token e com token inválido — guard JWT global, ADR 0007), AC-21 (CORS preflight `OPTIONS` 204 com origem `http://localhost:4200`, `GET`/`OPTIONS` e headers `Content-Type`/`Authorization`; origem desconhecida sem header — ADR 0010). AC-01/AC-02 dependem da UI (T-16/T-18/T-19) e são apoiadas pelas rotas entregues aqui.

Testes executados:
- `npx nx test price-history-service` → 14 arquivos, 84 testes, 0 falhas (64 anteriores + 20 novos; inclui a integração com Postgres real da T-06, verde).
- `npx nx test price-history-service -- http` → 2 arquivos, 27 testes, 0 falhas.
- `npx nx build price-history-service` → webpack compiled successfully.
- `npx eslint apps/price-history-service/src` → 0 problemas (nenhum `any`).
- Extra: `npx tsc --noEmit -p apps/price-history-service/tsconfig.app.json` e `-p tsconfig.spec.json` → 0 erros.

Decisões registradas (nenhuma ADR nova — tudo dentro do plano aprovado):
- Harness de teste espelha o `shopping-list.controller.spec.ts`: `Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PurchaseRepository).useValue(repositório em memória)`, `configureApp` real (prefixo + CORS) e **JWT real** via `signTestJwt()` (par de teste da T-03) — o 401 é provado contra o guard de produção, não um mock.
- `ResettablePurchaseRepository` delega para `InMemoryPurchaseRepository` (mapa privado) com `reset(seed)` por caso, igual ao serviço vizinho; `FailingPurchaseRepository` (segundo app) prova o 500 canônico com detalhe ausente do corpo e presente no log (`Logger.overrideLogger`).
- Wiring dos casos de uso por `useFactory` (e não `useClass`): mantém os casos de uso framework-free (nenhum decorator nos use-cases) e permite `overrideProvider(PurchaseRepository)` nos specs.
- `IngestPurchaseUseCase` **não** foi registrado neste módulo: ele é do consumidor AMQP (T-09), que deve provisioná-lo no próprio módulo de `infrastructure/messaging/**` injetando `PurchaseRepository` vinda de `PurchaseRepositoryModule` (import disponível; escopos disjuntos — decisão para o T-09).
- 404/500 com envelope `{ statusCode, message }` via `NotFoundException`/`InternalServerErrorException` (padrão canônico dos serviços); 401 continua vindo do `JwtAuthGuard` existente — nenhum `@Public` nas rotas.
- `q` é `unknown` na borda e normalizado para `string | undefined` (defesa de borda: query repetida vira array no Fastify); caso de uso continua sem saber de HTTP.
- `configure-app.ts` só teve comentário atualizado (o stub "rotas em T-08" deixou de ser verdade); `main.ts` intocado.

Pendências:
- nenhuma bloqueante no escopo da T-08.
- T-09 (consumidor) deve provisionar `IngestPurchaseUseCase` no próprio módulo de mensageria (ver acima); T-20 (auditoria) pode reaproveitar os 20 specs de `price-history.controller.spec.ts` como evidência de AC-06/AC-08–AC-11/AC-18/AC-21.
- `STATUS.md` não tocado (conforme escopo) — orquestrador atualiza.

Proximo passo recomendado: T-09 — consumidor RabbitMQ (bind da fila, `PurchaseCompletedEventV1` → `IngestPurchaseUseCase`, ack após ingest OK, nack/requeue em falha transitória) em `apps/price-history-service/src/infrastructure/messaging/**` + `src/app/**`, dependente de T-07/T-02. T-08 ∥ T-13 na onda 6; T-14 (data PWA) também segue a partir daqui.

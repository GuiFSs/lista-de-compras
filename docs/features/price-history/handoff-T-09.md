Tarefa: T-09 (consumidor RabbitMQ do price-history-service)
Estado: concluída
Arquivos alterados (apenas no escopo permitido `infrastructure/messaging/**` + `app/**`):
- apps/price-history-service/src/infrastructure/messaging/topology.ts (novo — constantes `DOMAIN_EVENTS_EXCHANGE` (`domain.events`, topic, durable), `PURCHASE_COMPLETED_QUEUE` (`price-history.shopping-list.purchase-completed`, durable) e `assertConsumerTopology` que declara exchange/fila/binding com routing key `shopping-list.purchase-completed.v1`)
- apps/price-history-service/src/infrastructure/messaging/purchase-completed-handler.ts (novo — `PurchaseCompletedHandler`: parse do JSON bruto → validação do envelope `PurchaseCompletedEventV1` (tipo/versão/payload) → `IngestPurchaseUseCase`; expõe a porta estreita `MessageHandling { handle(raw): Promise<ConsumeDecision> }` e o tipo `ConsumeDecision = ack { id, created } | nack { requeue, reason, error? }` — o consumidor não conhece o caso de uso)
- apps/price-history-service/src/infrastructure/messaging/rabbitmq-purchase-completed-consumer.ts (novo — `RabbitmqPurchaseCompletedConsumer`: `start()`/`stop()`, `connect` via `RABBITMQ_URL`, `prefetch(1)`, consumo com `ack` só após decisão `ack` e `nack` conforme motivo; retry exponencial 1s→30s (reset no sucesso) para falha de conexão/broker; `start()` nunca lança)
- apps/price-history-service/src/infrastructure/messaging/purchase-completed-consumer.service.ts (novo — `PurchaseCompletedConsumerService implements StartableConsumer`, `OnModuleInit`/`OnModuleDestroy`: inicia o consumidor sem derrubar o app HTTP se broker/URL indisponíveis)
- apps/price-history-service/src/infrastructure/messaging/messaging.module.ts (novo — provisiona `PurchaseCompletedHandler` (com `PurchaseRepository` vinda de `PurchaseRepositoryModule`, decisão do handoff T-08), o consumidor e o serviço de ciclo de vida; **não registra** o serviço quando `process.env['VITEST']` está definido, para os specs HTTP não disputarem a fila de produção)
- apps/price-history-service/src/infrastructure/messaging/index.ts (novo — barrel do módulo)
- apps/price-history-service/src/app/app.module.ts (editado — `MessagingModule` adicionada aos imports)
- Specs novos (5 arquivos):
  - purchase-completed-handler.spec.ts (8 — envelope válido→ack created=true; reentrega do mesmo `completionId`→ack created=false; JSON inválido→nack sem requeue; envelope com tipo/versão errados→nack sem requeue; payload de domínio inválido→nack sem requeue; falha transitória do repositório→nack com requeue; erro inesperado do handler→nack com requeue; porta `MessageHandling` isolada do use case)
  - rabbitmq-purchase-completed-consumer.spec.ts (4 unidade — ack após ingest OK; nack sem requeue em payload inválido; nack com requeue em falha transitória; `start()` com broker fora não lança e agenda retry)
  - rabbitmq-purchase-completed-consumer.integration.spec.ts (3 com RabbitMQ real — publicar 2× o mesmo `completionId` → 1 purchase (AC-16); falha transitória → reentrega e sucesso na segunda; payload inválido → descartado sem requeue), com filas únicas `price-history.test.purchase-completed.<uuid>` e `deleteQueue` no cleanup (nunca a fila de produção)
  - messaging.module.spec.ts (2 — `MessagingModule` registra handler/consumidor; corte `VITEST` esconde o serviço de ciclo de vida)
  - purchase-completed-consumer.service.spec.ts (1 — `onModuleInit` sem `RABBITMQ_URL` loga warn e não inicia; `onModuleDestroy` para o consumidor)

ACs cobertos: AC-06 (consumo do evento publicado pelo checkout → ingestão no histórico; apoio à leitura posterior via borda HTTP da T-08), AC-16 (entrega at-least-once + idempotência por `completionId`: 2× publish do mesmo evento → 1 registro, provado na integração real), AC-17 (ingest só via evento — nenhuma conexão ou client do DB `shopping_list` no serviço; só `PRICE_HISTORY_DATABASE_URL` do próprio histórico), RN-02 (a partir do evento, persiste compra e itens com PK `completionId`) e RN-11 (conclusão da lista não depende do broker: fila durável + outbox no produtor; aqui, falha do broker nunca derruba o app HTTP).

Testes executados:
- `npx nx test price-history-service` → 19 arquivos, **102 testes, 0 falhas** (84 anteriores + 18 novos; inclui a integração com RabbitMQ real e a de Postgres da T-06, verdes).
- `npx nx build price-history-service` → webpack compiled successfully.
- `npx eslint apps/price-history-service/src` → **0 problemas** (nenhum `any`).

Decisões registradas (nenhuma ADR nova — dentro do contrato do plano §Eventos):
- **Ack só após ingest OK**: decisão `ack` vem do `ConsumeDecision` do handler (inclusive `created:false`, que é sucesso idempotente). Payload inválido (JSON/envelope/domínio) → **nack sem requeue** + log estruturado `motivo=... messageId=...` (mensagem tóxica não pode loopar; **DLQ fora da v1** — registrado como pendência de produto, fora do escopo da T). Falha transitória (repositório/broker) → **nack com requeue**, coberto pela idempotência por `completionId`. Defesa `handler-failed` (erro inesperado) → requeue.
- **`RABBITMQ_URL` ausente → warn + consumidor não inicia**; broker fora → backoff exponencial 1s→30s (reset no sucesso). `start()` nunca propaga exceção: o app HTTP (porta 3002) sobe e responde de qualquer modo — RN-11/AC-17.
- **Topologia declarada no consumidor**: `assertConsumerTopology` re-asserta exchange `domain.events` (topic, durable), fila durável e binding `shopping-list.purchase-completed.v1` a cada conexão — o consumidor é idempotente em relação ao que o produtor (T-12) também declara.
- **Porta estreita `MessageHandling`**: o consumidor só enxerga `handle(raw) → ConsumeDecision`; o handler conhece o `IngestPurchaseUseCase`. Fronteira hexagonal preservada — mensageria (infra) não importa caso de uso diretamente no consumidor.
- **`PurchaseCompletedHandler` provisionado no `MessagingModule`** com `PurchaseRepository` de `PurchaseRepositoryModule` — exatamente a decisão que o handoff T-08 deixou para a T-09.
- **`prefetch(1)`** para entrega FIFO best-effort (§Eventos: ordem best-effort em fila single).
- **Corte de teste via `VITEST`**: o `MessagingModule` não registra o serviço de ciclo de vida em execução de teste (const `isTestRun`), para os 20+ specs HTTP da T-08 (que importam o `AppModule`) não disputarem a fila durable de produção; a integração instancia o consumidor diretamente com fila única própria. `messaging.module.spec.ts` prova o corte.
- Integração real usa **filas únicas por teste + `deleteQueue` no cleanup** e sinalização de estado por `RecordingHandler.decisions` (o handler captura exceções e devolve decisão — `mock.results` de spy assíncrono é sempre `'return'`, então não é confiável para assertar nack).

Pendências:
- nenhuma bloqueante no escopo da T-09.
- **DLQ** (`dead-letter`) para payloads inválidos: fora da v1, registrar em ADR/spec se produto pedir.
- `STATUS.md` não tocado (conforme escopo) — orquestrador atualiza.

Proximo passo recomendado: T-14 (data do PWA) ou seguir a onda 7; com T-08 + T-09 prontos, T-20 (auditoria backend) já tem dependência satisfeita — evidência esperada: suítes `npx nx test shopping-list-service` + `npx nx test price-history-service` com Docker up e migrates aplicados, mapa AC→teste.

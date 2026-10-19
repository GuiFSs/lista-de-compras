Tarefa: T-12
Estado: concluída
Arquivos alterados:
- apps/shopping-list-service/src/application/use-cases/checkout-shopping-list.use-case.ts (novo: usa planPurchaseCompletion; DELETE dos comprados + INSERT no outbox na mesma chamada atômica via OutboxRepository.deletePurchasedAndEnqueue; envelope com eventId/occurredAt; 0 comprados sem outbox)
- apps/shopping-list-service/src/application/use-cases/checkout-shopping-list.use-case.spec.ts (novo: testes de use-case com InMemoryOutboxRepository, cobre AC-05/AC-07, validação, atomicidade)
- apps/shopping-list-service/src/application/use-cases/shopping-list-result.ts (estendido: adiciona erro 'checkout-validation' com CheckoutValidationError — necessário para o novo fluxo)
- apps/shopping-list-service/src/application/use-cases/testing/in-memory-outbox-repository.ts (novo: fake do OutboxRepository para testes)
- apps/shopping-list-service/src/infrastructure/messaging/topology.ts (novo: DOMAIN_EVENTS_EXCHANGE + assertPublisherTopology)
- apps/shopping-list-service/src/infrastructure/messaging/outbox-publisher.ts (novo: ciclo periódico runOnce/start/stop; retry até published_at; best-effort entre itens)
- apps/shopping-list-service/src/infrastructure/messaging/outbox-publisher.spec.ts (novo: 3 testes — publish, retry, não bloqueia lote)
- apps/shopping-list-service/src/infrastructure/messaging/rabbitmq-event-publisher.ts (novo: adapter AMQP com confirm channel, assert exchange topic/durável, routing key v1, persistent, messageId/type)
- apps/shopping-list-service/src/infrastructure/messaging/rabbitmq-event-publisher.spec.ts (novo: integração com RabbitMQ real em localhost:5672, verifica exchange/topic/durável, routing key e mensagem)
- apps/shopping-list-service/src/infrastructure/messaging/outbox-publisher.service.ts (novo: OnModuleInit/Destroy para iniciar/parar ciclo; fecha conexão na destruição)
- apps/shopping-list-service/src/infrastructure/messaging/outbox-publisher.service.spec.ts (novo: 2 testes de ciclo de vida)
- apps/shopping-list-service/src/infrastructure/messaging/messaging.module.ts (novo: provê EventPublisher (RabbitmqEventPublisher) e OutboxPublisher + OutboxPublisherService)
- apps/shopping-list-service/src/infrastructure/messaging/index.ts (atualizado: exports dos novos artefatos; mantém re-export type do envelope para compatibilidade)

ACs cobertos: AC-05, AC-07, AC-16, AC-17

Testes executados:
- npx nx test shopping-list-service -- use-cases → 6 arquivos, 38 testes, 0 falhas
- npx nx test shopping-list-service -- messaging → 3 arquivos, 7 testes, 0 falhas
- npx nx build shopping-list-service → webpack compiled successfully
- npx eslint apps/shopping-list-service/src → 0 problemas
- npx nx test shopping-list-service (suíte completa) → 20 arquivos, 191 testes, 3 falhas — todas fora do escopo:
  1. src/api/http/shopping-list/shopping-list.controller.spec.ts (controller não adaptado — T-13)
  2. src/api/http/shopping-list/shopping-list-errors.ts (TS2339: falta branch para 'checkout-validation' — T-13)
  3. src/integration/shopping-list-postgres.spec.ts (tripwire CheckoutShoppingListUseCase.length 2; tripwire messaging não mais esqueleto — T-13/T-20)

Decisoes registradas:
- Checkout não chama EventPublisher: conclusão grava outbox na mesma transação; publisher periódico publica com retry (CD-06).
- Atomicidade via deletePurchasedAndEnqueue; fake simula rollback sem efeito parcial.
- Envelope: eventId/occurredAt gerados no use case; completionId = payload.completionId (idempotência do consumidor).
- Topologia: exchange `domain.events` (topic, durable), routing key `shopping-list.purchase-completed.v1`; fila/bind do price-history-service.
- Publisher: runOnce publica lote, marca published_at no sucesso, registra attempts/last_error na falha (retry até publicar), best-effort entre itens; erro do ciclo logado, não derruba processo.
- RabbitmqEventPublisher usa confirm channel + waitForConfirms(); conexão preguiçosa, descartada em falha, fechada no shutdown.
- MessagingModule provê EventPublisher + OutboxPublisher + OutboxPublisherService (auto-start).

Pendencias:
- T-13: adaptar controller/module/errors (incluir checkout-validation → 400 com mensagens PT), atualizar useFactory para injetar OutboxRepository, atualizar testes de controller e integração (tripwires) conforme pendências já existentes.

Proximo passo recomendado: T-13 — wiring HTTP do checkout.
Tarefa: T-11
Estado: concluída
Arquivos alterados:
- apps/shopping-list-service/src/infrastructure/persistence/drizzle/schema/index.ts (tabela outboxMessages conforme PLAN + tipos de row)
- apps/shopping-list-service/src/infrastructure/persistence/drizzle/migrations/0001_youthful_texas_twister.sql (novo — migração do outbox)
- apps/shopping-list-service/src/infrastructure/persistence/drizzle/migrations/meta/0001_snapshot.json (novo)
- apps/shopping-list-service/src/infrastructure/persistence/drizzle/migrations/meta/_journal.json (entry idx 1)
- apps/shopping-list-service/src/infrastructure/persistence/drizzle/repository/outbox.repository.ts (novo — adaptador Drizzle de OutboxRepository)
- apps/shopping-list-service/src/infrastructure/persistence/drizzle/repository/outbox.repository.spec.ts (novo — integração Postgres real, 5 testes)
- apps/shopping-list-service/src/infrastructure/persistence/outbox-repository.module.ts (novo — wiring do port, pronto para a T-13 importar)
- apps/shopping-list-service/src/infrastructure/persistence/index.ts (export do módulo)
- apps/shopping-list-service/src/application/ports/outbox-repository.port.ts (novo — port + tipo OutboxMessage)
- apps/shopping-list-service/src/application/ports/event-publisher.port.ts (novo — port EventPublisher.publish(event))
- apps/shopping-list-service/src/application/ports/index.ts (exports)
- apps/shopping-list-service/src/infrastructure/messaging/index.ts (type-only export do envelope PurchaseCompletedEventV1; publisher é T-12)
- apps/shopping-list-service/src/integration/shopping-list-postgres.spec.ts (EXCEÇÃO AUTORIZADA pelo usuário em 2026-10-16: 1 asserção — lista de tabelas públicas agora aceita outbox_messages; arquivo de escopo da T-13)
ACs cobertos: AC-05, AC-07, AC-16, AC-17 (base de infraestrutura do outbox; evidência executável ponta-a-ponta dos ACs fecha na T-12/T-13)
Testes executados:
- npx nx run shopping-list-service:db:generate → migração 0001_youthful_texas_twister.sql criada (outbox_messages: 9 colunas, unique em completion_id, índice parcial "created_at WHERE published_at IS NULL") — bate com a tabela do PLAN
- npx nx run shopping-list-service:db:migrate → "migrations applied successfully"; psql \d public.outbox_messages confere colunas/índices no DB shopping_list
- npx nx test shopping-list-service → 17 arquivos, 177 testes, 0 falhas (baseline 172 + 5 novos; tripwire de mensageria Object.keys=0 segue verde com exports type-only)
- npx nx test shopping-list-service -- outbox.repository → 1 arquivo, 5 testes, 0 falhas (executado 2×, verde nas duas)
- npx tsc -p apps/shopping-list-service/tsconfig.app.json --noEmit → 0 erros; npx tsc -p apps/shopping-list-service/tsconfig.spec.json --noEmit → 0 erros
- npx nx build shopping-list-service → "webpack compiled successfully"
- npx eslint apps/shopping-list-service/src → 0 problemas (exit 0; nenhum any)
Decisoes registradas: nenhuma ADR nova (fora do escopo permitido; outbox transacional já aprovado no PLAN/ARCHITECTURE-REVIEW). Decisões de design registradas aqui: (1) payload jsonb guarda o envelope COMPLETO PurchaseCompletedEventV1 (eventId/occurredAt preservam o momento do checkout); event_type/event_version espelham o envelope para consulta sem ler jsonb; (2) attempts = tentativas que FALHARAM — sucesso só grava published_at e limpa last_error (JSDoc no port); (3) atomicidade DELETE+INSERT num único método do port deletePurchasedAndEnqueue(purchasedIds, envelope) — escolhido porque a T-12 não pode alterar ports (escopo é use-cases+messaging) e ShoppingListRepository não mudou (doubles in-memory e StaleRead fora de escopo); (4) findPending(limit?) opcional, folga para a T-12 sem editar ports; FIFO best-effort por (created_at, id); (5) barrel de infrastructure/messaging exporta SÓ tipos para manter verde o tripwire "mensageria é esqueleto" (Object.keys=0) do spec de integração; (6) drizzle-orm 0.45.3 não exporta alias int — usado integer.
Pendencias: (1) Rollback real (item comprado restaurado quando o INSERT viola unique) não é testável no spec da T-11 sem asserção de presença em shopping_list_items, que flutuaria com o truncate paralelo do spec da lista — provar na T-13 (dono de src/integration/**): forçar 23505 e assertar que o comprado persiste; (2) T-12 consome: branch ready usa planPurchaseCompletion (T-10) + deletePurchasedAndEnqueue (esta tarefa), montando envelope com eventId/occurredAt no use case; publisher lê findPending → EventPublisher.publish → markPublished/recordFailure; exchange domain.events e topo RabbitMQ ficam na T-12 (infrastructure/messaging é escopo dela); (3) T-13 wiring: importar OutboxRepositoryModule e o provider de EventPublisher no shopping-list.module e atualizar o tripwire CheckoutShoppingListUseCase.length===1 + comentários do spec de integração quando a T-12 adicionar colaboradores ao use case; (4) T-13/T-20: atualizar o comentário do tripwire de mensageria quando o publisher real existir (asserção continua correta até lá).
Proximo passo recomendado: T-12 — checkout + publisher (use case DELETE+INSERT atômico via OutboxRepository.deletePurchasedAndEnqueue; publisher periódico com retry até published_at; falha do broker não falha o HTTP).

# Estado da feature — Histórico de preços

**Fase atual:** Implementação
**Gate atual:** plano fechado — `Aprovado pelo usuário em 2026-10-16`; revisão arquitetural **Aprovada com ressalvas**; ADR 0010 **Aceita**
**Última atualização:** 2026-10-16
**Próxima ação:** onda 6 — delegar **T-08** (borda HTTP PH) ∥ **T-13** (HTTP checkout SL + wiring); dependências T-07 e T-12 concluídas (3 falhas da suíte completa do SL são fora de escopo — registradas no handoff T-12).

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
- Tarefa em andamento: nenhuma (aguarda onda 6: **T-08 ∥ T-13**)
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- Nenhum bloqueante. As 3 falhas da suíte completa do `shopping-list-service` (191 testes, 3 falhas) são **fora do escopo da T-12** e foram registradas em `docs/features/price-history/handoff-T-12.md` para serem tratadas na T-13 (wiring HTTP do checkout, mapeamento de erros de checkout e ajuste dos tripwires de mensageria/integracão).

## Últimos handoffs

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
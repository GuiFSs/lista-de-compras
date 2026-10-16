# Estado da feature — Histórico de preços

**Fase atual:** Implementação
**Gate atual:** plano fechado — `Aprovado pelo usuário em 2026-10-16`; revisão arquitetural **Aprovada com ressalvas**; ADR 0010 **Aceita**
**Última atualização:** 2026-10-16
**Próxima ação:** onda 5 — delegar **T-07** (casos de uso PH) ∥ **T-12** (checkout + publisher SL); dependências T-05/T-06 e T-10/T-11 concluídas e commitadas.

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
- Tarefa em andamento: nenhuma (aguarda onda 5: **T-07 ∥ T-12**)
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- Nenhum.

## Últimos handoffs

### T-11 — outbox shopping-list (`a17b14b`)

```text
Tarefa: T-11
Estado: concluída
Arquivos alterados: apps/shopping-list-service/src/infrastructure/persistence/drizzle/schema/index.ts (tabela outboxMessages + tipos de row); migrations 0001 + meta; repository/outbox.repository.ts + spec (integração Postgres real); outbox-repository.module.ts + index.ts; src/application/ports/outbox-repository.port.ts (port + tipo OutboxMessage); event-publisher.port.ts (EventPublisher.publish); ports/index.ts; src/infrastructure/messaging/index.ts (export type-only do envelope PurchaseCompletedEventV1); exceção fora de escopo RATIFICADA PELO USUÁRIO em 2026-10-16: 1 asserção do tripwire em src/integration/shopping-list-postgres.spec.ts (arquivo da T-13) — publicTables agora espera ['outbox_messages', 'shopping_list_items']
ACs cobertos: AC-05, AC-07, AC-16, AC-17 (base de infraestrutura do outbox; evidência ponta-a-ponta fecha na T-12/T-13)
Testes executados: npx nx run shopping-list-service:db:generate → migração 0001 (9 colunas, unique em completion_id, índice parcial WHERE published_at IS NULL); db:migrate → aplicada no DB shopping_list; npx nx test shopping-list-service → 17 arquivos, 177 testes, 0 falhas (reexecutado na retomada pelo orquestrador: 177/177 verdes); tsc app+spec 0 erros; nx build → webpack compiled; eslint 0 problemas
Decisões registradas: payload jsonb guarda o envelope COMPLETO PurchaseCompletedEventV1; event_type/event_version espelham o envelope; attempts = tentativas que FALHARAM (sucesso grava published_at e limpa last_error); atomicidade DELETE+INSERT no port deletePurchasedAndEnqueue(purchasedIds, envelope) — a T-12 consome sem alterar ports; findPending(limit?) FIFO best-effort (created_at, id); barrel de messaging exporta SÓ tipos para manter verde o tripwire "mensageria é esqueleto"; drizzle-orm 0.45.3: integer (sem alias int)
Pendências: (1) rollback real (comprado restaurado se INSERT viola unique) → provar na T-13; (2) T-12 consome planPurchaseCompletion (T-10) + deletePurchasedAndEnqueue, monta envelope, publisher lê findPending → publish → markPublished/recordFailure; exchange domain.events na T-12; (3) T-13 wiring: importar OutboxRepositoryModule e provider de EventPublisher + atualizar tripwire CheckoutShoppingListUseCase.length===1; (4) atualizar comentário do tripwire de mensageria quando o publisher real existir
Próximo passo recomendado: T-12 — checkout + publisher (use case DELETE+INSERT atômico; publisher periódico com retry; falha do broker não falha o HTTP)
```

### T-06 — persistência price-history (`2676397`)

```text
Tarefa: T-06
Estado: concluída
Arquivos alterados: apps/price-history-service/src/application/ports/purchase-repository.port.ts (port framework-free + tipo PurchaseSummary); ports/index.ts; infrastructure/persistence/drizzle/schema/index.ts (purchases + purchase_items conforme PLAN, índice em name_normalized); drizzle/repository/purchase.repository.ts + spec (integração Postgres real, 7 testes); migrations/0000 + meta; purchase-repository.module.ts; persistence/index.ts; project.json e drizzle.config.ts inalterados (targets já corretos); .env local (gitignored): PRICE_HISTORY_DATABASE_URL descomentada para o migrate
ACs cobertos: AC-06, AC-11 (persistência compra+itens; leitura listagem/detalhe), AC-16 (idempotência por PK id = completionId provada no banco), AC-17 (sem client cross-DB)
Testes executados: db:generate → migração 0000; db:generate/migrate → aplicada no DB price_history; npx nx test price-history-service → 9 arquivos, 49 testes, 0 falhas (reexecutado na retomada pelo orquestrador: 49/49 verdes); build → webpack compiled; eslint 0 problemas; tsc app+spec 0 erros
Decisões registradas: contrato da port p/ T-07 — insert→boolean (false = duplicata; idempotência via onConflictDoNothing na mesma transação dos itens), listSummaries (purchaseDate desc, empate createdAt desc, itemCount), findById (null → 404), findAllWithItems (insumo de aggregateLowestPrices); adaptador implements (não extends) — extends de classe abstrata quebra o transform swc/webpack; unit mapeado com guard isItemUnit; sem coluna de posição (v1): ordem dos itens no detalhe arbitrária/estável; numeric(12,*) mode:'number'
Pendências: T-07 consome a port conforme contrato acima; se a UI exigir ordem de inserção dos itens, coluna position será decisão futura do usuário; .env local mantido ativo (pré-requisito dos próximos migrates)
Próximo passo recomendado: T-07 — casos de uso PH framework-free (ingest idempotente via insert→false, listar compras, detalhe, menores preços com busca)
```

### T-05 — domínio price-history (`ae5d4ec`)

```text
Tarefa: T-05 (domínio price-history-service)
Estado: concluída
Arquivos alterados: apps/price-history-service/src/domain/** — item-name.ts (normalizeItemName CD-05), item-unit.ts, purchase.ts, lowest-prices.ts (agregação + tie-break), lowest-price-search.ts (busca), ingest-validation.ts + specs e barrel; fora do escopo, com aprovação explícita: tsconfig.app.json (referência ao tsconfig.lib.json de @lista/contracts para typecheck/build)
ACs cobertos: AC-08, AC-09, AC-10 (regras de domínio PH)
Testes executados: npx nx test price-history-service -- domain → 5 arquivos, 31 testes, 0 falhas (verde); na retomada 2026-10-16 reexecutado: 31 verdes e suíte completa do serviço 8 arquivos / 42 verdes; lint e typecheck verdes
Decisões registradas: normalização trim → NFKD → remove diacríticos → lowercase (paridade CD-05, cópia própria por serviço, sem lib de domínio compartilhada); agrupamento por nameNormalized; nome de exibição = item de menor preço; empate → compra mais recente (purchaseDate desc, depois createdAt desc; comparação lexicográfica); busca = substring sobre o nome normalizado (query vazia devolve lista completa); validação estrita de ingest (completionId UUID, mercado não vazio, purchaseDate YYYY-MM-DD real, itens ≥1 com nome/quantidade/preço/unidade válidos)
Pendências: nenhuma no escopo da tarefa
Próximo passo recomendado: T-06 — persistência PH (schema Drizzle purchases/purchase_items com PK = completionId, migração, port PurchaseRepository + adaptador, targets db)
```

### T-10 — domínio checkout shopping-list (`6a3f425`)

```text
Tarefa: T-10
Estado: concluída
Arquivos alterados: apps/shopping-list-service/src/domain/checkout-validation.ts + spec; purchase-completion.ts + spec; index.ts (exports)
ACs cobertos: AC-03, AC-04, AC-05, AC-07, AC-16
Testes executados: npx nx test shopping-list-service -- domain → 5 arquivos, 49 testes, 0 falhas (verde); tsc --noEmit 0 erros; eslint 0 problemas; na retomada 2026-10-16 reexecutado: 49 verdes
Decisões registradas: nenhuma ADR nova; domínio devolve códigos de erro (market-required / purchase-date-required / purchase-date-future / purchase-date-invalid) para tradução PT na borda HTTP (T-13); defesa UTC para data futura; branch "0 comprados" sem exigir corpo e sem gerar payload (RN-09)
Pendências: (1) T-13 mapear códigos → mensagens PT; (2) T-12/T-13 estender ShoppingListError para CheckoutValidationError; (3) libs/contracts dist atualizado
Próximo passo recomendado: T-11 — outbox SL (schema outbox_messages + migração + port OutboxRepository/EventPublisher), depois T-12
```

### T-04 — env e docs (`cf997bf`)

- Concluída — `PRICE_HISTORY_DATABASE_URL`, `PRICE_HISTORY_API_PORT`, `PRICE_HISTORY_CORS_ORIGINS` e `RABBITMQ_URL` documentados no `.env.example`; README com base `http://localhost:3002` (ADR 0010), Docker e comandos `db:*` do novo serviço.

### T-03 — scaffold `price-history-service` (`cf997bf`)

- Concluída — app Nest/Fastify hexagonal, JwtAuthModule global (ADR 0007), porta 3002, prefixo `api`, CORS/config, targets `build`/`serve`/`test`/`db:*`, vitest; suíte smoke verde (8 arquivos / 42 testes na retomada).

### T-02 — contratos (`457f4f1`)

- Concluída — `CheckoutShoppingListRequest`, HTTP do histórico (`Purchase*`, `LowestPrice*`), evento `PurchaseCompletedEventV1`; build/lint verdes.

### T-01 — ADR 0010 / 0006 / `.env.example` (`69ce52d`)

- Concluída — terceira exceção de gateway documentada; `PRICE_HISTORY_*` alinhados no `.env.example`.

## Nota de retomada (2026-10-16)

- O `STATUS.md` do working tree estava truncado (3 linhas) e divergente do repositório: o STATUS anterior apontava T-03 "em andamento", mas T-03 e T-04 já estavam commitadas em `cf997bf`. Arquivo reconstituído contra PLAN, SPEC, handoffs e `git log` **antes** de delegar.
- Evidências da retomada: `npx nx test price-history-service` → 42 testes verdes (T-03+T-05); `npx nx test shopping-list-service -- domain` → 49 testes verdes (T-10); `npx nx test price-history-service -- domain` → 31 verdes.
- Commits T-05 e T-10 feitos pelo orquestrador nesta retomada (sem nova aprovação, conforme `git-workflow`); handoffs versionados em `handoff-T-05.md` e `handoff-T-10.md`.
- Onda 4 (T-06 ∥ T-11) delegada e concluída na mesma retomada; suítes reexecutadas pelo orquestrador antes dos commits: `price-history-service` 49/49 e `shopping-list-service` 177/177 verdes.
- **Exceção ratificada:** a T-11 editou 1 asserção do tripwire em `src/integration/shopping-list-postgres.spec.ts` (arquivo da T-13, fora do escopo dela). O handoff alegava autorização sem registro; o orquestrador parou e o **usuário ratificou em 2026-10-16** (commit `a17b14b`). Futuros subagentes devem registrar pendência em vez de assumir aprovação.

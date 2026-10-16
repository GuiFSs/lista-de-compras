# Estado da feature — Histórico de preços

**Fase atual:** Implementação
**Gate atual:** plano fechado — `Aprovado pelo usuário em 2026-10-16`; revisão arquitetural **Aprovada com ressalvas**; ADR 0010 **Aceita**
**Última atualização:** 2026-10-16
**Próxima ação:** onda 4 — delegar **T-06** (persistência PH) ∥ **T-11** (outbox SL); dependências T-05 e T-10 concluídas e commitadas.

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
- Tarefa em andamento: nenhuma (aguarda onda 4: **T-06 ∥ T-11**)
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- Nenhum.

## Últimos handoffs

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

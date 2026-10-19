Tarefa: T-05 (domínio price-history-service)
Estado: concluída
Arquivos alterados (apenas apps/price-history-service/src/domain/**, com exceção justificada abaixo):
- apps/price-history-service/src/domain/index.ts (exporta barrel)
- apps/price-history-service/src/domain/item-name.ts (normalizeItemName CD-05)
- apps/price-history-service/src/domain/item-unit.ts (isItemUnit)
- apps/price-history-service/src/domain/purchase.ts (PriceHistoryPurchase/Item, createPriceHistoryPurchase)
- apps/price-history-service/src/domain/lowest-prices.ts (aggregateLowestPrices: agrupa por nameNormalized, min unitPrice, tie → compra mais recente; ordenação por nameNormalized)
- apps/price-history-service/src/domain/lowest-price-search.ts (filterLowestPrices: substring sobre nameNormalized, vazio devolve lista completa)
- apps/price-history-service/src/domain/ingest-validation.ts (validateIngestPayload: completionId UUID, mercado não-vazio, purchaseDate YYYY-MM-DD real, ≥1 item com nome/quantidade/preço/unidade válidos)
- apps/price-history-service/src/domain/item-name.spec.ts (prova café=cafe, acentos, sinônimos distintos)
- apps/price-history-service/src/domain/purchase.spec.ts (mapeamento do payload → domínio com nameNormalized e trims)
- apps/price-history-service/src/domain/lowest-prices.spec.ts (AC-08, AC-10: min, merge acentos, sinônimos distintos, tie-break)
- apps/price-history-service/src/domain/lowest-price-search.spec.ts (AC-09: busca com acento encontra sem acento, substring, vazio/sem-match)
- apps/price-history-service/src/domain/ingest-validation.spec.ts (casos válidos/invalidos da ingestão)

Outras alterações (fora do escopo de arquivos da tarefa, com aprovação explícita do usuário):
- apps/price-history-service/tsconfig.app.json — adicionada referência a `../../libs/contracts/tsconfig.lib.json` (nx sync/typecheck). Justificativa: primeiro uso de `@lista/contracts` em código de produção do serviço expôs referência ausente; necessário para `nx typecheck/build` sem alterar regras de projeto.

ACs cobertos: AC-08, AC-09, AC-10 (regras de domínio PH). Especificação das regras de ingestão do evento `PurchaseCompletedEventV1` coberta no domínio (validação estrita de campos).

Testes executados:
- `npx nx test price-history-service -- domain` → 5 arquivos de teste, 31 testes passaram (verde). Lint e typecheck verdes após ajuste de tsconfig.

Decisões registradas:
- Normalização de nome: trim → NFKD → remoção de marcas combinantes → lowercase (paridade CD-05). Cada serviço mantém cópia própria (sem lib compartilhada de domínio).
- Agrupamento por `nameNormalized`. Nome de exibição = item que ostenta menor preço. Empate de preço → compra mais recente (`purchaseDate` desc, depois `createdAt` desc); comparação lexicográfica de YYYY-MM-DD/ISO-8601 é suficiente.
- Busca: `normalizeItemName(query)` + `nameNormalized.includes(queryNormalizado)`; query vazia (após normalizar) devolve lista completa (sem filtro), sem-match devolve vazio (AC-09).
- Validação de ingestão: rejeita payload não-objeto, `completionId` não UUID, mercado vazio/apenas espaços, `purchaseDate` ausente/fora de formato/inexistente (`2026-02-30`), `items` não-array/vazio, item com nome vazio, quantidade ≤ 0/finita, `unitPrice < 0`/finito, unidade inválida em `ITEM_UNITS`. Campos aceitos com trim.
- Separação: validação de ingestão retorna `PurchaseCompletedPayload` tipado; `createPriceHistoryPurchase` mapeia para entidades do domínio já com `nameNormalized`.

Pendências: nenhuma no escopo permitido da tarefa.

Próximo passo recomendado: T-06 — Persistência PH (schema Drizzle `purchases`/`purchase_items` com PK `completionId`, migração, port `PurchaseRepository` + adaptador, targets db) em `apps/price-history-service/src/infrastructure/persistence/**`, `apps/price-history-service/src/application/ports/**`, `apps/price-history-service/project.json`, `apps/price-history-service/drizzle.config.ts`, dependente de T-05. (T-05 ∥ T-10 em paralelo; escopos disjuntos.)

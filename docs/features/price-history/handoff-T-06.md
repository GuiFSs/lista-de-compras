Tarefa: T-06 (persistência price-history-service)
Estado: concluída
Arquivos alterados (apenas no escopo permitido):
- apps/price-history-service/src/application/ports/purchase-repository.port.ts (novo — port PurchaseRepository + tipo PurchaseSummary)
- apps/price-history-service/src/application/ports/index.ts (barrel exporta a port)
- apps/price-history-service/src/infrastructure/persistence/drizzle/schema/index.ts (schema purchases + purchase_items conforme PLAN, com índice em purchase_items(name_normalized))
- apps/price-history-service/src/infrastructure/persistence/drizzle/repository/purchase.repository.ts (novo — adaptador DrizzlePurchaseRepository)
- apps/price-history-service/src/infrastructure/persistence/drizzle/repository/purchase.repository.spec.ts (novo — integração com Postgres real, 7 testes)
- apps/price-history-service/src/infrastructure/persistence/drizzle/migrations/0000_milky_silver_fox.sql (novo — gerado por db:generate)
- apps/price-history-service/src/infrastructure/persistence/drizzle/migrations/meta/0000_snapshot.json (novo)
- apps/price-history-service/src/infrastructure/persistence/drizzle/migrations/meta/_journal.json (journal com a entrada 0000)
- apps/price-history-service/src/infrastructure/persistence/purchase-repository.module.ts (novo — wiring port → adaptador Drizzle)
- apps/price-history-service/src/infrastructure/persistence/index.ts (barrel exporta o módulo)
- apps/price-history-service/project.json e drizzle.config.ts: inalterados — targets db:* e config já corretos (idênticos ao auth-service); nada a ajustar.
Fora do working tree (gitignored, nunca versionado): linha `PRICE_HISTORY_DATABASE_URL` do `.env` local descomentada para o db:migrate (mantida ativa por ser pré-requisito das próximas tarefas).

ACs cobertos: AC-06, AC-11 (persistência de compra+itens com data/mercado exatos e leitura de listagem/detalhe), AC-16 (idempotência por PK id = completionId, provada no banco), AC-17 (adaptador só referencia PRICE_HISTORY_DATABASE_URL — nenhum client/URL do shopping_list no serviço).

Testes executados:
- `npx nx run price-history-service:db:generate` → migração `0000_milky_silver_fox.sql` gerada (2 tabelas; purchase_items: 7 colunas, 1 índice, 1 FK)
- `npx nx run price-history-service:db:migrate` → "migrations applied successfully" no DB `price_history`
- `npx nx test price-history-service` → 9 arquivos, 49 testes, 0 falhas (42 anteriores + 7 novos de integração com Postgres real: round-trip completo; 2ª insert do mesmo completionId → false e 1 compra/N itens; listSummaries ordena purchaseDate desc com empate createdAt desc e itemCount correto; findById inexistente → null; findAllWithItems agrega itens por compra; delete em cascata remove itens; unit fora do domínio → falha explícita)
- `npx nx build price-history-service` → webpack compiled successfully
- `npx eslint apps/price-history-service/src` → 0 problemas (nenhum `any`)
- Extra: `tsc --noEmit` em tsconfig.app.json e tsconfig.spec.json → 0 erros

Decisões registradas (sem ADR nova — tudo dentro do plano aprovado):
- Contrato da port para o T-07: `insert(purchase): Promise<boolean>` (true = inserida; false = completionId já existe — reentrega não duplica, RN-11/AC-16), `listSummaries()` (purchaseDate desc, empate createdAt desc, com itemCount — RN-08), `findById(id)` (detalhe com itens; null → 404 na borda), `findAllWithItems()` (insumo de `aggregateLowestPrices` para menor preço/busca).
- Idempotência implementada com `onConflictDoNothing` sobre a PK dentro da transação que insere compra+itens (sem leitura prévia; atomicidade garante que falha no meio não deixa compra sem itens).
- Adaptador usa `implements PurchaseRepository` (não `extends`), mesmo padrão de auth/shopping-list — classe abstrata estendida quebra o transform do swc/webpack no parameter property.
- `unit` lido com guard do domínio (`isItemUnit`); linha corrompida lança erro explícito em vez de virar item inválido.
- Sem coluna de posição no schema (fora do plano v1): ordem dos itens no detalhe é arbitrária (estável por id asc) — se a UI exigir ordem de inserção, será decisão futura.
- `listSummaries` usa inner join (ingestão exige ≥1 item); `numeric(12,*)` com `mode: 'number'` (mesmo padrão do shopping-list) dispensa conversão string↔number.

Pendências:
- Orquestrador: a linha `PRICE_HISTORY_DATABASE_URL` do `.env` local (gitignored) está ativa — re-comentar se preferir; nenhuma versão controlada foi tocada.
- T-07 consumirá a port conforme contrato acima (fake de repo nos specs de use-case).
- Se o Histórico quiser ordem de inserção dos itens no detalhe, avaliar coluna `position` como decisão futura do usuário.

Proximo passo recomendado: T-07 — casos de uso PH framework-free (ingest idempotente usando `insert`→false, listar compras, detalhe, menores preços com busca) em `apps/price-history-service/src/application/use-cases/**`, com specs contra repo fake; T-06 ∥ T-11 em paralelo (escopos disjuntos).

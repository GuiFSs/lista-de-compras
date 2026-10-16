Tarefa: T-07
Estado: concluída
Arquivos alterados (apenas no escopo permitido `application/use-cases/**` + `application/index.ts`):
- apps/price-history-service/src/application/use-cases/ingest-purchase.use-case.ts (novo)
- apps/price-history-service/src/application/use-cases/ingest-purchase.use-case.spec.ts (novo — 5 testes)
- apps/price-history-service/src/application/use-cases/list-purchases.use-case.ts (novo)
- apps/price-history-service/src/application/use-cases/list-purchases.use-case.spec.ts (novo — 3 testes)
- apps/price-history-service/src/application/use-cases/get-purchase.use-case.ts (novo)
- apps/price-history-service/src/application/use-cases/get-purchase.use-case.spec.ts (novo — 2 testes)
- apps/price-history-service/src/application/use-cases/list-lowest-prices.use-case.ts (novo)
- apps/price-history-service/src/application/use-cases/list-lowest-prices.use-case.spec.ts (novo — 5 testes)
- apps/price-history-service/src/application/use-cases/testing/in-memory-purchase-repository.ts (novo — fake `PurchaseRepository` para os specs)
- apps/price-history-service/src/application/use-cases/testing/purchase-fixtures.ts (novo — `makePurchase` via domínio + `uuid(n)`)
- apps/price-history-service/src/application/use-cases/index.ts (barrel atualizado: exporta os 4 casos de uso)
- apps/price-history-service/src/application/index.ts — inalterado (já fazia `export * from './use-cases'`, então os casos de uso já ficam expostos para T-08/T-09)
Nada fora de `application/use-cases/**` foi tocado; comentários no estilo `coding-style` (só o "porquê" não óbvio), zero `any`.

ACs cobertos: AC-06 (listagem com `itemCount`, mais recente primeiro), AC-08/AC-10 (agregação `café`+`cafe` → um item com o menor preço), AC-09 (busca `cafe` acha `café`; sem resultado → vazio), AC-11 (detalhe com data/mercado/itens; id inexistente → `null` para a borda mapear 404), AC-12 (sem compras/itens → resposta vazia, insumo dos empty states), AC-16 (reentrega do mesmo `completionId` não cria segundo registro). Contratos de saída usam os shapes de `@lista/contracts` (`PurchaseListResponse`, `PurchaseDetailResponse`, `LowestPricesResponse`), AC-17 preservado (casos de uso dependem só da port `PurchaseRepository` — nenhum acesso cross-DB).

Testes executados:
- `npx nx test price-history-service` → 13 arquivos, 64 testes, 0 falhas (49 anteriores + 15 novos de use-case). Inclui a suíte de integração com Postgres real da T-06, que segue verde.
- `npx nx test price-history-service -- use-cases` → 4 arquivos, 15 testes, 0 falhas.
- `npx nx build price-history-service` → webpack compiled successfully.
- `npx eslint apps/price-history-service/src` → 0 problemas.
- `npx tsc --noEmit -p apps/price-history-service/tsconfig.spec.json` → 0 erros.

Decisões registradas (nenhuma ADR nova — dentro do plano aprovado):
- Ingestão (`IngestPurchaseUseCase`): entrada é o payload bruto no shape de `IngestPayloadInput` (campos `unknown`), validado por `validateIngestPayload`; mapeado por `createPriceHistoryPurchase` com `createdAt = new Date().toISOString()` (momento do consumo, não o `occurredAt` do checkout — a ordenação de empate do Histórico usa a ordem de registro, RN-08). Retorno `IngestPurchaseResult = { ok: true; id; created } | { ok: false; error: IngestValidationError }`, onde `created === false` é a reentrega idempotente (`insert → false`): sucesso/no-op, sem exceção (RN-11/AC-16). Falha do repositório **propaga** — é transitória e cabe ao consumidor (T-09) decidir nack/requeue.
- Listagem (`ListPurchasesUseCase`): devolve `{ purchases: await repository.listSummaries() }`; ordenação/itemCount ficam na port (RN-08), a borda só serializa.
- Detalhe (`GetPurchaseUseCase`): mapeia a entidade para `PurchaseDetailResponse`, descartando `nameNormalized` (interno do domínio); id inexistente → `null` (a borda T-08 traduz para 404).
- Menores preços (`ListLowestPricesUseCase`): `findAllWithItems` → `aggregateLowestPrices` → `filterLowestPrices(items, q ?? '')`; `q` ausente ou só espaços devolve a lista completa (RN-07a).
- Fake de repositório (`InMemoryPurchaseRepository extends PurchaseRepository`): sem parameter property, então `extends` funciona aqui (o adaptador Drizzle usa `implements` por causa do transform do swc/webpack, como registrado na T-06). Reproduz idempotência por id e a ordenação da port.
- Fixtures (`makePurchase`) montam a compra pelo mesmo caminho da ingestão (`createPriceHistoryPurchase`), para o `nameNormalized` (RN-06) não ser duplicado nos specs.

Pendencias:
- nenhuma bloqueante.
- Registro para o orquestrador: `apps/price-history-service/src/application/index.ts` **não** precisou de edição (já reexportava `./use-cases`) — sem arquivo extra fora do escopo.
- T-08 (borda HTTP) consome: `ListPurchasesUseCase.execute(): Promise<PurchaseListResponse>`; `GetPurchaseUseCase.execute(id): Promise<PurchaseDetailResponse | null>` (`null` → 404); `ListLowestPricesUseCase.execute(q?: string): Promise<LowestPricesResponse>`. T-09 (consumidor) consome `IngestPurchaseUseCase.execute(payload: IngestPayloadInput): Promise<IngestPurchaseResult>` (ack se `ok`, inclusive `created: false`; validação inválida → `ok: false`; exceção → nack/requeue).
- Ordem dos itens no detalhe segue a port (id asc, sem coluna de posição — decisão da T-06), inalterada aqui.

Proximo passo recomendado: T-08 — borda HTTP PH (controller `GET /api/price-history/purchases`, `/{id}` com 404, `/lowest-prices?q=`, 401/CORS), consumindo os casos de uso acima. T-07 ∥ T-12 no plano; a T-09 (consumidor) fica pronta para plugar o `IngestPurchaseUseCase`.

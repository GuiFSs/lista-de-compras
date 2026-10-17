Tarefa: T-13
Estado: concluída
Arquivos alterados:
- apps/shopping-list-service/src/api/http/shopping-list/shopping-list.controller.ts (adaptado: `concludeCheckout` lê `readCheckoutInput(body)` — o corpo cru vai ao domínio; corpo omitido segue aceito com 0 comprados, RN-09)
- apps/shopping-list-service/src/api/http/shopping-list/shopping-list-request.ts (novo: `readCheckoutInput(body: unknown): CheckoutInput` — repassa `market`/`purchaseDate` crus; a borda não valida, o domínio decide RN-03/RN-04)
- apps/shopping-list-service/src/api/http/shopping-list/shopping-list-messages.ts (novo: 4 constantes PT do checkout + `messageForCheckoutValidationError` via `Record<CheckoutValidationError, string>`)
- apps/shopping-list-service/src/api/http/shopping-list/shopping-list-errors.ts (novo branch: código de domínio `checkout-validation` → 400 canônico com a mensagem PT do código)
- apps/shopping-list-service/src/api/http/shopping-list/shopping-list.module.ts (wiring: importa `OutboxRepositoryModule` + `MessagingModule`; a factory de `CheckoutShoppingListUseCase` passa a injetar `[ShoppingListRepository, OutboxRepository]`)
- apps/shopping-list-service/src/api/http/shopping-list/shopping-list.controller.spec.ts (atualizado: doubles `RecordingOutboxRepository`/`NoopEventPublisher`; overrides `OutboxRepository`, `EventPublisher` e ciclo do publisher; novo describe de checkout — 200 com envelope no outbox, 200 sem comprados sem outbox, tabela de 400 (4 códigos), 500 com atomicidade; regressão das demais rotas mantida)
- apps/shopping-list-service/src/integration/shopping-list-postgres.spec.ts (atualizado: `createApp` devolve `{ app, outbox }` com adaptador Drizzle real decorado; tripwires da T-11/T-12 reescritos para o estado novo; AC-21 com corpo e prova do outbox; novo describe T-13 — 200/400/200-sem-comprados e rollback real 23505; race describe com mensageria neutralizada; limpeza das linhas de outbox criadas)

ACs cobertos: AC-04, AC-05, AC-07 (lado serviço/HTTP do checkout: 400 de mercado/data sem efeito, só os comprados saem + outbox mesmo com broker fora, 0 comprados sem evento). Contribui para AC-03 (contrato do corpo `CheckoutShoppingListRequest`) e é pré-requisito das provas de UI AC-15/AC-20, que pertencem às ondas de front (PLAN T-13 lista o conjunto tocado pela tarefa).

Testes executados:
- npx vitest run src/api/http/shopping-list/shopping-list.controller.spec.ts → 73 testes, 0 falhas
- npx vitest run src/integration/shopping-list-postgres.spec.ts → 19 testes, 0 falhas (Postgres real; log `ERROR ... Failed query: insert into "outbox_messages"` é o 23505 simulado do caso de rollback, não uma falha)
- npx nx test shopping-list-service --skip-nx-cache (suíte completa) → 20 arquivos, 206 testes, 0 falhas
- npx nx build shopping-list-service --skip-nx-cache → webpack compiled successfully
- npx eslint apps/shopping-list-service/src → 0 problemas

Decisoes registradas:
- A borda HTTP do checkout não valida mercado/data: repassa o corpo cru (`readCheckoutInput`) ao domínio, que decide a obrigatoriedade só quando há ≥1 comprado (RN-03/RN-04) e mantém corpo omitido válido com 0 comprados (RN-09).
- Mensagens PT exatas do PLAN.md, mapeadas por código de validação (mesmo padrão do item): `market-required`→"Mercado é obrigatório", `purchase-date-required`→"Data da compra é obrigatória", `purchase-date-future`→"Data da compra não pode ser futura", `purchase-date-invalid`→"Data da compra inválida"; todas respondem 400 `{ statusCode, message }`.
- Wiring no `ShoppingListModule` (não no `AppModule`): importar `MessagingModule` traz o `OutboxPublisherService` (ciclo de publicação com retry, T-12) ao grafo do app, mas o checkout não fala com o broker — a gravação do outbox é parte do mesmo passo atômico do port e o broker fora não derruba o 200.
- Tripwires de integração reescritos sem afrouxar ACs: prova de que a mensageria virou módulo real (exports `MessagingModule`/`OutboxPublisher`/`OutboxPublisherService`/`RabbitmqEventPublisher`) e que a conclusão tem exatamente dois colaboradores (`CheckoutShoppingListUseCase.length === 2`); as provas de "0 comprados → 0 outbox" e "broker fora → HTTP 200" vivem nos specs de use case/messaging (T-12) e nos casos de integração que checam efeito no banco.
- Rollback transacional provado no escopo da T-13: o `createApp` de integração decora o `OutboxRepository` real (`ObservingOutboxRepository`) e, sob comando, troca o `completionId` do próximo INSERT por um já existente. A violação de `unique(completion_id)` (23505) dentro da transação real devolve 500 e o `DELETE` dos comprados é desfeito — o item segue no banco, comprado. Fecha a pendência de rollback do handoff T-11.

Pendencias:
- Nenhuma dentro do escopo da T-13. As 3 falhas herdadas da T-12 (controller 500 do checkout, tripwire `CheckoutShoppingListUseCase.length`, mensageria ainda esqueleto) foram resolvidas; suíte completa verde.
- A existência de rota de histórico permanece fora desta rodada (404 provado em integração): o histórico é do price-history-service.

Proximo passo recomendado: T-08 (borda HTTP do price-history-service) se ainda pendente, ou onda 7 do PLAN; após isso, validação final da feature (feature-validator) incluindo a evidência de integração do checkout.

Tarefa: T-10
Estado: concluída
Arquivos alterados:
- apps/shopping-list-service/src/domain/checkout-validation.ts (novo)
- apps/shopping-list-service/src/domain/checkout-validation.spec.ts (novo)
- apps/shopping-list-service/src/domain/purchase-completion.ts (novo)
- apps/shopping-list-service/src/domain/purchase-completion.spec.ts (novo)
- apps/shopping-list-service/src/domain/index.ts (exports)
ACs cobertos: AC-03, AC-04, AC-05, AC-07, AC-16
Testes executados: npx nx test shopping-list-service -- domain → 5 arquivos, 49 testes, 0 falhas (verde); npx tsc -p apps/shopping-list-service/tsconfig.spec.json --noEmit → 0 erros; npx eslint apps/shopping-list-service/src/domain → 0 problemas
Decisões registradas: nenhuma ADR nova. Domínio devolve códigos de erro (market-required/purchase-date-required/purchase-date-future/purchase-date-invalid) para tradução PT na borda HTTP (T-13); defesa UTC para data futura; branch '0 comprados' sem exigir mercado/data e sem gerar payload (RN-09).
Pendências: (1) T-13 mapear códigos para mensagens PT; (2) T-12/T-13 estender ShoppingListError para CheckoutValidationError; (3) libs/contracts dist atualizado.
Próximo passo recomendado: T-11 → depois T-12 consome planPurchaseCompletion (DELETE + INSERT outbox na mesma transação, só ramo ready).
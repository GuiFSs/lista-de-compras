// Casos de uso do serviço de lista de compras. Chamados pela borda HTTP (T-06)
// e implementados sobre o port `ShoppingListRepository`, sem framework.
export * from './apply-receipt-purchase.use-case';
export * from './checkout-shopping-list.use-case';
export * from './create-shopping-list-item.use-case';
export * from './delete-shopping-list-item.use-case';
export * from './get-shopping-list.use-case';
export * from './mark-item-purchased.use-case';
export * from './recognize-receipt.use-case';
export * from './restore-shopping-list-item.use-case';
export * from './shopping-list-result';
export * from './unmark-item-purchased.use-case';
export * from './update-shopping-list-item.use-case';

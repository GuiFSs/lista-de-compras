// Casos de uso do auth-service.
// Chamados pelos controllers (adaptação de entrada HTTP — T6).
// LoginUseCase (T6): fluxo do login com as portas de T5 e o ponto de injeção
// do LoginRateLimiter pronto para a T7 (rate limit 429 + hash dummy).
export * from './login.use-case';
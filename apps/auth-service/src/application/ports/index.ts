// Ports (contratos) da aplicação — implementadas pelos adaptadores em
// `src/infrastructure` (ADR 0001 - arquitetura hexagonal). O domínio e os
// casos de uso dependem destas abstrações, nunca dos adaptadores concretos.
export * from './user-repository.port';
export * from './password-hasher.port';
export * from './token-signer.port';
export * from './login-rate-limiter.port';
// Camada de infraestrutura do auth-service: adaptadores de persistência.
// Os ports ficam em `src/application/ports` (lado da aplicação); os
// adaptadores de autenticação (hash/JWT) ficam em `src/infrastructure/auth`
// e são re-exportados pelo index da infraestrutura.
export * from './drizzle';
export * from './user-repository.module';
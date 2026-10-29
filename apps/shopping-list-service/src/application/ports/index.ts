// Ports (interfaces) da aplicação: ports de repositório, de mensageria
// e serviços externos. Implementadas pelos adaptadores em
// `src/infrastructure` (ADR 0001 - arquitetura hexagonal).
export * from './event-publisher.port';
export * from './outbox-repository.port';
export * from './receipt-recognizer.port';
export * from './shopping-list-repository.port';

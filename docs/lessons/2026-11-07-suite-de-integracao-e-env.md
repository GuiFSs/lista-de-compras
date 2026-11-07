# Lições — suíte de integração e `.env` (2026-11-07)

**Contexto:** ao validar `edit-purchase`, `nx test price-history-service` usou o
`PRICE_HISTORY_DATABASE_URL` do `.env` da raiz. Este documento não é uma ADR.

## 1. `??=` no test-setup não protege o banco quando o Nx já carregou o `.env`

- **O que aconteceu:** `apps/price-history-service/src/test-setup.ts` só preenche
  `PRICE_HISTORY_DATABASE_URL` com o Postgres local se a variável estiver
  ausente (`??=`). O Nx injeta o `.env` da raiz antes do Vitest. Com a URL
  apontando para um banco remoto, a suíte de
  `purchase.repository.spec.ts` rodou lá. Esse spec faz `TRUNCATE` de
  `purchases` e `purchase_items` em cada caso.
- **Por que importa:** o cabeçalho do spec já avisa que o banco de dev é
  descartável. Isso só vale se a URL for a do Docker. Uma URL remota no `.env`
  transforma o aviso num apagamento do banco que não é local. O mesmo padrão
  existe em `DATABASE_URL` (shopping-list) e `AUTH_DATABASE_URL`.
- **Onde ficou o guard:** o `.env` local (gitignored) aponta os três bancos e o
  RabbitMQ para `localhost`. A lição de 2026-10-19 já registra que essa suíte
  trunca o banco de dev e que um banco de teste dedicado continua pendente.
  Antes de `nx test` ou `db:migrate`, confirme que a URL do serviço é
  `localhost`.

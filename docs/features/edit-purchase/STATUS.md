# Estado da feature — Editar compra concluída

**Fase atual:** Implementação
**Gate atual:** implementação concluída, validação formal pendente
**Última atualização:** 2026-11-07
**Próxima ação:** validação formal (`VALIDATION.md`) pelo feature-validator

## Artefatos

- Spec: `docs/features/edit-purchase/SPEC.md` — aprovada em 2026-11-07
- Plano: `docs/features/edit-purchase/PLAN.md` — aprovado em 2026-11-07
- Revisão arquitetural: não aplicável (ADR 0014)
- Validação: pendente

## Execução

- Tarefa em andamento: nenhuma
- Tarefas concluídas: T-01, T-02, T-03, T-04, T-05, T-06, T-07
- Critérios comprovados: AC-01 a AC-11 nos testes abaixo; validação formal ainda não
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- **Incidente de dados (Neon):** o `.env` da raiz define `PRICE_HISTORY_DATABASE_URL`
  apontando para um banco Neon remoto. O Nx carrega esse `.env` e o `test-setup.ts`
  usa a URL local só como `??=`, então `nx test price-history-service` rodou a suíte
  do repositório contra o Neon. Essa suíte faz `TRUNCATE` de `purchases` e
  `purchase_items` antes e depois de cada caso. Há ao menos sete execuções desse tipo
  nesta sessão. O estado observado no Neon depois delas: tabelas existentes, tabela
  `drizzle.__drizzle_migrations` vazia, `purchase_items` sem `position`, 0 linhas em
  `purchases` e `purchase_items`. Não é possível provar a partir daqui se havia linhas
  antes. Ação pendente do usuário: verificar o histórico/restauração do Neon.
- O usuário restaurou o Neon. Em 2026-11-07 o `.env` local (gitignored) passou a
  apontar os três bancos e o RabbitMQ para o Docker local (`localhost`). O Neon não
  recebe mais `nx test` nem `db:migrate` a partir deste `.env`.
- Migração `0001_purchase_item_position` aplicada no Postgres local. No Neon ela
  continua pendente até um deploy decidido pelo usuário.

## Evidência de verificação (2026-11-07, Docker local)

- Postgres local (`postgres:16-alpine`) e RabbitMQ no ar; migrações aplicadas;
  `purchase_items.position` `NOT NULL` confirmado.
- `npx nx test price-history-service` com URL local — 25 arquivos, 162 testes verdes
  (inclui `purchase.repository.spec.ts` com o caso `update`).
- `npx nx test web` — 31 arquivos, 327 testes verdes.
- `npx nx run-many -t lint typecheck` (web, price-history-service, contracts) — verde.
- `npx nx e2e web-e2e` — 80/80 verdes (inclui a jornada de edição).

## Último handoff

- Agente: implementação
- Tarefa: T-02 a T-07
- Arquivos alterados: contrato, domínio, persistência, HTTP, PWA e E2E de
  `edit-purchase`
- Testes executados:
  - `npx vitest run --config apps/price-history-service/vitest.config.mts --run src/domain/update-purchase.spec.ts src/application/use-cases/update-purchase.use-case.spec.ts src/api/http/price-history/price-history.controller.spec.ts` — 44 testes verdes
  - `npx nx test web` filtrado nos specs do sheet, detalhe, store e API — verdes
  - `npx nx e2e web-e2e -- --grep "editar compra"` — 5 testes verdes
- Decisões: ADR 0014; menor preço recalculado na leitura
- Pendências: validação formal; suíte Drizzle com Postgres (Docker parado)

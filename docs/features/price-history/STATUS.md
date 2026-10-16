# Estado da feature — Histórico de preços

**Fase atual:** Implementação
**Gate atual:** plano fechado — `Aprovado pelo usuário em 2026-10-16`;
revisão arquitetural **Aprovada com ressalvas**; ADR 0010 **Aceita**
**Última atualização:** 2026-10-16
**Próxima ação:** concluir **T-03** (paralela a T-04; se já concluída, onda 3:
**T-05** ∥ **T-10**).

## Artefatos

- Spec: `docs/features/price-history/SPEC.md` — **aprovada**
- Plano: `docs/features/price-history/PLAN.md` — **aprovado**
- ADR 0010: **Aceita**
- Revisão arquitetural: **Aprovada com ressalvas**
- Validação: pendente

## Execução

- Branch: `feature/price-history`
- Tarefa em andamento: **T-03** (scaffold; paralela — T-04 concluída nesta
  sessão)
- Tarefas concluídas: SPEC; PLAN; ARCHITECTURE-REVIEW; **T-01** (`69ce52d`);
  **T-02** (`457f4f1`); **T-04** (env/README — sem commit nesta sessão)
- Critérios comprovados: base documental AC-21 (T-01); base contratos
  AC-03…AC-11, AC-16, AC-18, AC-21 (T-02); infra/doc env+README (T-04)
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- Nenhum. Commit da T-04 a cargo do orquestrador (usuário pediu sem commit
  nesta sessão).

## Últimos handoffs

### T-04 — env e docs (sem commit)

```text
Tarefa: T-04
Estado: concluída
Arquivos alterados: .env.example, README.md, docs/features/price-history/STATUS.md
ACs cobertos: — (infra/doc; T-04 técnica)
Testes executados: revisão de doc — PRICE_HISTORY_DATABASE_URL,
  PRICE_HISTORY_API_PORT e PRICE_HISTORY_CORS_ORIGINS descomentados/documentados
  no .env.example; RABBITMQ_URL documentada como URL compartilhada
  (shopping-list produtor / price-history consumidor); README com base
  http://localhost:3002 (ADR 0010), Docker Postgres+RabbitMQ, e comandos
  db:generate / db:migrate do price-history-service
Decisões registradas: nenhuma nova (reusa ADR 0010 Aceita)
Pendências: commit Conventional Commits da T-04 pelo orquestrador; não tocar
  apps/price-history-service (T-03) nem libs/contracts
Próximo passo recomendado: orquestrador comita T-04; se T-03 já verde, onda 3
  (T-05 ∥ T-10); senão aguardar handoff T-03
```

### T-02 — contratos (`457f4f1`)

- Estado: concluída — `CheckoutShoppingListRequest`, HTTP PH, evento v1;
  `npx nx build/lint contracts` verdes.

### T-01 — ADR 0010 / 0006 / `.env.example` (`69ce52d`)

- Estado: concluída — terceira exceção gateway; `PRICE_HISTORY_*` documentados.

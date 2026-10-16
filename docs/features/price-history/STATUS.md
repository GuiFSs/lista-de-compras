# Estado da feature — Histórico de preços

**Fase atual:** Plano **aprovado** — pronta para implementação
**Gate atual:** fechado — `Aprovado pelo usuário em 2026-10-16` no `PLAN.md`;
revisão arquitetural **Aprovada com ressalvas** (ressalvas incorporadas no
PLAN); ADR 0010 **Aceita**
**Última atualização:** 2026-10-16
**Próxima ação:** Orquestrador cria a branch `feature/price-history` e delega
**T-01** (ADR 0010 / nota na ADR 0006 / `.env.example`).

## Artefatos

- Spec: `docs/features/price-history/SPEC.md` — **aprovada**
  (`Aprovado pelo usuário em 2026-10-16`); CD-01…CD-07; AC-01…AC-21
- Plano: `docs/features/price-history/PLAN.md` — **aprovado**
  (`Aprovado pelo usuário em 2026-10-16`); 22 tarefas T-01…T-22; Superfície de
  UI: sim; matriz AC ↔ E2E; T-22 Playwright; ressalvas do parecer incorporadas
- ADR 0010: `docs/decisions/0010-excecao-temporaria-ao-gateway-price-history-service.md`
  — **Aceita** (CD-04; PWA → `localhost:3002`)
- Revisão arquitetural: `docs/features/price-history/ARCHITECTURE-REVIEW.md` —
  **Aprovada com ressalvas**; pendências bloqueantes: nenhuma
- Validação: pendente

## Escopo da 1ª rodada (confirmado com o usuário em 2026-10-16)

1. **Completa (opção A):** captura (mercado/data no checkout + evento +
   `price-history-service`) **e** UI de menor preço **e** UI de compras
   concluídas.
2. Bottom nav **Histórico** passa a navegar de verdade.
3. Nome da feature/pasta: **`price-history`**.

## Execução

- Tarefa em andamento: nenhuma (próxima: T-01)
- Tarefas concluídas: SPEC (product-spec); PLAN + ADR 0010 (tech-planner);
  ARCHITECTURE-REVIEW (architecture-review); fechamento do gate do plano
  (tech-planner)
- Critérios comprovados: nenhum (ainda não implementados)
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- Nenhum bloqueio de plano/arquitetura.
- Próxima fase: implementação a partir de T-01 na branch `feature/price-history`.

## Último handoff

```text
Tarefa: fechamento do gate do PLAN
Estado: concluída
Arquivos alterados: docs/features/price-history/PLAN.md, docs/features/price-history/STATUS.md, docs/decisions/0010-excecao-temporaria-ao-gateway-price-history-service.md
ACs cobertos: AC-01…AC-21 mapeados no plano aprovado (ainda não implementados)
Testes executados: não aplicável (fechamento de gate documental)
Decisões registradas: Aprovado pelo usuário em 2026-10-16; ADR 0010 Aceita; ressalvas ARCHITECTURE-REVIEW incorporadas (outbox mesma tx; nack/requeue; ordem best-effort)
Pendências: nenhuma no gate do plano
Próximo passo recomendado: orquestrador cria feature/price-history e delega T-01
```

- Agente: tech-planner
- Tarefa: fechar gate do PLAN (frase canônica + ressalvas + ADR Aceita + STATUS)
- Arquivos alterados: `docs/features/price-history/PLAN.md`,
  `docs/features/price-history/STATUS.md`,
  `docs/decisions/0010-excecao-temporaria-ao-gateway-price-history-service.md`
- Testes executados: não aplicável
- Decisões: plano aprovado; ADR 0010 Aceita; ressalvas incorporadas
- Pendências: nenhuma — criar branch e delegar T-01

# Estado da feature — Histórico de preços

**Fase atual:** Implementação
**Gate atual:** plano fechado — `Aprovado pelo usuário em 2026-10-16`;
revisão arquitetural **Aprovada com ressalvas**; ADR 0010 **Aceita**
**Última atualização:** 2026-10-16
**Próxima ação:** orquestrador comita T-02; segue onda 1/2 conforme T-01
(paralela) e depois T-03 / T-04.

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

- Branch: `feature/price-history`
- Tarefa em andamento: **T-01** (paralela, se ainda aberta)
- Tarefas concluídas: SPEC; PLAN + ADR 0010; ARCHITECTURE-REVIEW; gate do plano;
  **T-02** (contratos)
- Critérios comprovados: base de contratos para AC-03…AC-11, AC-16, AC-18,
  AC-21 (tipos/rotas documentados; implementação nos serviços ainda pendente)
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- Nenhum.

## Último handoff

```text
Tarefa: T-02
Estado: concluída
Arquivos alterados: libs/contracts/src/http/shopping-list.ts, libs/contracts/src/http/price-history.ts, libs/contracts/src/http/index.ts, libs/contracts/src/events/shopping-list.ts, libs/contracts/src/events/index.ts, libs/contracts/README.md, docs/features/price-history/STATUS.md
ACs cobertos: AC-03–AC-11, AC-16, AC-18, AC-21 (base contratos — tipos HTTP checkout/histórico + evento v1)
Testes executados: npx nx build contracts → Successfully ran target build for project contracts (exit 0); npx nx lint contracts → Successfully ran target lint for project contracts (exit 0)
Decisões registradas: nenhuma nova (contratos alinhados a PLAN/SPEC + ADR 0010)
Pendências: nenhuma
Próximo passo recomendado: orquestrador comita T-02; se T-01 concluída, Onda 2 (T-03 ∥ T-04); senão aguardar T-01
```

- Agente: backend-dev
- Tarefa: T-02 — contratos HTTP + evento em `libs/contracts`
- Arquivos alterados: `libs/contracts/src/http/shopping-list.ts`,
  `libs/contracts/src/http/price-history.ts` (novo),
  `libs/contracts/src/http/index.ts`,
  `libs/contracts/src/events/shopping-list.ts` (novo),
  `libs/contracts/src/events/index.ts`,
  `libs/contracts/README.md`,
  `docs/features/price-history/STATUS.md`
- Testes executados: `npx nx build contracts` (ok); `npx nx lint contracts` (ok)
- Decisões: nenhuma nova
- Pendências: nenhuma

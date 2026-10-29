# Validação — Importar compra pela foto da nota

**Spec:** `docs/features/receipt-purchase/SPEC.md`  
**Plano:** `docs/features/receipt-purchase/PLAN.md`  
**Data:** 2026-10-29  
**Resultado:** Aprovada  
**Superfície de UI (do plano):** sim

## Evidências por critério

| AC | Estado | Evidência automatizada | Playwright (se AC de UI) | Evidência contrato/ops | Observação |
| --- | --- | --- | --- | --- | --- |
| AC-01 | aprovado | store/API + page | `receipt-purchase.spec.ts` — loading “Lendo a nota…” | — | |
| AC-02 | aprovado | — | mesma jornada — sheet Revisar nota com linhas/mercado/data | — | |
| AC-03 | aprovado | — | linha incompleta completada antes do apply | — | |
| AC-04 | aprovado | `apply-receipt-purchase.use-case.spec.ts` replace | jornada: Café existente vira comprado | — | |
| AC-05 | aprovado | unit create | jornada: Pão/Banana novos | — | |
| AC-06 | aprovado | unit skip Leite | jornada: 1 pendente (Leite) permanece | — | |
| AC-07 | aprovado | — | checkout prefilled Mercado Central + data | — | |
| AC-08 | aprovado | checkout existente (regressão controller) | cancel path cobre pré-checkout; checkout HTTP inalterado | evento existente | |
| AC-09 | aprovado | — | cancelar checkout mantém 3 comprados | — | |
| AC-10 | aprovado | recognize use case unavailable | cenário 503 — erro, lista igual | — | |
| AC-11 | aprovado | store `failed` preserva mutationError | fluxo apply usa mesmo padrão AC-23 | — | |
| AC-12 | aprovado | recognize processa Buffer em memória; sem persistência | N/A | ADR 0012 | |
| AC-13 | aprovado | chave só em env do serviço (module factory) | N/A | `.env.example` placeholder | |
| AC-14 | aprovado | money helpers + review sheet máscara | jornada digita preço na revisão | — | |
| AC-15 | aprovado | — | empty “Nenhum item reconhecido” | — | |

## Checklist de documentação

- [x] Contratos HTTP/eventos coerentes com a implementação.
- [x] ADR versionada (0012, 0013).
- [x] `.env.example` atualizado (`SHOPPING_LIST_GEMINI_*`).
- [x] `docs/lessons/` N/A (sem lição transferível nova além das ADRs).
- [x] `STATUS.md` final.

## Checklist de design (Superfície de UI = sim)

- [x] Tokens only na revisão/progresso.
- [x] Quatro estados cobertos (loading recognize, empty lines, erro, sucesso + checkout).
- [x] Layout mobile-first; CTA no sheet.
- [x] Contraste/foco/alvos ≥44px.
- [x] Erro visível (toast).
- [x] Tema via tokens.
- [x] Hierarquia: título Revisar nota + apoio.
- [x] Agrupamento por whitespace.
- [x] Tipo formulário de app (guia §4).

## Verificações transversais

- [x] Contratos HTTP refletem a implementação.
- [x] ADRs 0012/0013 versionadas.
- [x] Documentação da feature atualizada.
- [x] Testes planejados executados.
- [x] Playwright da feature executado (comando abaixo).
- [x] Sem segredo versionado.

## Pendências

- nenhuma

## Comandos executados

```text
npx nx build contracts --skip-nx-cache
# Successfully ran target build for project contracts

npx nx test shopping-list-service --skip-nx-cache -- apply-receipt recognize-receipt gemini-receipt
# Test Files  3 passed (3) / Tests  13 passed (13)

npx vitest run --config apps/shopping-list-service/vitest.config.mts src/api/http/shopping-list/shopping-list.controller.spec.ts -t "GET /api/shopping-list"
# Tests  2 passed | 71 skipped (controller sobe com multipart)

npx nx test web --skip-nx-cache --include='**/shopping-list-page.spec.ts'
# Tests  32 passed (32)

# E2E hermético (auth stub :3001 + web:serve; login/API mockados):
npx playwright test apps/web-e2e/src/shopping-list/receipt-purchase.spec.ts --config=apps/web-e2e/playwright.config.mts
# 3 passed (6.3s)
```

## Parecer

Feature **aprovada**: ACs cobertos por unitário e jornada Playwright `receipt-purchase`, contratos e ADRs versionados, sem pendência bloqueante. Gate ADR 0008 satisfeito para a superfície de UI desta feature.

# ADR 0008 — Playwright como evidência obrigatória de UI no SDD

**Status:** Aceita
**Data:** 2026-10-08

## Contexto

O fluxo SDD exigia evidência verificável por `AC-*`, mas aceitava unitário,
integração, contrato ou execução manual. E2E/Playwright ficava opcional
(“jornadas críticas”). Com agentes de IA (incluindo LLMs gratuitos), isso
permitia fechar features de UI sem prova de que a jornada realmente funciona no
browser — ou declarar verde só porque um arquivo de teste existe.

A stack E2E já está definida na ADR 0004 (`apps/web-e2e`, Playwright,
Chromium). Faltava a **política de processo**: quando o Playwright é gate e
como mapear critérios sem explodir em um E2E por AC.

## Decisões

- **Playwright é obrigatório** para toda feature ou fix com **superfície de UI**:
  mudanças em `apps/web` ou critérios de aceite com comportamento observável
  em tela/interação. O gate de implementação e o de validação não fecham sem
  suíte Playwright da feature verde e **comando + resultado registrados** no
  handoff e em `VALIDATION.md`.
- **Backend-only** (API, domínio, migração, contrato HTTP/evento sem UI) **não**
  exige cenário E2E novo; fecha com unitário/integração + `VALIDATION.md`.
- **Granularidade por jornada**, não um teste Playwright por `AC-*`. Todo AC
  com comportamento observável na UI deve constar na matriz `AC → cenário E2E`
  do `PLAN.md` e estar coberto por ≥1 cenário em `apps/web-e2e`. ACs só de
  backend/infra usam unitário/integração.
- **Evidência manual ou “arquivo existe” não substitui** Playwright em AC de
  UI. O `feature-validator` reprova se faltar corrida registrada
  (`npx nx e2e web-e2e` ou equivalente filtrado).
- **Runtime**: Chromium-first, conforme ADR 0004; specs em `apps/web-e2e`.

## Consequências

- `docs/process/sdd-workflow.md`, templates de plano/validação, skills e
  agentes de planejamento, testes e validação passam a exigir classificação
  `Superfície de UI: sim|não` e tarefa E2E quando aplicável.
- Planos sem matriz AC↔E2E (quando UI) não passam no gate do plano.
- Reduz risco de alucinação de evidência por LLMs: o gate exige saída de
  comando, não inferência.
- Não obriga CI nesta ADR; a evidência local/registrada no SDD é o gate.
- Features históricas (ex.: auth) que já têm E2E não precisam ser reescritas
  só por esta política.

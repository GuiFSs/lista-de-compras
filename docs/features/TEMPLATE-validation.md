# Validação — <nome da feature>

**Spec:** `docs/features/<feature>/SPEC.md`  
**Plano:** `docs/features/<feature>/PLAN.md`  
**Data:** AAAA-MM-DD  
**Resultado:** Aprovada | Reprovada | Bloqueada  
**Superfície de UI (do plano):** sim | não

## Evidências por critério

| AC | Estado | Evidência automatizada | Playwright (se AC de UI) | Evidência contrato/ops | Observação |
| --- | --- | --- | --- | --- | --- |
| AC-01 | aprovado / reprovado / bloqueado | comando + teste unit/integração | cenário E2E + comando; ou N/A se AC não-UI | contrato/ops; ou — | ... |

Regras (ADR 0008):

- Se Superfície de UI = sim e o AC é observável na UI: a coluna Playwright é
  **obrigatória**. Evidência manual ou “arquivo `.spec.ts` existe” **não**
  substitui; ausência → **reprova** o AC e a feature.
- Se Superfície de UI = não: coluna Playwright = N/A; evidência unitária/
  integração por AC.

## Checklist de documentação

- [ ] Contratos HTTP/eventos coerentes com a implementação.
- [ ] ADR versionada se houve decisão arquitetural (ou N/A).
- [ ] README / `.env.example` atualizados se setup/env mudou (ou N/A).
- [ ] `docs/lessons/` registrado se houve aprendizado transferível (não criar
      arquivo vazio; ou N/A).
- [ ] `STATUS.md` final com próxima ação (push/PR ou concluída).

## Checklist de design (obrigatório se Superfície de UI = sim)

- [ ] Tokens: sem cor, espaço ou raio hardcoded fora do guia.
- [ ] Quatro estados: carregando / vazio / erro / sucesso.
- [ ] Layout uma coluna mobile-first; ações frequentes no terço inferior.
- [ ] Contraste e foco (`:focus-visible`); alvos de toque ≥44px.
- [ ] Erro visível na UI (não só no console).
- [ ] Modo escuro via tokens (sem hardcoded).

Se Superfície de UI = não: marcar esta seção como N/A.

## Verificações transversais

- [ ] Contratos HTTP/eventos refletem a implementação.
- [ ] ADRs necessárias estão versionadas.
- [ ] Documentação da feature está atualizada.
- [ ] Testes planejados foram executados e os resultados estão registrados.
- [ ] Se Superfície de UI = sim: `npx nx e2e web-e2e` (ou filtro) foi executado
      e o resultado está na seção de comandos abaixo.
- [ ] Checklist de documentação acima está completa.
- [ ] Se Superfície de UI = sim: checklist de design acima está completa.
- [ ] Não há segredo ou credencial versionada.

## Pendências

- <AC, responsável e próximo passo; ou "nenhuma">

## Comandos executados

```text
<comando>
<resultado resumido e verificável>

# Obrigatório quando Superfície de UI = sim:
npx nx e2e web-e2e
# <N testes aprovados / falha — copiar resumo real, sem inferência>
```

## Parecer

<Aprovar somente quando todos os ACs estiverem comprovados, o gate Playwright
(se UI) estiver satisfeito com comando+resultado registrados, checklists de
docs e design (se UI) estiverem ok, e não houver pendência de comportamento,
contrato ou arquitetura. Se UI e faltar corrida Playwright no handoff do
test-engineer, devolva ao orquestrador — não aprove. Em reprova, liste ACs a
reabrir para o orquestrador atualizar o STATUS.>

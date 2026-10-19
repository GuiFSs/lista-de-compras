# Estado da feature — Menor preço por mercado

**Fase atual:** **Implementação** — onda 1 (T-03, higiene do spec de integração do `price-history-service`)
**Gate atual:** SPEC e PLAN aprovados (`Aprovado pelo usuário em 2026-10-19`); `ARCHITECTURE-REVIEW.md` Aprovada com ressalvas (nenhuma bloqueante), R-1…R-6 incorporadas; **ADR 0011 aceita** (T-01). Branch `feature/lowest-price-by-market` criada a partir da `master`; documentação do **PC-0** commitada
**Última atualização:** 2026-10-19
**Próxima ação:** T-03 (`backend-dev` — limpeza determinística do spec de integração, achado da v1) e, depois, T-04 (`backend-dev` — evoluir `libs/contracts`). **Atenção ao R-3:** T-04 **não** é commitada sozinha — suas mudanças ficam no *working tree* até T-05/T-06 fecharem (commit conjunto **PC-2**), porque a evolução do contrato compartilhado deixa consumidores vermelhos **por design**. Nenhum gate de fase (validação, PR) roda dentro dessa janela

## Origem da demanda

Pedido do usuário em **2026-10-19** (chat), logo após o merge da v1 `price-history`:

> quero umas mudanças no menor preço: adicionar mais informações como o mercado no qual foi comprado o item naquele menor preço, a data, quantidade — e ordenar por mercado. Quero poder clicar em um item, por exemplo batata, e ver todos os menores preços da batata em cada mercado.

## Decisões já confirmadas pelo usuário (2026-10-19, chat)

1. **Drill-down do item:** nova rota `/menor-preco/:item` (tela dedicada com app bar e voltar; padrão da tela de detalhe do Histórico).
2. **Visão do item por mercado:** **uma linha por mercado** — o menor preço por unidade daquele item naquele mercado, com data e quantidade da compra que ostenta esse preço.
3. **Empate:** o registro que empresta mercado/data/quantidade é a **compra mais recente** (desempate determinístico, se preciso, pelo id do registro).
4. **Lista principal:** agrupada por **mercado A→Z** e, dentro do mercado, **item A→Z**.
5. **Regra de menor preço inalterada** — continua o menor preço **por unidade** entre as compras do mesmo item (nome normalizado; RN-06/RN-07 da v1).
6. **Busca inalterada** — segue por nome, com empty próprio (v1, AC-09).

### Decisões que fecharam o gate (2026-10-19, chat) — registradas na SPEC como CD-07…CD-10

7. **CD-07** — o item entra na rota como **slug do nome normalizado** (`/menor-preco/:item`); **sem** id novo de item (não existe hoje; a agregação do histórico é por nome normalizado). O nome de exibição canônico vem na resposta.
8. **CD-08** — a quantidade é exibida **com a unidade** (ex.: “2 kg”, “3 unidade”), na lista principal e na tela do item.
9. **CD-09** — a lista principal **não** mostra cabeçalho de mercado vazio: só grupos com ao menos um item.
10. **CD-10** — ao voltar do drill-down, a tela Menor preço **preserva o termo de busca e a lista filtrada**.
11. **Escopo de produto** — `docs/product/initial-scope.md` foi atualizado em **2026-10-19**: a comparação entre mercados **entra** no escopo (a v1 `price-history` a declarava fora). Mudança de 2 linhas, verificada pelo orquestrador (`git diff`).

12. **Rework de higiene de teste entra no PLAN desta feature** (achado de 2026-10-19 na v1): o spec de integração do `price-history-service` deixa resíduo no banco de dev — corrigir com tarefa própria deste plano.

## Contexto — v1 integrada

- A feature `price-history` (v1) está **validada e mergeada** em `master` (PR #4, merge commit `017801a`, 2026-10-19). Ver `docs/features/price-history/STATUS.md`.
- A SPEC da v1 declarou **comparação entre mercados explicitamente fora do escopo inicial** (`docs/features/price-history/SPEC.md` § Fora de escopo). Esta feature **traz o tema para o escopo do produto** — `docs/product/initial-scope.md` foi atualizado em **2026-10-19** (commit `19404f5`).
- Contrato hoje (`libs/contracts/src/http/price-history.ts`): `LowestPriceItem { name, nameNormalized, lowestUnitPrice }` — **sem** mercado, data ou quantidade. A mudança cruza `libs/contracts` + `price-history-service` + `apps/web`; provável consulta/rota nova para o drill-down → puxa revisão arquitetural e possivelmente ADR.

## Artefatos

- Spec: `docs/features/lowest-price-by-market/SPEC.md` — **aprovada** (`Aprovado pelo usuário em 2026-10-19`; 16 ACs, 16 RNs, CD-01…CD-10; nenhuma decisão aberta)
- Plano: `docs/features/lowest-price-by-market/PLAN.md` — **aprovado** (`Aprovado pelo usuário em 2026-10-19`; revisão 3: 17 tarefas `T-01…T-17`, 11 ondas com provas de paralelismo, matriz AC↔E2E 16/16, Playwright em T-16, rework de higiene em T-03, lição em T-17, pontos de commit PC-0…PC-8)
- ADR: `docs/decisions/0011-excecao-temporaria-ao-gateway-drill-down-menor-preco-por-mercado.md` — **Aceita** em 2026-10-19 (criada na **T-01**), com ponte na ADR 0010 §1 (a exceção do `price-history-service` passa a cobrir **quatro** operações)
- Revisão arquitetural: `docs/features/lowest-price-by-market/ARCHITECTURE-REVIEW.md` — **Aprovada com ressalvas (nenhuma bloqueante)** em 2026-10-19; R-1…R-6 incorporadas na revisão 3 do plano
- Validação: pendente

## Execução

- Branch: `feature/lowest-price-by-market` (criada a partir da `master`, depois da aprovação canônica do plano — skill `git-workflow`, passo 2)
- Commits do **PC-0** (docs): `19404f5` `docs(product)` (initial-scope), `c4f9625` `docs(lowest-price-by-market)` (SPEC + STATUS), `25b744c` `docs(lowest-price-by-market)` (PLAN + parecer), ADR 0011 + este STATUS (`docs(adr)`, T-01)
- Tarefas concluídas: **T-01** (ADR 0011 + ponte na ADR 0010 §1) e **T-02** (parecer arquitetural, concluída antes do gate do plano)
- Em andamento: **T-03** (higiene do spec de integração); a seguir T-04 (contratos — vai para o **PC-2**, junto de T-05/T-06)
- Regra de commit: **por ponto de commit** (PC-0…PC-8), não por T isolada quando a suíte estiver vermelha por design (R-3)

## Pendências e bloqueios

- **Nenhum bloqueio.** Feature em implementação (onda 1). O retrabalho de higiene de teste da v1 está **incluído no plano** (T-03; rework do achado de 2026-10-19).
- **Observação de processo (2026-10-19):** o agente `product-spec` teve `edit`/`write` **negados** em `docs/product/**` e aplicou a atualização do `initial-scope.md` via shell, com autorização explícita do usuário na rodada. O orquestrador verificou o diff (2 linhas, exatamente o aprovado). Se a intenção é que esse agente edite escopo de produto, ajustar a permissão dele em `.opencode/agents/product-spec.md`/configuração — caso contrário, o fluxo depende de contorno manual.

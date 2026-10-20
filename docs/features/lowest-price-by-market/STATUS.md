# Estado da feature — Menor preço por mercado

**Fase atual:** **Implementação** — **T-01…T-15 concluídas** (código do serviço e da PWA completos e auditados); falta o **gate de UI**
**Gate atual:** SPEC e PLAN aprovados (`Aprovado pelo usuário em 2026-10-19`); `ARCHITECTURE-REVIEW.md` Aprovada com ressalvas (nenhuma bloqueante), R-1…R-6 incorporadas; **ADR 0011 aceita** (T-01). Branch `feature/lowest-price-by-market`; **PC-0…PC-6** commitados (último: `e560123`, T-14 + T-15). **Suíte vermelha por design (R-3) encerrada**: serviço, PWA e contrato verdes no PC-6
**Última atualização:** 2026-10-20
**Próxima ação:** **T-16** (`test-engineer`) — jornadas Playwright em `apps/web-e2e` (fake/fixtures nos dois shapes novos + rota do item; `lowest-price.spec.ts` atualizado e `lowest-price-by-market.spec.ts` novo), **gate de UI do ADR 0008**; decide de ponta a ponta o round-trip do nome com `/` (**R-2**) e o 404 como *não encontrado* (**R-5**). Depois: **T-17** (lição, PC-8) e `feature-validator`. Pendência não bloqueante: aviso de budget do `lowest-price-page.scss` (4,26 kB > 4 kB, pré-existente de `74b0e58`) — seguir como follow-up registrado

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
- Tarefas concluídas: **T-01** (ADR 0011 + ponte na ADR 0010 §1), **T-02** (parecer arquitetural), **T-03** (higiene do spec de integração — `5ce5d51`), **T-04…T-06** (contratos + domínio da lista — **PC-2**, `d2cc806`), **T-07/T-08** (drill-down no domínio + porta/adaptador — **PC-3**, `ce3e6df`), **T-09/T-10** (casos de uso + borda HTTP — **PC-4**, `c0f41c0`), **T-11…T-13** (PWA: dados+store, lista agrupada, tela do item + rota — **PC-5**, `74b0e58`) e **T-14/T-15** (auditorias backend e unitária da PWA — **PC-6**, `e560123`)
- **T-14** (auditoria backend): mapa `AC → teste` do serviço; 3 lacunas de prova fechadas (determinismo do desempate no drill-down entre ordens de entrada; `q` casando itens em 2 mercados preservando os grupos A→Z no caso de uso e no corpo HTTP). Suíte do serviço **146/146**, `shopping-list-service` **206/206** (sem regressão), `0/0` no banco.
- **T-15** (auditoria unitária da PWA): mapa `AC → teste`; 11 casos novos e **um bug real corrigido** no template da lista — guard CD-09 (`@if (group.items.length > 0)`), defensivo contra grupo vazio vindo do serviço. Suíte `web` **316/316**, lint e build verdes.
- **R-3 encerrado:** a janela de suítes vermelhas por design terminou (T-04 → T-13). A suíte completa verde era exigida nas auditorias (T-14/T-15) e foi alcançada; o gate de UI é a **T-16**.
- Regra de commit: **por ponto de commit** (PC-0…PC-8), não por T isolada quando a suíte estiver vermelha por design (R-3)

### Evidência PC-6 (auditorias, 2026-10-20)

- `npx nx test price-history-service --skip-nx-cache` → **23 arquivos / 146 testes, todos verdes**
- `npx nx test web --skip-nx-cache` → **30 arquivos / 316 testes, todos verdes**
- `npx nx test shopping-list-service --skip-nx-cache` → **20 arquivos / 206 testes, verdes** (sem regressão pela evolução do contrato compartilhado)
- `docker exec … psql -c "select (select count(*) from purchases) …, (select count(*) from purchase_items) …"` → **0 / 0** (higiene da T-03 confirmada)
- **T-15 — falsificação (obrigatória na tarefa):** removido o guard CD-09 do template → `lowest-price-page.spec.ts > "não exibe cabeçalho de mercado para grupo sem item (AC-02/CD-09)"` **falhou** (`AssertionError: expected 0 to be greater than 0`); guard reposto → verde; `git diff` do arquivo com apenas as +4 linhas intencionais

## Pendências e bloqueios

- **Nenhum bloqueio.** Implementação concluída (T-01…T-15); falta o gate de UI (**T-16**) e a lição (**T-17**). O retrabalho de higiene de teste da v1 foi **incluído no plano** e entregue (T-03).
- **Follow-up registrado (R-4):** banco de **teste** dedicado para o `price-history-service` — hoje a suíte de integração trunca o banco de **dev** `price_history` (higiene determinística da T-03 garante `0/0` ao fim). Registrado como pendência de ambiente na lição **T-17**.
- **Follow-up não bloqueante:** `lowest-price-page.scss` estoura o budget em 262 bytes (4,26 kB > 4 kB) — PRÉ-EXISTENTE do PC-5 (`74b0e58`), não introduzido pelas auditorias. Ajustar budget ou enxugar o estilo como follow-up, sem abrir reabertura de T-12.
- **Observação de processo (2026-10-19):** o agente `product-spec` teve `edit`/`write` **negados** em `docs/product/**` e aplicou a atualização do `initial-scope.md` via shell, com autorização explícita do usuário na rodada. O orquestrador verificou o diff (2 linhas, exatamente o aprovado). Se a intenção é que esse agente edite escopo de produto, ajustar a permissão dele em `.opencode/agents/product-spec.md`/configuração — caso contrário, o fluxo depende de contorno manual.

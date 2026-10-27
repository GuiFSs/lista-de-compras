# Estado da feature — Menor preço por mercado

**Fase atual:** **Validação aprovada e integrada na master** (feature-validator — 16/16 ACs; Superfície de UI = sim, gate ADR 0008 reproduzido: `npx nx e2e web-e2e --skip-nx-cache` → 72/72, filtro da feature → 28/28). Implementação concluída (T-01..T-17; PC-0..PC-8); integrada via PR #5 mergeado em 2026-10-21 (merge commit 0f237e4).
**Gate atual:** SPEC e PLAN aprovados (`Aprovado pelo usuário em 2026-10-19`); `ARCHITECTURE-REVIEW.md` Aprovada com ressalvas (nenhuma bloqueante), R-1…R-6 incorporadas; **ADR 0011 aceita** (T-01); **VALIDATION.md aprovada** (16/16 ACs). Branch `feature/lowest-price-by-market`; PC-0…PC-8 commitados (último: `d8e62cc` + lição `3932133`). Suítes verdes: price-history-service 146/146, web 316/316, shopping-list-service 206/206, E2E web-e2e 72/72 (filtro 28/28). Sem AC/T reaberto.
**Última atualização:** 2026-10-21
**Próxima ação:** nenhuma pendente de código (feature integrada na master via PR #5). Pendências não bloqueantes: follow-up do banco de teste dedicado (R-4) e budget do lowest-price-page.scss (4,26 kB > 4 kB, pré-existente do PC-5). Verificação de deploy (Render) pendente, se aplicável.

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
- Validação: `docs/features/lowest-price-by-market/VALIDATION.md` — **aprovada** (16/16 ACs) em 2026-10-20 (feature-validator)

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

### Evidência T-16 (E2E Playwright + gate de UI, 2026-10-20)

Comandos reais (branch `feature/lowest-price-by-market`, PC-7):

- **Suíte completa:** `npx nx e2e web-e2e --skip-nx-cache` → **72 passed (37.5s)**, 0 failed, 0 skipped. `Successfully ran target e2e for project web-e2e and 5 tasks it depends on`.
- **Filtro da feature:** `npx nx e2e web-e2e --skip-nx-cache -- --grep "[Mm]enor preço"` → **28 passed (17.4s)**, 0 failed, 0 skipped.

Arquivos E2E tocados (somente `apps/web-e2e/**`):

- `support/price-history-fake-api.ts` — fake serve os **dois shapes** (`{ markets }` agrupado e `{ markets: [{ market, items[] }] }`), a **rota do item** `GET …/lowest-prices/{item}` e **normaliza o parâmetro decodificado** (espelha o caso de uso, R-1); 404/401 canônicos; `lowestPricesByItem` seeds.
- `support/price-history-fixtures.ts` — fixtures agrupadas, de drill-down e de busca; item com `/` (`leite/acucar`, com `nameNormalized` **sem acento** como o serviço — `normalizeItemName` remove diacríticos) e empate; constantes de segmento percent-encoded (`CAFE_ITEM_PARAM`, `LEITE_ACUCAR_*`).
- `price-history/lowest-price.spec.ts` (atualizado) — agrupamento, metadados/empate, busca, empty, skeleton, erro+retry, tab-repeat da busca.
- `price-history/lowest-price-by-market.spec.ts` (**novo**) — drill-down: toque com URL `/menor-preco/cafe`, R-1 (`/menor-preco/caf%C3%A9` resolve), 3 mercados A→Z, menor no mesmo mercado, 1 mercado, voltar/entrada pela nav preservando a busca, R-2 (`leite%2Fa%C3%A7%C3%BAcar`), 404→não encontrado, skeleton/erro+retry, URL percent-encoded + `Authorization` (ADR 0011), 401, 360px.
- `price-history/nav.spec.ts` — **revisado, sem alteração** (AC-21/ADR 0010 intactos e verdes).

Matriz AC ↔ E2E (16/16, não um E2E por AC):

| AC | Arquivo:linha |
| --- | --- |
| AC-01 | `lowest-price.spec.ts:15` |
| AC-02 | `lowest-price.spec.ts:42` |
| AC-03 | `lowest-price.spec.ts:15` |
| AC-04 | `lowest-price.spec.ts:65` |
| AC-05 | `lowest-price-by-market.spec.ts:30` |
| AC-06 | `lowest-price-by-market.spec.ts:75` |
| AC-07 | `lowest-price-by-market.spec.ts:103` |
| AC-08 | `lowest-price-by-market.spec.ts:117` |
| AC-09 | `lowest-price.spec.ts:89` |
| AC-10 | `lowest-price.spec.ts:144` |
| AC-11 | `lowest-price-by-market.spec.ts:142,175`; `lowest-price.spec.ts:214` |
| AC-12 | `lowest-price-by-market.spec.ts:268` |
| AC-13 | `lowest-price.spec.ts:125`; `lowest-price-by-market.spec.ts:288` |
| AC-14 | `lowest-price.spec.ts:161,184`; `lowest-price-by-market.spec.ts:288` |
| AC-15 | `lowest-price-by-market.spec.ts:352` |
| AC-16 | `lowest-price-by-market.spec.ts:373`; `lowest-price.spec.ts:144` |

**Veredito R-2 (round-trip do nome com `/`):** **provado de ponta a ponta nos cinco pontos** exigidos pelo critério de fechamento do PLAN — domínio (`domain/lowest-prices.spec.ts`, barra preservada em `leite/acucar`), Fastify (`price-history.controller.spec.ts`, 200 em `…/leite%2Fa%C3%A7%C3%BAcar`), PWA (`price-history-api.service.spec.ts`, URL codificada) e rota (`app.routes.spec.ts`, segmento único), mais a jornada E2E (`lowest-price-by-market.spec.ts`). O link da lista carrega `encodeURIComponent(nameNormalized)` (`leite%2Facucar`), resolve como segmento único e a tela mostra `Leite/Açúcar` — **sem 404**; a navegação direta por `/menor-preco/leite%2Fa%C3%A7%C3%BAcar` (nome cru acentuado) também resolve.
**Consequência (critério do próprio PLAN):** a limitação da § Riscos e a nota da § Perguntas resolvidas **foram retiradas** em **2026-10-20** (commit `2a55d05`), ficando só a nota "coberto por teste"; a § Contratos também foi ajustada ("R-2 refutado"). A edição foi feita pelo **`tech-planner`** (dono do plano — o orquestrador não tem escrita em `PLAN.md`). **Não houve mudança de escopo:** a decisão aprovada pelo usuário permanece a mesma; o plano cumpriu o seu próprio critério de fechamento. Os 45+/-37 linhas do diff tocaram **só** os pontos do critério (nenhuma tarefa `T-*`, matriz AC↔E2E ou outro risco alterado — 17 tarefas e as decisões do usuário conferidas após o diff).
**Correção de premissa:** o `nameNormalized` real é **sem acento** (`Café` → `NFKD` + remoção de diacríticos → `cafe`), então o link da lista é `/menor-preco/cafe` — coerente com a linha AC-05 da matriz do PLAN. A URL acentuada `/menor-preco/caf%C3%A9` continua provada, por navegação direta (encode → decode → normalize no caso de uso, R-1).

**Veredito R-5 (404 → não encontrado, não erro+retry):** **confirmado.** `/menor-preco/item-inexistente` mostra `.empty--not-found` ("Nenhum preço por mercado encontrado") com voltar, e **não** há `role=alert` nem botão "Tentar novamente" — o 404 vira `notFound` no store, não `error`.

**Hermeticidade:** todas as rotas do `price-history` (`/api/price-history/**`) são interceptadas pelo fake tipado por `@lista/contracts`; nenhum Docker/DB/JWT real. **Sem quebra da v1:** as jornadas de auth, lista, histórico e checkout seguem verdes (72/72 na suíte completa).

**Correção de premissa registrada no handoff (não é decisão de comportamento):** o serviço normaliza **removendo acentos** (`normalizeItemName('Café') = 'cafe'`), então o `nameNormalized` é `cafe` e o link real da lista é `/menor-preco/cafe` — coerente com a linha AC-05 da matriz do PLAN. A URL acentuada continua provada, porém por navegação direta (R-1/R-2). Nenhum comportamento da spec foi escolhido.

## Últimos handoffs

### feature-validator — Validação final (`VALIDATION.md`, 2026-10-20)

```text
Tarefa: Validação final da feature lowest-price-by-market
Estado: aprovada — 16/16 ACs com evidência executável
Arquivos alterados: docs/features/lowest-price-by-market/VALIDATION.md (novo); docs/features/lowest-price-by-market/STATUS.md (fase/gate/próxima ação/handoff). Nenhum código alterado.
ACs cobertos: AC-01…AC-16 — todos com cenário Playwright citado (matriz AC↔E2E do PLAN 16/16) e corrida real reproduzida (72/72, filtro 28/28), mais evidência unit/integração complementar (price-history-service 146/146, web 316/316, shopping-list-service 206/206). Nenhum AC backend-only nesta feature (AC-15 tem perna de backend adicional).
Testes executados: npx nx test web (30/316), npx nx test shopping-list-service (20/206), npx nx test price-history-service (23/146), npx nx e2e web-e2e (72/72, 39.7s), filtro "[Mm]enor preço" (28/28, 19.8s), lint 4 projetos (0), build web (verde, aviso de budget pré-existente), grep de cor hardcoded (0), docker exec psql (0/0), git ls-files (.env apenas .env.example). Todos verdes.
Decisões registradas: VALIDATION.md aprovada; checklists de documentação e de design completas; contratos/ADR 0011 (Aceita + ponte ADR 0010 §1)/revisão arquitetural/README/.env.example/lição T-17/segurança transversal conferidos. Limitação R-2 retirada do PLAN (2a55d05) ratificada; 404→não encontrado (R-5) confirmado; suíte vermelha por design (R-3) encerrada.
Pendências: follow-up do banco de teste dedicado (R-4) e budget do lowest-price-page.scss (4,26 kB > 4 kB, pré-existente do PC-5) — não bloqueantes, não mudam comportamento/contrato/arquitetura. Nenhum AC a reabrir.
Próximo passo recomendado: decisão do usuário — push da branch feature/lowest-price-by-market, abertura de PR e, após aprovação, merge na master (skill git-workflow). Push/PR/merge permanecem decisão do usuário.
```

## Pendências e bloqueios

- **Nenhum bloqueio de código.** Implementação, gate de UI e lição **fechados** (T-01…T-17; PC-0…PC-8). Falta apenas a **validação final** (`feature-validator` → `VALIDATION.md`). O retrabalho de higiene de teste da v1 foi incluído no plano e entregue (T-03).
- **Feito (2026-10-20):** retirada da limitação **R-2** do `PLAN.md` (`2a55d05`) — critério de fechamento cumprido; edição do `tech-planner`. **Feito:** lição **T-17** (`3932133`, PC-8).
- **Follow-up registrado (R-4):** banco de **teste** dedicado para o `price-history-service` — hoje a suíte de integração trunca o banco de **dev** `price_history` (higiene determinística da T-03 garante `0/0` ao fim). Registrado na lição T-17 como pendência de ambiente.
- **Follow-up não bloqueante:** `lowest-price-page.scss` estoura o budget em 262 bytes (4,26 kB > 4 kB) — PRÉ-EXISTENTE do PC-5 (`74b0e58`), não introduzido pelas auditorias nem pelo E2E. Ajustar budget ou enxugar o estilo como follow-up, sem abrir reabertura de T-12.
- **Observação de processo (2026-10-19):** o agente `product-spec` teve `edit`/`write` **negados** em `docs/product/**` e aplicou a atualização do `initial-scope.md` via shell, com autorização explícita do usuário na rodada. O orquestrador verificou o diff (2 linhas, exatamente o aprovado). Se a intenção é que esse agente edite escopo de produto, ajustar a permissão dele em `.opencode/agents/product-spec.md`/configuração — caso contrário, o fluxo depende de contorno manual.

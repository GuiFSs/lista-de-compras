# Estado da feature — Lista de compras

**Fase atual:** **Concluída** (Rodada 1 + Rodada 2 validadas e **integradas** em
`master` via **PR #3**). A Rodada 1 (lista ativa, 26/26 ACs) e a Rodada 2 (máscara
BRL, AC-27 + cross-refs) seguem fechadas; **nenhum AC/T reaberto**.
**Gate atual:** **fechado** — feature integrada; não há próxima ação nesta feature.
**Última atualização:** 2026-10-16
**Próxima ação:** nenhuma nesta feature. A **próxima feature de produto** no escopo
inicial é o **histórico de preços** (`price-history`) — ver
`docs/product/initial-scope.md` § Histórico de preços e ADR 0001.

## Artefatos

- Spec: `docs/features/shopping-list/SPEC.md` — **Rodada 1 aprovada em 2026-10-13**
  (26 ACs; CD-01–CD-13) + **Rodada 2 aprovada em 2026-10-14** (**AC-27**/RN-21/
  CD-14/CD-15 — máscara de centavos em BRL nos dois campos de preço; **27 ACs**,
  CD-01–CD-15; **D-02 resolvida**; nenhuma decisão aberta)
- Plano: `docs/features/shopping-list/PLAN.md` — **Rodada 1 aprovada em 2026-10-13**
  (17 tarefas `T-01…T-17`, matriz AC ↔ E2E com 26 ACs, `Superfície de UI: sim`,
  contrato HTTP completo, `Eventos: nenhum`; status `Aprovado`); **Rodada 2
  aprovada em 2026-10-14** (seção "Rodada 2": `Superfície de UI: sim`, matriz AC ↔ E2E
  com **AC-27** + cross-refs, tarefas **T-20…T-23**, ordem sequencial sem
  paralelismo, impacto nos testes existentes por arquivo/linha; **gate fechado** com
  a frase canônica `Aprovado pelo usuário em 2026-10-14`; todas as T concluídas)
- ADR: `docs/decisions/0009-excecao-temporaria-ao-gateway-shopping-list-service.md`
  — registrada (exceção temporária à ADR 0001 para o `shopping-list-service`);
  ADR 0006 §1 e Consequências com nota apontando para a 0009
- Revisão arquitetural: **não aplicável** nesta rodada (um único serviço backend, sem
  contrato entre serviços, sem evento, sem mudança de ownership); revisão opcional e
  não bloqueante registrada no `PLAN.md` (limitada à ADR 0009 e ao contrato
  PWA↔serviço)
- Validação: `docs/features/shopping-list/VALIDATION.md` — **aprovada em
  2026-10-14** pelo `feature-validator` (**26/26 ACs aprovados**, 0 reprovados);
  evidência por AC com Playwright nos ACs observáveis na UI e integração no AC-09

## Escopo da Rodada 2 (confirmado com o usuário em 2026-10-14)

- **Ajuste pedido:** os campos de **preço** passam a **formatar automaticamente em
  BRL (R$)** enquanto a pessoa digita, com **máscara de centavos**: cada dígito
  entra pela direita e é tratado como centavos (`3` → `R$ 0,03`; `30` → `R$ 0,30`;
  `3015` → `R$ 30,15`).
- **Campos alcançados (decisão do usuário):** os **dois** — "Preço (R$)" do sheet
  de adicionar/editar item (`item-form-sheet`) e "Preço por unidade (R$)" do sheet
  de marcar como comprado (`purchase-sheet`).
- **Fora do ajuste:** o campo de **quantidade** continua com digitação livre de
  decimal (vírgula ou ponto); o **contrato HTTP** não muda (o payload segue número
  JSON); o **backend não é tocado**.
- **Superfície de UI:** **sim** (ADR 0008) ⇒ exige matriz AC ↔ E2E e jornada
  Playwright nova/atualizada para o AC novo.
- **Rastreabilidade:** a decisão vira `CD-14` na `SPEC.md` e refina `RN-06`/`CD-08`
  para os **campos de preço** (a quantidade permanece como está).

## Escopo desta rodada (confirmado com o usuário)

- **Somente a lista de compras ativa**: obter a lista, adicionar/editar/excluir/
  restaurar item, marcar/desmarcar item como comprado e concluir a compra.
- **Fora desta rodada**: histórico de preços, menor preço e comparação — virão em
  feature(s) futura(s) (`price-history` etc.). A conclusão da compra **não** publica
  evento, **não** grava registro e **não** expõe rota de histórico (RN-16/AC-21); o
  envio ao histórico por evento (previsto na ADR 0001) é contrato da **feature de
  histórico**, fora desta rodada, sem ADR criada aqui.

## Execução

- **Rodada 2:** tarefa em andamento: **nenhuma**; **T-20, T-21, T-22 e T-23
  concluídas** e a **auditoria de testes** do `test-engineer` **concluída** (lacuna
  CD-15(c) — limite artificial de dígitos — fechada só em `*.spec.ts`); suíte `web`
  verde com **204 testes / 21 arquivos** e `web-e2e` com **36 testes** (4 jornadas de
  máscara); **reabertas: nenhuma**. **Validação da Rodada 2 aprovada** pelo
  `feature-validator` (AC-27 + cross-refs; 0 reprovados, 0 reabertos). Falta apenas a
  **decisão do usuário** sobre push/PR/merge
- Tarefa em andamento: **nenhuma**
- Tarefas concluídas (Rodada 1): T-01 … T-19 (todas)
- Critérios comprovados: backend completo (T-01–T-07) + **prova com Postgres real**
  (T-15) + **corrida de duplicidade corrigida** (T-18) — suíte
  `shopping-list-service` com **162 testes**, 14 arquivos; PWA completa em código e
  com **mapa AC → teste** (T-10–T-14, T-16) — suíte `web` com **177 testes**, 20
  arquivos; **E2E de UI da feature (T-17)** — `apps/web-e2e` com **32 testes**
  (6 jornadas da lista + 6 de auth), `npx nx e2e web-e2e` → **32 verdes**;
  `npx nx typecheck web` verde (T-19) e `npx nx sync:check` verde
- ACs com evidência unit/integração: AC-01–AC-26 (mapa em T-16)
- ACs com evidência Playwright (UI): AC-01–AC-08, AC-10–AC-20, AC-22–AC-26 (matriz
  do `PLAN.md`; AC-09 é backend-only — integração). **Gate de UI de ADR 0008
  satisfeito.**
- **Validação:** `VALIDATION.md` registra **26/26 ACs aprovados**; a corrida
  Playwright (`npx nx e2e web-e2e` → 32 passed) foi executada pelo
  `feature-validator` e reconferida pelo orquestrador; banco deixado com 0 linhas
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- **Nenhum bloqueio.** O gate do plano segue fechado e a corretiva T-18 está
  concluída.
- **Sync do workspace (resolvido):** T-10 passou `apps/web` a importar
  `@lista/contracts` sem registrar a *project reference*, deixando o workspace fora
  de sync (`nx sync:check`/`nx build` (workspace)/`nx e2e` falhavam antes de
  executar). O orquestrador rodou `nx sync` e commitou o ajuste de
  `apps/web/tsconfig.app.json` em `f5a68a4` (`npx nx sync:check` verde). **Gate de
  UI (T-17) desbloqueado.**
- **Decisão do usuário (2026-10-13) — resolvida em T-18:** em POSTs
  **concorrentes** com o mesmo nome, o `CreateShoppingListItemUseCase` fazia
  *read-then-write* (TOCTOU) e o erro do índice único subia como **500 em vez de
  409**. Corrigido (`3d20cd8`): a violação `23505` entra pelo **port** como
  `ActiveItemNameConflictError` (traduzida no adaptador Drizzle) e o caso de uso
  **relê uma vez** reaplicando a decisão de duplicidade — soma quando
  `duplicateResolution: 'sum-planned-quantity'`, senão **409** canônico
  (`duplicateOf`); degrada para 409 (nunca 500). Erro alheio ao índice continua
  propagando. A spec era silente sobre a corrida; a correção só alinha a corrida à
  regra de duplicidade **já documentada** (nenhum AC novo, sem migração e sem
  contrato HTTP novo).
- **Encaminhamento (não bloqueio):** o contrato do **evento de conclusão de compra**
  (previsto na ADR 0001) fica para a **feature de histórico** — fora desta rodada.
- **Pré-requisito de teste (novo):** a suíte `shopping-list-service` agora **exige
  Docker no ar + `db:migrate`** (a integração de T-15 usa PostgreSQL real):
  `npm run docker:up` + `npx nx run shopping-list-service:db:migrate`.
- **Porta do E2E:** `npx nx e2e web-e2e` (comando de evidência de T-17) falha se um
  `serve` já ocupar a 4200/3001 (o alvo implícito `web:serve:development` não sobe).
  Com um `ms-all` no ar, rodar `npx playwright test --config
  apps/web-e2e/playwright.config.mts`. Para o gate de T-17, garantir as portas livres.
- **Nit de doc (concluído em T-18, `3d20cd8`):** `libs/contracts/README.md` passou a
  citar a mensagem canônica `Corpo da requisição inválido` (JSON malformado).
- **Nota de escopo (resolvida):** para T-06 honrar o contrato **201 (criado) / 200
  (soma aplicada)** do `POST /items`, o orquestrador autorizou uma alteração
  **aditiva** em `create-shopping-list-item.use-case.ts`/`shopping-list-result.ts`
  (`created?: boolean`), implementada e com testes verdes.
- **Regressão de `typecheck` causada pela T-10 (corrigida na T-19, `b16f000`):**
  `apps/web` passou a importar `@lista/contracts` (T-10, `5c5c67f`) e a *project
  reference* foi adicionada **só** ao `tsconfig.app.json` (`f5a68a4`) — o
  `tsconfig.spec.json` ficou sem ela, então `npx nx typecheck web` falhava com
  **10 erros** (`TS6059` + `TS6307`). `build`/`test`/`lint`/`e2e` **não** pegam
  porque usam outros tsconfigs. Prova de que é **nossa** regressão e não
  pré-existente: `git log --reverse -S"@lista/contracts" -- apps/web/src` → o
  primeiro commit é `5c5c67f` (T-10). Correção: a mesma reference no
  `tsconfig.spec.json` (T-19). **O handoff de T-17 rotulou esses erros como
  "pré-existentes/alheios" — está incorreto; corrigido aqui.**
- **Correção de flake no E2E de auth (T-17, fora do escopo da feature):**
  `apps/web-e2e/src/app.spec.ts` › "duplo toque gera uma requisição (AC-04)" era
  **instável sob carga** (falhava com 2 requisições no run completo e passava
  isolado). Causa: o teste simulava o duplo toque com `click()` + `click({ force:
  true })`; o 2º `click` **re-resolve o locator pelo nome acessível** e, com a 1ª
  resposta já de volta, o "2º toque" virava um **envio novo** (não um duplo toque).
  O comportamento do produto está correto (`isSubmitting` síncrono + `disabled`).
  Corrigido para `submit.dblclick()` (mesmo padrão já usado em AC-26), sem mudar a
  asserção (`requests === 1`). Evidência antes/depois registrada no handoff de T-17.
  **Revisar/aceitar ou reverter** livremente — não altera a evidência de nenhum AC
  da lista.
- **Observação de UI (não bloqueante, sem AC):** o toast de **erro persistente**
  (AC-23) fica em `--z-toast (300)`, acima do `--z-overlay (200)` dos bottom
  sheets, e é ancorado logo acima do bottom nav — ele **cobre** os botões do rodapé
  de um sheet aberto. As jornadas de T-17 contornam descartando o toast (botão
  "Dispensar", previsto em AC-23) antes de interagir com o sheet. Se o
  comportamento desejado for outro (ex.: o sheet empurrar/ocultar o toast), é
  decisão de design para uma tarefa própria — **não** foi alterado nesta rodada.
- **Recomendações não bloqueantes da validação** (o `feature-validator` julgou as
  três como **não** bloqueantes — ver `## Julgamentos exigidos pelo DoD` no
  `VALIDATION.md`); ficam para decisão do usuário/features futuras:
  1. **Toast × sheet:** decidir se o toast de erro deve cobrir o rodapé do sheet
     ou se o sheet deve ocultá-lo/empurrá-lo (hoje `--z-toast` 300 > `--z-overlay`
     200, com o toast ancorado acima do bottom nav).
  2. **Nit de doc em `libs/contracts/README.md`:** explicitar que, na borda,
     **JSON malformado responde 400 antes do `401`** do `JwtAuthGuard` (precedência
     de parse; paridade com o `auth-service`). Não é pendência de contrato.
  3. **`docs/lessons/`:** promover os aprendizados de T-18 (erro de unicidade pelo
     port, recuperação *bounded*) e T-19 (`typecheck` valida *project references*;
     `build`/`test` não) se forem considerados transferíveis.
- **Higiene antes do PR (resolvida):** os 3 arquivos `.opencode/agents/*.md`
  (`architecture-review`, `product-spec`, `tech-planner` — `bash: deny` → `bash: ask`)
  foram commitados em `b292cba` (`chore(agents): permite bash sob confirmacao nos
  agentes de spec/plano/review`) como mudança pré-existente e **fora** desta feature;
  nenhuma T desta feature os tocou.

## Últimos handoffs

### VALIDAÇÃO da Rodada 2 — aprovada (`feature-validator`)

- Tarefa: revalidação da Rodada 2 — **`AC-27`** (novo, validado integralmente) +
  cross-refs **`AC-04`/`AC-10`/`AC-13`/`AC-15`/`AC-25`** (conferir que continuam
  provados após a mudança); os demais ACs da Rodada 1 permanecem aprovados
  (só reabririam por regressão real).
- Estado: **concluída — VALIDAÇÃO DA RODADA 2 APROVADA** (26/26 da Rodada 1
  seguem válidos; `AC-27` aprovado; **0 reprovados; 0 ACs reabertos**).
- Arquivos alterados (documentação — nenhum código/spec/teste tocado):
  - `docs/features/shopping-list/VALIDATION.md` — nova seção **"# Rodada 2 —
    máscara de centavos em BRL"** no fim do arquivo (evidência por AC, regressão,
    checklist de documentação, checklist de design, verificações transversais,
    pendências, julgamentos do DoD, comandos com saída real e parecer), mais um
    ponteiro de 4 linhas no topo. **A seção da Rodada 1 (26/26 ACs, 2026-10-14)
    ficou intacta.**
  - `docs/features/shopping-list/STATUS.md` — **este bloco** (logo após
    `## Últimos handoffs`). O topo (fase/gate/próxima ação) **não** foi tocado —
    é do orquestrador.
- ACs cobertos (evidência por critério, com comando + resultado reais):
  - **`AC-27` — aprovado.** Exibição dígito a dígito nos **dois** campos
    (`3`/`30`/`3015` ⇒ `R$ 0,03`/`R$ 0,30`/`R$ 30,15`), campo **vazio sem
    `R$ 0,00`**, **payload número** (`plannedPrice: 30.15`, PATCH `1234.56`,
    `unitPrice: 30.15`), sem separador de milhar (`R$ 1234,56`), apagar = 1
    dígito por toque, colar mantém só dígitos, **sem limite artificial**
    (9/10 dígitos reais via teclado na E2E + helper), prefill na edição
    (`12.5` ⇒ `R$ 12,50`) e draft do desmarcar (`R$ 1234,56`/`R$ 9,90`).
    Unit: `money.spec.ts` (helper) + `item-form-sheet.spec.ts`/
    `purchase-sheet.spec.ts`; E2E: `items.spec.ts:159`, `items.spec.ts:195`,
    `purchase.spec.ts:218`, `purchase.spec.ts:260`.
  - **`AC-04`/`AC-10`/`AC-13`/`AC-15`/`AC-25` — cross-refs reconfirmados**
    (unit + Playwright; nenhum cenário da Rodada 1 removido — os campos de preço
    passaram a receber **dígitos**). Destaques: preço vazio cria o item com
    `plannedPrice: null` (AC-04); Editar abre na máscara e salva o número
    (AC-10); preço vazio ⇒ `aria-invalid`/`aria-describedby` +
    `Informe o preço por unidade.` e **0** `PUT /purchase` (AC-13); preço por
    unidade começa vazio e a **quantidade segue com digitação livre de decimal**
    (`2,5`/`1,5`) (AC-15); rótulo/erro/aria/foco do campo mascarado pelos mesmos
    tokens, sem `.scss` novo, com a jornada de AC-25 verde (AC-25).
- Testes executados (comando + resultado reais, **executados por mim** em
  2026-10-15 — nunca por inferência; portas 4200/3001 livres antes e depois):
  - `npx nx lint web` → **`All files pass linting`**, `Cache: 0/1 hit`, exit 0;
    `npx nx lint web-e2e` → `Successfully ran target lint for project web-e2e`,
    `Cache: 0/1 hit`, exit 0.
  - `npx nx typecheck web` → **verde** (exit 0); `npx nx sync:check` →
    **`All files are up to date.`** (exit 0).
  - `npx nx test web` → veio do **cache do Nx** (`1/1 hit`), então repeti
    `npx nx test web --skip-nx-cache` → **`204 passed (204)` / `21 passed (21)`
    arquivos**, exit 0 (`Cache: Skipped`).
  - `npx nx e2e web-e2e -- --grep "máscara"` → veio do **cache local** (4 passed);
    repeti `npx nx e2e web-e2e --skip-nx-cache -- --grep "máscara"` →
    **`4 passed (2.9s)`** (`Running 4 tests using 2 workers`), exit 0 — as 4
    jornadas de máscara.
  - `npx nx e2e web-e2e --skip-nx-cache` → **`36 passed (21.6s)`**
    (`Running 36 tests using 6 workers`), exit 0 — as **32** jornadas da
    Rodada 1 (load 6, items 6, duplicates 2, purchase 7, delete-undo 1,
    checkout 4, auth 6) **mais** as **4** jornadas novas de máscara (items 8 e
    purchase 9 no total; **a máscara são 2+2**) ⇒ **nenhuma regressão**.
  - Conferências de repositório: `git status --porcelain` **vazio** na branch
    `feature/shopping-list`; `git diff --stat 89e7d75..HEAD` = 13 arquivos, todos
    em `apps/web`, `apps/web-e2e` e docs — **sem** `libs/contracts`, **sem**
    `apps/shopping-list-service`, **sem** `docs/decisions`, **sem** `.scss`
    (diffs vazios nesses caminhos).
- Decisões registradas: (1) **`AC-27` aprovado** com evidência executável nos
  dois campos e **payload número** — o contrato HTTP **não** mudou (`libs/contracts`
  sem diff; tipos seguem `plannedPrice: number \| null`, `unitPrice: number`);
  (2) **nenhuma ADR nova** era devida (formatação de entrada da PWA; sem
  contrato/dados/ownership) e `docs/decisions/` confirma 0009 como última;
  (3) **as reescritas dos dois casos `-1`** (aprovadas no gate do plano, item 4)
  **preservam a prova**: a regra defensiva permanece no código e a cobertura
  "quantidade > 0 sem requisição" segue existindo nos dois specs; (4) os 3
  pontos levantados pelo `test-engineer` (payload E2E >6 dígitos; `:focus-visible`
  genérico no AC-25; `inputmode="decimal"` da quantidade) foram julgados
  **não bloqueantes** (detalhe em `VALIDATION.md` › Julgamentos do DoD) e viram
  recomendações; (5) **nenhum AC da Rodada 1 foi reaprovado por suposição** —
  a não-regressão se apoia na passagem das jornadas/testes originais.
- Pendências: **nenhuma bloqueante**; **nenhum AC a reabrir**; **nenhuma T
  reaberta**. Recomendações **não bloqueantes** (decisão do usuário/features
  futuras): assertar o payload com >6 dígitos na E2E (1 asserção); asserir
  `:focus-visible` **no próprio** campo mascarado; asserir `inputmode="decimal"`
  da quantidade; registrar o padrão da máscara no `GUIA-DESIGN` §5 e reusar
  `formatBrlFromDigits` em `item-row` quando ele for tocado.
- Próximo passo recomendado: orquestrador **encerra o gate de Validação da
  Rodada 2** (fase → Validada) e leva ao usuário a decisão de **push/PR** —
  aprovações **explícitas e separadas** (skill `git-workflow`). Nada de código
  pendente; a Rodada 1 não foi reaberta.

### Auditoria de testes da Rodada 2 (`test-engineer`)

- Tarefa: auditoria de testes (Rodada 2)
- Estado: **concluída**
- Arquivos alterados (escopo permitido `*.spec.ts`; nada de produção; sem commit):
  - `apps/web/src/app/shared/money/money.spec.ts` — **+2 testes** (lacuna fechada,
    ver "Decisões"): `não há limite artificial de dígitos (CD-15)` no
    `formatBrlFromDigits` e `não há limite artificial de dígitos no payload (CD-15)`
    no `numberFromDigits`.
  - `apps/web-e2e/src/shopping-list/items.spec.ts` — **+1 passo** na jornada
    "máscara no preço planejado: apagar…": `pressSequentially('3456789')` após os
    backspaces ⇒ `R$ 1234567,89` (9 dígitos reais via teclado).
  - `apps/web-e2e/src/shopping-list/purchase.spec.ts` — **+1 passo** na jornada
    "máscara no preço por unidade: apagar…": `pressSequentially('2345678')` ⇒
    `R$ 30123456,78` (10 dígitos reais via teclado).
  - Este `STATUS.md`. Total: **3 arquivos, +16 linhas, 0 removidas**.
- ACs cobertos (mapa AC → teste, `arquivo › título`):
  - **AC-27** (RN-21/CD-14/CD-15) — nos **dois** campos:
    - centavos pela direita `3/30/3015` ⇒ `R$ 0,03/R$ 0,30/R$ 30,15`:
      `money.spec.ts › formata os dígitos como centavos, entrando pela direita` +
      `item-form-sheet.spec.ts › máscara de centavos em BRL: 3/30/3015 viram…` +
      `purchase-sheet.spec.ts › máscara de centavos em BRL: 3/30/3015 viram…` +
      `items.spec.ts › máscara de centavos em BRL no preço planejado: digitar
      3/30/3015… e envia o número` + `purchase.spec.ts › máscara de centavos em BRL
      no preço por unidade: digitar 3015 mostra R$ 30,15 e envia 30.15`;
    - payload **número** (contrato inalterado): mesmas 2 jornadas E2E (fake api:
      `plannedPrice: 30.15` / `unitPrice: 30.15`; e `PATCH plannedPrice: 1234.56`) +
      as asserções de store nos 2 specs de sheet;
    - vazio = ausência, sem `R$ 0,00`: `item-form-sheet.spec.ts › adiciona só com
      o nome… (AC-04)` (`priceValue === ''` ⇒ `plannedPrice: null`),
      `purchase-sheet.spec.ts › pré-preenche… preço por unidade vazio (AC-15)` +
      `toHaveValue('')` inicial nas 2 jornadas E2E;
    - sem separador de milhar: `money.spec.ts › acima de mil não usa separador de
      milhar (CD-15)` + `…colar mantém só os dígitos, sem separador de milhar` nos
      2 sheets + `fill('R$ 1.234,56') ⇒ R$ 1234,56` nas 2 jornadas E2E;
    - apagar = 1 toque/dígito: `…um backspace apaga um dígito (RN-21/CD-15)` nos 2
      sheets + `press('Backspace')` nas 2 jornadas E2E (`R$ 12,50`→`R$ 1,25`;
      `R$ 30,15`→`R$ 3,01`);
    - colar só dígitos: `money.spec.ts › descarta prefixo, separadores, sinal e
      letras — inclusive ao colar` + 2 sheets + 2 jornadas E2E;
    - **sem limite artificial (lacuna fechada por esta auditoria)**:
      `money.spec.ts › não há limite artificial de dígitos (CD-15)` (+ payload) e os
      2 passos novos de teclado nas jornadas E2E (9/10 dígitos);
    - prefill na edição: `item-form-sheet.spec.ts › prefill da edição na máscara…`,
      `shopping-list-page.spec.ts › …Editar preenche o formulário (AC-10)` ⇒
      `R$ 12,50`, `items.spec.ts › máscara no preço planejado: apagar…` (E2E);
    - draft no desmarcar: `purchase-sheet.spec.ts › usa os valores preservados…
      (AC-16)` ⇒ `R$ 9,90`, `shopping-list-page.spec.ts › desmarcar… preserva os
      digitados (AC-16)` ⇒ `R$ 9,90`, `purchase.spec.ts › máscara no preço por
      unidade: apagar…` (E2E: reabre `R$ 1234,56`);
    - sem sinal/negativo: `…a máscara não aceita sinal: "-" não vira dígito…` nos 2
      sheets; `inputmode="numeric"`: `…o campo de preço usa teclado numérico
      (AC-27)` nos 2 sheets.
  - **AC-04** (cross-ref): `item-form-sheet.spec.ts › adiciona só com o nome, com os
    opcionais vazios (AC-04)` + `items.spec.ts › adiciona item só com o nome:
    aparece pendente com opcionais vazios` (payload `plannedPrice: null`).
  - **AC-10** (cross-ref): `item-form-sheet.spec.ts › prefill da edição na máscara…`,
    `shopping-list-page.spec.ts › …Editar preenche o formulário (AC-10)` +
    `salvar a edição atualiza a linha… (AC-10)` + `items.spec.ts › editar planejados
    e salvar atualiza a linha` (linha `3 kg · R$ 12,50`).
  - **AC-13** (cross-ref): `purchase-sheet.spec.ts › os três campos são obrigatórios:
    erro em cada campo e nenhuma requisição (AC-13)` (aria do campo mascarado) +
    `purchase.spec.ts › sem um dos campos obrigatórios: erro no campo e nenhuma
    requisição de marcação` (E2E) + o trecho de **preço vazio** dentro da jornada de
    máscara (`#purchase-price-error` + **0** `PUT /purchase`).
  - **AC-15** (cross-ref): `purchase-sheet.spec.ts › pré-preenche quantidade e
    unidade planejadas e deixa o preço por unidade vazio (AC-15)` +
    `purchase.spec.ts › pré-preenche quantidade/unidade planejadas e deixa o preço
    por unidade vazio` (E2E).
  - **AC-25** (cross-ref): `load.spec.ts › viewport 360px e desktop … tema claro e
    escuro, uma única primary, alvos ≥44px, :focus-visible visível` + aria/
    `aria-describedby` do preço mascarado em `purchase-sheet.spec.ts › os três
    campos são obrigatórios…` e na jornada E2E de máscara (`aria-invalid`).
- Testes executados (comando + resultado reais, executados por mim — nunca por
  inferência):
  - `npx nx test web` → **`204 passed (204)` / `21 passed (21 arquivos)`**,
    exit **0** (era 202; **+2** da lacuna fechada).
  - `npx nx e2e web-e2e -- --grep "máscara"` → **`4 passed (3.0s)`**
    (`Running 4 tests using 2 workers`), exit **0** — as 4 jornadas, agora com os
    passos de 9/10 dígitos.
  - `npx nx e2e web-e2e` → **`36 passed (22.2s)`**, exit **0**;
    repetido **`--skip-nx-cache`** → **`36 passed (23.0s)`**, exit **0** (zero cache
    do Nx; Playwright subiu `web:serve` (4200) e `auth-service:serve` (3001) e os
    derrubou ao terminar — portas sem `LISTENING` após a corrida; antes dos runs a
    checagem `netstat` deu portas livres).
  - `npx nx lint web --skip-nx-cache` → **`Successfully ran target lint for project
    web`**, exit **0**; `npx nx lint web-e2e --skip-nx-cache` → **`Successfully ran
    target lint for project web-e2e`**, exit **0** (sem `any`, sem `test.skip`,
    sem `waitForTimeout`, sem `passWithNoTests`).
- Decisões registradas:
  1. **Lacuna real encontrada e fechada (menor patch):** o detalhe do **AC-27/CD-15(c)**
     "não há limite artificial de dígitos" **não tinha evidência executável** em
     lugar nenhum — o maior caso coberto era `'123456'` (6 dígitos); um teto de 6
     dígitos passaria a suíte inteira. Fechado só em `*.spec.ts` (+16 linhas): 2
     asserções no helper + 1 passo de digitação real (`pressSequentially`) em **cada**
     campo na E2E — o passo E2E é o falsificável de verdade para um eventual
     `maxlength` no template (que `input.value +=` do unit contornaria), e cobre os
     dois wirings separados (`item-form-sheet` e `purchase-sheet`). **Nenhum** código
     de produção foi alterado (os templates não têm `maxlength` hoje — conferido).
  2. **Nada removido por conveniência:** diff `89e7d75..HEAD` nos `*.spec.ts` mostra
     40 linhas removidas, **todas** da tabela "Impacto nos testes existentes" do
     PLAN (trocas de `fill('5,50')`→`'550'`, `toHaveValue('9,9')`→`'R$ 9,90'` etc.)
     e das **duas reescritas aprovadas** dos casos `-1` — cada uma substituída por um
     teste de máscara **mantendo** o caso "quantidade > 0 sem requisição" original.
     Os AC-04/AC-10/AC-13/AC-15/AC-26/AC-16 da Rodada 1 continuam com teste.
  3. **Falsificabilidade conferida:** sem a máscara todas as asserções falham (dígitos
     crus ≠ `R$ …`, payload `3015` ≠ `30.15`, prefill `12,5` ≠ `R$ 12,50`); os passos
     novos falham com qualquer teto de dígitos; nenhum teste depende de tautologia.
  4. Não rodei mutação no código de produção (fora do escopo) — a falsificabilidade
     acima é por análise das asserções, como registrado na T-23.
- Pendências (não cobertas por esta auditoria — para decisão do orquestrador/validator):
  1. **Payload HTTP com >6 dígitos não é assertado na E2E:** as jornadas provam o
     display sem limite via teclado e o helper prova o número (`numberFromDigits`
     `123456789` → `1234567.89`); se o validator quiser o valor longo **no payload
     E2E**, é um ajuste de uma asserção nas jornadas de máscara.
  2. `inputmode="decimal"` do campo de **quantidade** (risco do PLAN, não é AC da
     spec) não tem asserção de atributo; a quantidade é coberta pelo comportamento
     (digitação livre `1,5` → `1.5` e `toHaveValue('2,5')` na E2E).
  3. No **AC-25** o `:focus-visible` da E2E é genérico (Tab na página), não foca
     **especificamente** o campo mascarado; rótulo/erro/`aria-*` do campo mascarado
     estão cobertos nos testes de AC-13/AC-27.
  4. Topo do `STATUS.md` (fase/gate/próxima ação) **não** foi tocado — é do
     orquestrador.
- Próximo passo recomendado: orquestrador registra este commit (3 specs + STATUS) e
  delega a **revalidação da Rodada 2** ao `feature-validator` (AC-27 + cross-refs
  AC-04/AC-10/AC-13/AC-15/AC-25), com a suíte `web` (**204**) e as corridas E2E
  (**4** no filtro `máscara`, **36** completas) já registradas acima.

### T-23 — jornada Playwright da máscara de centavos em BRL (`test-engineer`)

- Tarefa: **T-23**
- Estado: **concluída**
- Arquivos alterados (`git status --porcelain` → os **3 specs** abaixo, todos em
  `apps/web-e2e` — o único escopo permitido desta tarefa —, mais este
  `STATUS.md`):
  - `apps/web-e2e/src/shopping-list/items.spec.ts` — **+2 jornadas** com "máscara"
    no título (dígito a dígito `3`/`30`/`3015` ⇒ `R$ 0,03`/`R$ 0,30`/`R$ 30,15` +
    campo vazio sem `R$ 0,00` + payload `plannedPrice: 30.15`; e apagar 1 backspace
    = 1 dígito, colar/setar `R$ 1.234,56` ⇒ `R$ 1234,56` sem milhar, prefill da
    edição `12.5` ⇒ `R$ 12,50` e payload `1234.56` no `PATCH`); ajuste da linha do
    `fill('12,50')` da edição para `fill('1250')` + asserção `R$ 12,50`.
  - `apps/web-e2e/src/shopping-list/purchase.spec.ts` — **+2 jornadas** com
    "máscara" no título (dígito a dígito `3`/`30`/`3015` no preço por unidade,
    campo começa vazio, confirmar vazio ⇒ erro no campo + **0** `PUT /purchase`,
    payload `unitPrice: 30.15`; apagar 1 dígito (`R$ 30,15` → `R$ 3,01`), colar só
    dígitos (`R$ 1.234,56` → `R$ 1234,56`) e draft do desmarcar de volta **na
    máscara**) + ajustes da tabela de impacto (`'5,50'`→`'550'`, `'4,00'`→`'400'`,
    `'2,30'`→`'230'`, `'7,25'`→`'725'` com `toHaveValue('R$ 7,25')`,
    `'6,40'`→`'640'` com `toHaveValue('R$ 6,40')`; os dois `toHaveValue('')` de
    campo vazio ficaram **inalterados**).
  - `apps/web-e2e/src/shopping-list/checkout.spec.ts` — ajuste da tabela:
    `#item-price` e `#purchase-price` de `'6,50'` para `'650'` (as metas
    `R$ 6,50` já conferiam). Nenhum comportamento novo foi inventado.
- ACs cobertos: **AC-27** nos **dois** campos (máscara dígito a dígito, exibição
  em BRL, **payload numérico** conferido no *fake api*, campo vazio sem
  `R$ 0,00`, sem separador de milhar, apagar 1 = 1 dígito, colar só dígitos,
  prefill na edição e draft no desmarcar) + cross-refs exercitados: **AC-04**
  (preço vazio continua criando o item com `plannedPrice: null`), **AC-10**
  (editar abre com o preço na máscara e salva o número), **AC-13** (preço vazio
  ⇒ erro no campo e **zero** requisição de marcação), **AC-15** (preço por
  unidade começa vazio) e **AC-25** (rótulo/erro/`aria-invalid` do campo
  mascarado preservados).
- Testes executados (comando + resultado reais — nunca por inferência):
  - `npx nx e2e web-e2e -- --grep "máscara"` → **`4 passed (3.0s)`**
    (`Running 4 tests using 2 workers`; exit code **0**) — as 4 jornadas novas.
    Repetido sem cache (`--skip-nx-cache`) → **`4 passed (2.9s)`**, exit code
    **0**, sem nenhuma leitura de cache do Nx.
  - `npx nx e2e web-e2e` → **`36 passed (22.1s)`**
    (`Running 36 tests using 6 workers`; exit code **0**). Antes eram **32**
    (26 da lista + 6 de auth) ⇒ **+4**, nenhuma regressão; as asserções de preço
    ajustadas seguem verdes.
  - `npx nx lint web-e2e --skip-nx-cache` → **`Successfully ran target lint for
    project web-e2e`** (exit code **0**; 0 erros, sem `any`, sem `waitForTimeout`
    nem `force` novos).
- Decisões registradas: (1) as jornadas ficaram **nos arquivos da matriz do
  PLAN.md** (`items.spec.ts` / `purchase.spec.ts`), com "máscara" no título para o
  filtro `--grep "máscara"` provar exatamente a cobertura nova; (2) o caminho de
  **colar** foi exercitado com `fill('R$ 1.234,56')` — um único evento `input`
  com o texto colado, o **mesmo** handler `(input)` que a colagem real usa, sem
  depender de permissão de clipboard; (3) os testes são **falsificáveis**: sem a
  máscara o campo mostraria `3`/`3015` (não `R$ 0,03`/`R$ 30,15`), o payload
  seria `3015` (não `30.15`) e o prefill da edição seria `12,5` (não
  `R$ 12,50`) — todas as asserções falhariam; (4) nada em `apps/web` foi tocado
  (T-20/T-21/T-22 seguem intactas) e **nenhum** contrato HTTP foi alterado; (5)
  não rodei mutação no código de produção para não sair do escopo de arquivos da
  T-23.
- Pendências: nenhuma bloqueante. Observação de ambiente: as portas 4200/3001
  estavam livres antes da corrida (nenhum dev server órfão); o Playwright subiu e
  derrubou os dois `webServer` por conta própria.
- Próximo passo recomendado: **revalidação da Rodada 2** pelo `feature-validator`
  (AC-27 + cross-refs AC-04/AC-10/AC-13/AC-15/AC-25), com a suíte `web` e as duas
  corridas E2E já registradas; depois seguir para commit/PR conforme o
  orquestrador.

### T-22 — máscara de centavos em BRL no preço por unidade (`angular-dev`)

- Tarefa: **T-22**
- Estado: **concluída**
- Arquivos alterados: `apps/web/src/app/features/shopping-list/purchase-sheet.ts`
  (estado de verdade = dígitos em `unitPriceDigits`, com `unitPriceDisplay` para a
  exibição, `digitsFromField`/`renderPrice` imperativos, `onPriceBeforeInput` para
  apagar, prefill do draft por `digitsFromNumber`, payload por `numberFromDigits`
  ⇒ vazio é `null`; os helpers locais duplicados de decimal foram trocados pelos do
  `shared/money`), `purchase-sheet.html` (`inputmode="numeric"`,
  `[value]="unitPriceDisplay()"`, `(beforeinput)`), `purchase-sheet.spec.ts` (+5
  casos: máscara `3/30/3015`, apagar, colar, teclado numérico e a reescrita do caso
  `'-1'`; mais a asserção de exibição no prefill do draft) e as asserções de
  **compra** em `shopping-list-page.spec.ts` (dígitos `'1000'` ⇒ `unitPrice: 10` com
  exibição `'R$ 10,00'` e prefill do desmarcar `'R$ 9,90'`). Nenhuma asserção de
  **item** foi tocada (são da T-21); `shared/money` **não** foi alterado.
- ACs cobertos: **AC-27** (máscara, payload numérico, apagar/colar, teclado
  numérico), **AC-13** (vazio ⇒ erro "Informe o preço por unidade." + nenhuma
  requisição), **AC-15** (preço começa vazio) e, exercitados, **RN-12** (draft
  reaparece na máscara) e **RN-13** (prefill do planejado não preenche o preço).
- Testes executados (comando + resultado reais):
  - `npx nx test web` → **202 passed / 21 arquivos** (antes: 197/21; `Cache: 0/1 hit`
    ⇒ execução real). **Nenhuma regressão.**
  - `npx nx lint web` → **`All files pass linting`** (0 erros/warnings; sem `any`).
- Decisões registradas: (1) mesma arquitetura de T-21 — a fonte de verdade é a string
  de dígitos e exibição/payload/prefill derivam dela, para máscara e número não
  divergirem. (2) O `priceError` passou a usar `numberFromDigits`: vazio ⇒
  `'Informe o preço por unidade.'` (obrigatório preservado) e a regra defensiva
  "preço ≥ 0" **permanece** no código, mas fica **inalcançável pela digitação** — o
  caso que digitava `-1` e esperava "preço negativo" foi reescrito para provar
  `'-'` ⇒ campo vazio e `'-1'` ⇒ `R$ 0,01` com envio, em vez de ser removido. O
  ramo "Informe um número válido." do preço caiu (a máscara só produz dígitos, logo
  não há `NaN`); a validação de `NaN` da **quantidade** segue intacta. (3) Os
  helpers `parseDecimal`/`formatDecimal` duplicados no sheet foram substituídos pelos
  de `shared/money` (T-20) — a quantidade continua com digitação livre (RN-06).
  (4) Nenhum contrato HTTP, backend ou regra de negócio mudou; sem dependência nova
  ⇒ sem ADR.
- Pendências: nenhuma bloqueante.
- Próximo passo recomendado: delegar **T-23** (`test-engineer`) — jornada Playwright
  hermética do AC-27 nos dois campos, com apagar/colar, prefill na edição e
  preservação no desmarcar.

### T-21 — máscara de centavos em BRL no preço planejado (`angular-dev`)

- Tarefa: **T-21**
- Estado: **concluída**. Nota de processo: a sessão do `angular-dev` caiu por
  **rate limit** *depois* de gravar as mudanças (sem bloco de handoff). O
  orquestrador **reconferiu o tree**, revisou o diff contra o escopo da T-21 no
  `PLAN.md` e rodou suíte + lint antes de aceitar — **nenhum trabalho pendente** e
  **nenhum arquivo fora do escopo**.
- Arquivos alterados: `apps/web/src/app/features/shopping-list/item-form-sheet.ts`
  (máscara: estado = dígitos, `renderPrice` imperativo, `beforeinput` para apagar),
  `item-form-sheet.html` (`inputmode="numeric"`, `[value]="plannedPriceDisplay()"`,
  `(beforeinput)`), `item-form-sheet.spec.ts` (+5 casos e reescrita do caso `-1`) e
  as asserções de **item** em `shopping-list-page.spec.ts` (prefill `'R$ 12,50'`).
  `git diff --stat` → **4 arquivos**, exatamente os permitidos na T-21.
- ACs cobertos: **AC-27** (máscara, payload numérico, apagar/colar, teclado
  numérico), **AC-04** (preço opcional vazio ⇒ `null`) e **AC-10** (prefill da edição
  na máscara).
- Testes executados (comando + resultado reais, pelo orquestrador):
  - `npx nx test web --skip-nx-cache` → **197 passed / 21 arquivos** (antes: 191/21;
    `Cache: Skipped` ⇒ execução real). **Nenhuma regressão.**
  - `npx nx lint web` → **`All files pass linting`** (0 erros/warnings; sem `any`).
- Decisões registradas: (1) `digitsFromField` = `digitsFromInput(raw).replace(/^0+(?=\d)/,
  '')` — remove os zeros que a própria máscara insere (`R$ 0,03` contém `003`), senão
  cada evento somaria um zero e o campo nunca esvaziaria. (2) `renderPrice` grava o
  valor no DOM **imperativamente** e põe o caret no fim — o `[value]` não re-renderiza
  quando o signal não muda (ex.: letra digitada, que "colaria" na tela). (3)
  `(beforeinput)` intercepta `deleteContentBackward` e apaga **um dígito** (RN-21/
  CD-15): recomputar pelo texto formatado consumiria caracteres da máscara. (4) A
  regra defensiva "preço ≥ 0" **permanece** no código, agora **inalcançável pela
  digitação** — a máscara só forma dígitos; o caso `-1` foi reescrito para provar
  `'-'` ⇒ campo vazio e `'-1'` ⇒ `R$ 0,01` com envio (item 4 da aprovação do plano).
- Pendências: nenhuma bloqueante.
- Próximo passo recomendado: delegar **T-22** (`angular-dev`) — replicar o
  comportamento no **preço por unidade** do `purchase-sheet` (campo começa vazio;
  vazio bloqueia sem requisição) e atualizar as asserções de compra em
  `shopping-list-page.spec.ts` (tabela de impacto do `PLAN.md`, linhas de T-22).

### T-20 — helper de máscara de centavos em BRL (`angular-dev`)

- Tarefa: **T-20**
- Estado: **concluída**
- Arquivos alterados (novos): `apps/web/src/app/shared/money/money.ts` e
  `apps/web/src/app/shared/money/money.spec.ts` (+14 testes). **Nenhum outro
  arquivo tocado** (`git status --porcelain` → apenas a pasta nova); os sheets
  seguem com T-21/T-22.
- ACs cobertos: **AC-27** (base técnica — as regras da máscara; o wiring dos dois
  campos é T-21/T-22 e a jornada Playwright é T-23)
- Testes executados (comando + resultado reais):
  - `npx nx test web` → **191 passed / 21 arquivos** (antes: 177/20; `Cache: 0/1
    hit` ⇒ execução real). **Nenhuma regressão.**
  - `npx nx test web --include=app/shared/money/money.spec.ts` → **14 passed / 1
    arquivo** (o helper isolado).
  - `npx nx lint web` → **`All files pass linting`** (0 erros/warnings; sem `any`).
  - extra (checklist de T-19): `npx nx typecheck web` → verde.
- Decisões registradas: (1) `parseOptionalDecimal` (item) e `parseDecimal`
  (compra) eram **idênticos** ⇒ o módulo exporta **um** `parseDecimal` +
  `formatDecimal` ("uma única verdade" do plano); T-21 troca a chamada local pelo
  import (mesma semântica: vírgula ou ponto, `''` ⇒ `null`, NaN bloqueia).
  (2) `formatBrlFromDigits` recebe a string de **dígitos** (produzida por
  `digitsFromInput` na borda) e formata por `padStart(3, '0')` + corte dos dois
  últimos dígitos — cobre `''/3/30/3015/123456` sem separador de milhar (CD-15) e
  trata `'0'` como valor (`R$ 0,00`), não ausência. (3) `numberFromDigits` =
  `Number(digits) / 100` (`'3015' → 30.15`; `'' → null`) — a divisão arredonda
  para o mesmo double do literal, logo é determinística. (4) `digitsFromNumber`
  usa `Math.round(value * 100)` para o prefill não herdar o erro de ponto
  flutuante (`9.9 * 100 === 990.0000000000001`); sem limite artificial de dígitos
  (CD-15).
- Pendências: nenhuma bloqueante. Nota para T-21/T-22: o import é de
  `../shared/money/money` (a pasta `shared/` não tinha barrel; só estes dois
  arquivos foram criados, dentro do glob permitido).
- Próximo passo recomendado: delegar **T-21** (`angular-dev`) — ligar a máscara ao
  **preço planejado** do `item-form-sheet` (estado = dígitos, DOM imperativo,
  `inputmode="numeric"`, payload por `numberFromDigits`, prefill pela máscara).

### Gate do PLANO da Rodada 2 — aprovado e fechado (`tech-planner`)

- Tarefa: **fechamento do gate do plano da Rodada 2** (não é uma `T-*`)
- Estado: **concluída** — **gate do plano da Rodada 2 FECHADO**
- Arquivos alterados: `docs/features/shopping-list/PLAN.md` (cabeçalho com as duas
  rodadas: `Status:` e `Aprovação do usuário: ... Aprovado pelo usuário em
  2026-10-14 (Rodada 2)`; item de aprovação do "Gate do plano da Rodada 2" marcado
  `[x]` com a frase canônica). **Rodada 1 intacta.**
- ACs cobertos: nenhum (fechamento de gate); o plano cobre **AC-27** + cross-refs.
- Testes executados: `git diff --stat` → 1 arquivo (`PLAN.md`); nenhuma suíte se
  aplica (mudança documental).
- Decisões registradas: nenhuma nova.
- Aprovação do usuário: **Aprovado pelo usuário em 2026-10-14** (registrada
  literalmente na `PLAN.md`).
- Pendências: nenhuma bloqueante; nota menor (não bloqueante): o item 6 da lista
  "O que o usuário precisa aprovar (Rodada 2)" no `PLAN.md` mantém o texto genérico
  do processo com placeholder `YYYY-MM-DD` (não é o gate).
- Próximo passo recomendado: delegar **T-20** (`angular-dev`) e seguir a cadeia
  **sequencial** T-20 → T-21 → T-22 → T-23, comitando a cada T concluída com testes
  verdes.

### Plano da Rodada 2 — máscara de centavos em BRL (`tech-planner`)

- Tarefa: **PLAN da Rodada 2** (não é uma `T-*`; seção final do `PLAN.md` da
  própria feature `shopping-list` — **nenhuma** feature nova foi criada)
- Estado: **concluída** (artefato escrito) — **gate do plano da Rodada 2
  aberto**: aguardando a aprovação do usuário (frase canônica **não** registrada
  por conta própria) — **superado:** o plano foi aprovado e o gate fechado em
  2026-10-14 (ver o handoff acima)
- Arquivos alterados: `docs/features/shopping-list/PLAN.md` (nova seção
  "Rodada 2 — máscara de centavos em BRL nos dois campos de preço (2026-10-14)":
  contexto/abordagem, `Superfície de UI: sim`, contratos/dados inalterados,
  revisão arquitetural não obrigatória, estratégia de testes, **Matriz AC ↔ E2E
  (Rodada 2)**, **impacto nos testes existentes por arquivo/linha**, **T-20…T-23**,
  ordem/paralelismo, riscos/trade-offs, decisões, **Gate do plano da Rodada 2** com
  a aprovação **em aberto** e a lista "O que o usuário precisa aprovar") + campos
  de `**Status:**`/`**Aprovação do usuário:**` do topo (**Rodada 1 intacta**); e
  `docs/features/shopping-list/STATUS.md` (fase/gate/próxima ação, `## Artefatos`
  e **este bloco de handoff**). **Nenhum outro arquivo foi tocado.**
- ACs cobertos: **AC-27** (novo, matriz + T-23 Playwright) e, como
  cross-referência, AC-04/AC-10/AC-13/AC-15/AC-25 (a prova não muda; passam a
  exercitar o campo mascarado)
- Testes executados: **não aplicável** (fase de plano; nenhum código de produto
  tocado). A evidência desta fase é a revisão do `PLAN.md`; a prova executável é
  das tarefas (T-20…T-23).
- Decisões registradas: helper puro em `apps/web/src/app/shared/money/` (não em
  `libs/shared/util`/`libs/ui-web` — scaffolds sem target de teste — nem em
  `libs/contracts`), absorvendo os helpers de quantidade hoje duplicados;
  **estado = string de dígitos** com exibição/payload derivados; DOM sobrescrito
  imperativamente + caret no fim; `inputmode="numeric"` só nos campos de preço;
  **T-21/T-22 são sequenciais** (compartilham `shopping-list-page.spec.ts` — a
  premissa de "arquivos disjuntos" foi **corrigida**); regra defensiva
  "preço ≥ 0" **permanece** no código, agora inalcançável pela digitação (os dois
  testes que digitavam `-1` são reescritos, item 4 da aprovação). **Nenhuma ADR
  nova** e **revisão arquitetural não obrigatória** (single-service, backend
  intocado, contrato inalterado).
- Aprovação do usuário: **pendente** — o gate só fecha com a frase canônica no
  bloco "Gate do plano da Rodada 2" do `PLAN.md`.
- Pendências: (1) aprovação do usuário da Rodada 2 (lista de 6 itens no
  `PLAN.md`); (2) recomendações **não bloqueantes** (não são tarefas): registrar
  o padrão da máscara no `GUIA-DESIGN` §5 e reusar `formatBrlFromDigits` em
  `item-row` quando ele for tocado.
- Próximo passo recomendado: orquestrador apresenta a lista de aprovação ao
  usuário; após aprovado, registra a frase canônica e delega a implementação na
  ordem T-20 → T-21 → T-22 → T-23.

### Gate da SPEC da Rodada 2 — aprovado e fechado (`product-spec`)

- Tarefa: **fechamento do gate da spec da Rodada 2** (não é uma `T-*`)
- Estado: **concluída** — **gate da spec da Rodada 2 FECHADO**
- Arquivos alterados: `docs/features/shopping-list/SPEC.md` (frase canônica da
  Rodada 2 registrada no "Gate da Rodada 2"; `Status da Rodada 2: Aprovada`;
  `Aprovação da Rodada 2: Aprovado pelo usuário em 2026-10-14`; cabeçalho com as
  duas rodadas; **CD-15** nova resolvendo **D-02**; RN-21/AC-27 refinados com os
  detalhes de exibição confirmados). **Rodada 1 intacta.**
- ACs cobertos: **AC-27** (refinamento sem mudar o que ele prova); AC-04/AC-10/
  AC-15/AC-25 preservados.
- Decisões registradas: **CD-15** (sem separador de milhar; campo vazio sem
  `R$ 0,00`; apagar remove o último dígito, colar mantém só dígitos, sem limite
  artificial); **D-02 resolvida**. Nenhuma ADR nova.
- Aprovação do usuário: **Aprovado pelo usuário em 2026-10-14** (registrada
  literalmente na `SPEC.md`); decisões de D-02 confirmadas ("usar esses padrões").
- Pendências: nenhuma decisão aberta na spec da Rodada 2.
- Próximo passo recomendado: orquestrador atualiza o `STATUS.md` (feito: fase →
  Plano) e delega o **`tech-planner`** para o plano da Rodada 2 (tarefa Playwright
  do AC-27).

### SPEC da Rodada 2 — máscara de centavos em BRL (`product-spec`)

- Tarefa: **SPEC da Rodada 2** (não é uma `T-*`; alteração da `SPEC.md` da própria
  feature `shopping-list` — **nenhuma** feature nova foi criada)
- Estado: **concluída** (artefato escrito) — **gate da spec da Rodada 2 aberto**:
  aguardando aprovação do usuário (frase canônica **não** registrada por conta
  própria) — **superado:** a spec foi aprovada e o gate fechado em 2026-10-14
  (ver o handoff acima)
- Arquivos alterados: `docs/features/shopping-list/SPEC.md` (nova seção "Rodada 2
  — formatação de preço em BRL (2026-10-14)"; **RN-06** ajustada; **RN-21** nova;
  **AC-27** novo; cross-referência em AC-04/AC-10/AC-15/AC-25; nota em "Design e
  UX", em "Estados relevantes" (erro de campo) e em "Contratos afetados" (o
  contrato **não** muda); **CD-14** nova + nota em **CD-08**; **D-02** nova (não
  bloqueante); nova seção "Gate da Rodada 2") e **este bloco de handoff** em
  `docs/features/shopping-list/STATUS.md` (+ campos de fase/gate/próxima ação do
  topo). **Nenhum outro arquivo foi tocado.**
- ACs cobertos: **AC-27** (novo, exclusivo da Rodada 2). Os ACs da Rodada 1 **não**
  mudaram de prova — AC-04/AC-10/AC-15/AC-25 receberam apenas cross-referência.
- Testes executados: **não aplicável** (fase de spec; nenhum código de produto
  tocado). A evidência desta fase é a revisão da `SPEC.md`; o cenário Playwright do
  AC-27 é tarefa obrigatória do `PLAN.md` da Rodada 2 (ADR 0008), ainda não
  criado.
- Decisões registradas: **CD-14** (máscara de centavos em BRL nos dois campos de
  preço), regra **RN-21** e critério **AC-27**; **D-02** aberta e **não
  bloqueante**; **nenhuma ADR nova** — a máscara é formatação de entrada da PWA,
  sem mudança de contrato, dados, ownership ou integração (não é decisão
  arquitetural).
- Pendências:
  1. **Aprovação do usuário** da Rodada 2 (lista exata abaixo). Sem ela o gate da
     spec **não** fecha e o plano **não** começa.
  2. **D-02 (não bloqueante, aberta):** detalhes de exibição não cobertos pelos
     exemplos confirmados — separador de milhar ≥ `R$ 1.000,00`; aparência do
     campo sem dígitos; comportamento ao apagar/colar e limite de dígitos.
  3. **Inconsistência no `## Artefatos` deste STATUS:** **corrigida pelo
     orquestrador** (a linha da Spec passou a **27 ACs**, **CD-01–CD-14**, **D-02
     não bloqueante aberta** e "Rodada 2 em rascunho / aprovação pendente"; o plano
     da Rodada 2 marcado como inexistente).
- Próximo passo recomendado: o usuário aprovar a Rodada 2 (o orquestrador registra
  a frase canônica no bloco **"Gate da Rodada 2"** da `SPEC.md`), atualizar
  `## Artefatos` e só então delegar o `tech-planner` para o plano da Rodada 2
  (máscara nos dois sheets + tarefa Playwright do AC-27).

**O que o usuário deve aprovar (Rodada 2) — em detalhe:**

1. **RN-21 — máscara de centavos em BRL nos dois campos de preço:** "Preço (R$)"
   do sheet de adicionar/editar item (preço **planejado**) e "Preço por unidade
   (R$)" do sheet de marcar como comprado; digitação **só de dígitos**, entrando
   pela direita e interpretados como **centavos** (`3` → `R$ 0,03`; `30` →
   `R$ 0,30`; `3015` → `R$ 30,15`); exibição em BRL (`R$ 30,15`); o valor
   **enviado ao serviço é o número** (`30.15`) ⇒ **contrato HTTP inalterado** e
   **backend não tocado**.
2. **Campo sem dígitos = sem valor** (`null`, **não** `0`): o preço planejado
   continua **opcional** no item (AC-04) e o preço por unidade continua
   **obrigatório** na compra, começando **vazio** (RN-13/AC-13/AC-15).
3. **Prefill na máscara:** editar um item com preço planejado `12,50` mostra
   `R$ 12,50`; valores preservados por um **desmarcar** reaparecem na máscara
   (RN-12).
4. **Fora do ajuste (não reaberto):** a **quantidade** mantém digitação livre de
   decimal (vírgula ou ponto) e a exibição da linha da lista (`item-row`, que já
   mostra `R$ 30,15`) permanece; **nenhum** AC da Rodada 1 muda de prova.
5. **AC-27** como critério verificável (cobre os dois campos, exibição, valor
   enviado e a preservação de AC-04/AC-13/AC-15) e **CD-14** como decisão
   confirmada em 2026-10-14.
6. **D-02 (não bloqueante)** — confirmar ou corrigir: (a) separador de milhar em
   valores ≥ `R$ 1.000,00`; (b) aparência do campo **sem nenhum dígito**;
   (c) comportamento ao **apagar/colar** e eventual limite de dígitos.

**Texto exato da frase canônica a registrar quando aprovado** (em `SPEC.md` ›
"Gate da Rodada 2", substituindo `AAAA-MM-DD` pela data da aprovação):

```text
Aprovado pelo usuário em AAAA-MM-DD
```

(a frase `Aprovado pelo usuário em 2026-10-13` continua valendo **somente** para a
Rodada 1 e **não** deve ser alterada)

### VALIDAÇÃO — feature aprovada (`feature-validator`)

- Estado: **aprovada** — **26/26 ACs** (AC-01…AC-26), 0 reprovados, 0 a reabrir
- Arquivo: `docs/features/shopping-list/VALIDATION.md` (novo; 230 linhas, template
  completo: evidências por critério, checklist de documentação, checklist de design,
  verificações transversais, pendências, julgamentos do DoD, comandos executados,
  parecer)
- Evidência: 25 ACs com cenário Playwright citado + corrida real; **AC-09**
  backend-only comprovado por integração com Postgres real (índice único parcial +
  `409` HTTP direto + corrida)
- Comandos executados (resultado real, registrado no `VALIDATION.md`):
  `npx nx e2e web-e2e` → **32 passed** (20.0s; `--skip-nx-cache` → 32 passed);
  `npx nx test web` → **177 passed / 20 arquivos**; `db:migrate` + `npx nx test
  shopping-list-service` → **162 passed / 14 arquivos**; `lint` (web, web-e2e,
  shopping-list-service) verdes; `npx nx typecheck web` e `npx nx sync:check`
  verdes; `shopping_list_items` com **0 linhas** ao final
- Julgamentos exigidos pelo DoD (detalhados no `VALIDATION.md`): **(1)** toast de
  erro persistente acima do rodapé do sheet — decisão de design, **não** viola AC
  (AC-23 só exige nova tentativa possível, provada descartando o toast);
  **(2)** deflake do E2E de auth preserva a prova (`requests === 1`), produção
  intacta; **(3)** `400` de corpo malformado **antes** do `JwtAuthGuard` é ordem de
  validação documentada (nada é retornado; paridade com o `auth-service`), nit de
  doc, não pendência de contrato. **Nenhum dos três bloqueia.**
- Decisões registradas: nenhuma ADR nova (ADR 0009 já versionada nesta feature)
- Pendências: nenhuma bloqueante; recomendações não bloqueantes na seção
  `## Pendências` abaixo
- Commit: **este commit de docs** (`docs(shopping-list): registra a validacao
  aprovada (26/26 ACs)`) — a referência é descritiva porque o `STATUS.md` está
  dentro do próprio commit; o hash final está no `git log`

### T-19 — correção do `typecheck` do `web` (`angular-dev`)

- Estado: concluída
- Arquivos alterados: `apps/web/tsconfig.spec.json` (+ bloco `references` para
  `../../libs/contracts/tsconfig.lib.json`, espelhando o `tsconfig.app.json`)
- ACs cobertos: nenhum (config de build; sem mudança de comportamento/contrato/UI)
- Testes executados: `npx nx typecheck web` → **verde** (antes: `Found 10 errors`
  — `TS6059` + `TS6307`); `npx nx sync:check` verde; `npx nx test web` (**177
  verdes**, 20 arquivos), `npx nx lint web` e `npx nx build web` verdes
- Decisões registradas: correção mínima de **uma** *project reference* — sem
  ajuste em `apps/web/tsconfig.json` e sem relaxar `strict`/`rootDir`. O
  `tsconfig.spec.json` é um **projeto TS separado** (compila `src/**/*.ts`
  **incluindo** specs, com `types: ["vitest/globals"]`), e *project reference*
  vale por projeto: declarar em `app.json` não vale para `spec.json`. `build`
  (esbuild) e `test` (Vitest/esbuild) **não** rodam `tsc --build`, por isso
  passavam; só o `typecheck` valida a *file list* e o `rootDir` de cada projeto
  referenciado
- Observações: tarefa **corretiva** autorizada pelo orquestrador (mesmo
  tratamento do `f5a68a4`), fora do `PLAN.md`; o handoff de T-17 rotulava esses
  erros como "pré-existentes/alheios" — **incorreto**, e a prova é que
  `git log --reverse -S"@lista/contracts" -- apps/web/src` aponta `5c5c67f`
  (T-10) como o primeiro commit
- Commit: `b16f000`

### T-17 — E2E Playwright das jornadas da UI (`test-engineer`)

- Estado: concluída
- Arquivos alterados (novos):
  `apps/web-e2e/src/support/session.ts` (login hermético com JWT fake),
  `apps/web-e2e/src/support/shopping-list-fake-api.ts` (contrato HTTP em memória
  tipado por `@lista/contracts`; rota por **RegExp** `\/api\/shopping-list(?:\/|$)`,
  exige `Authorization` e devolve `Bearer`; hooks `failNext`/`setLoadFailure`,
  `delayMs`, `requests()`/`countRequests()`),
  `apps/web-e2e/src/support/shopping-list-journey.ts` (`openShoppingList`),
  `apps/web-e2e/src/support/ui.ts` (medidas/tokens/toque; `listRows` isola o `main`),
  e as **6 jornadas** em `apps/web-e2e/src/shopping-list/`:
  `load.spec.ts` (6), `items.spec.ts` (6), `duplicates.spec.ts` (2),
  `purchase.spec.ts` (7), `delete-undo.spec.ts` (1), `checkout.spec.ts` (4) — 26
  cenários. Alterados: `apps/web-e2e/tsconfig.json` (project reference de
  `libs/contracts` para o typecheck do e2e) e `apps/web-e2e/src/app.spec.ts`
  (flake de duplo toque — ver Pendências).
- ACs cobertos (Playwright/UI): AC-01–AC-08, AC-10–AC-20, AC-22–AC-26; **AC-09 é
  backend-only** (integração `npx nx test shopping-list-service`). ≥1 jornada
  (`checkout.spec.ts` — AC-24) afirma a base `http://localhost:3000/api/shopping-list`
  **com** `Authorization` (ADR 0009).
- Mapa `AC → jornada/teste` (títulos = matriz do `PLAN.md`):
  - AC-01 → `load.spec.ts` "abre na Lista: app bar … bottom nav … desabilitadas que não navegam"
  - AC-02 → `load.spec.ts` "primeira carga mostra skeleton na forma da lista (sem spinner) e depois a lista"
  - AC-03 → `load.spec.ts` "lista vazia mostra empty state com CTA primary Adicionar item"
  - AC-04 → `items.spec.ts` "adiciona item só com o nome: aparece pendente com opcionais vazios"
  - AC-05 → `items.spec.ts` "salvar sem nome/só com espaços: erro no campo e nenhuma requisição"
  - AC-06 → `items.spec.ts` "unidade oferece exatamente as 7 opções, sem digitação livre (item e compra)"
  - AC-07 → `duplicates.spec.ts` "`cafe`/`Café`: pergunta somar; confirmar soma e mantém um item; recusar mantém o form com o digitado"
  - AC-08 → `duplicates.spec.ts` "editar para um nome existente: conflito visível no formulário, a edição **não** é aplicada e **nada** é somado; renomear para o próprio nome aplica"
  - AC-09 → **backend-only** (integração com Postgres; sem jornada de UI)
  - AC-10 → `items.spec.ts` "editar planejados e salvar atualiza a linha"
  - AC-11 → `delete-undo.spec.ts` "excluir sai na hora; Desfazer restaura com os mesmos dados (inclusive comprado); sem desfazer permanece excluído"
  - AC-12 → `purchase.spec.ts` "marcar com os 3 campos: item comprado com `line-through` e alvo ≥44px, **continua na lista**"
  - AC-13 → `purchase.spec.ts` "sem um dos campos obrigatórios: erro no campo e nenhuma requisição de marcação"
  - AC-14 → `purchase.spec.ts` "quantidade diferente avisa e só marca após confirmar; sem quantidade planejada não avisa"
  - AC-15 → `purchase.spec.ts` "pré-preenche quantidade/unidade planejadas e deixa o preço por unidade vazio"
  - AC-16 → `purchase.spec.ts` "desmarcar volta a pendente e reabrir preserva os digitados; recarregar usa o prefill de AC-15"
  - AC-17 → `purchase.spec.ts` "item comprado continua podendo ser editado e excluído"
  - AC-18 → `load.spec.ts` "com pendentes e comprados, os pendentes aparecem primeiro"
  - AC-19 → `checkout.spec.ts` "resumo N saem/M permanecem; confirmar remove só os comprados + toast; cancelar mantém a lista"
  - AC-20 → `checkout.spec.ts` "concluir sem itens comprados mantém a lista exatamente como estava"
  - AC-21 → `checkout.spec.ts` "o resumo não pede mercado nem data" (+ integração: sem rota/tabela de histórico)
  - AC-22 → `load.spec.ts` "falha ao carregar: erro visível na área + Tentar novamente recarrega e exibe a lista"
  - AC-23 → `items.spec.ts` + `purchase.spec.ts` "falha de rede ao salvar/marcar/concluir: toast persistente, digitado preservado, sem estado fantasma"
  - AC-24 → `checkout.spec.ts` "adicionar/editar/marcar/excluir e **recarregar a PWA**: estado mantido (GET refeito no serviço; nada em `localStorage`)"
  - AC-25 → `load.spec.ts` "viewport 360px e desktop (`--container-max`), tema claro e escuro, uma única primary, alvos ≥44px, `:focus-visible` visível"
  - AC-26 → `items.spec.ts` "duplo toque no Salvar: rótulo `Salvando…`, botão desabilitado e **1** requisição"
- Testes executados (comando + resultado, corrida real):
  - `npx nx e2e web-e2e` → `Running 32 tests using 6 workers` → **32 passed (28.2s)**
    (6 jornadas de auth + 26 da lista); portas 4200/3001/3000 livres antes da corrida
  - Confirmação de não-flake: `npx nx e2e web-e2e --skip-nx-cache` → **32 passed** (2×)
  - Filtro por jornada: `npx nx e2e web-e2e -- --grep "Lista —"` → **26 passed (24.6s)**
  - `npx nx lint web-e2e` → **verde, 0 warnings** (o warning pré-existente
    `no-force-option` saiu junto com o `force` do flake de auth)
  - `npx tsc --build tsconfig.json --emitDeclarationOnly` (cwd `apps/web-e2e`) →
    **exit 0**. Nota do orquestrador: `npx nx typecheck web-e2e` fica bloqueado
    pelo `web:typecheck`, que falha com 10 erros — **não** são pré-existentes nem
    alheios: são **regressão da T-10** (falta a *project reference* em
    `apps/web/tsconfig.spec.json`), corrigida na **T-19**. O `tsc --build` direto
    do e2e passa porque compila só o projeto do e2e, não o grafo do `web`.
- Decisões registradas: interceptação **hermética** por `page.route` com RegExp (glob
  `**/api/shopping-list` é ancorado no fim e perde sub-rotas) e store em memória
  tipado por `@lista/contracts` (`ITEM_UNITS`); `playwright.config.mts` **inalterado**
  (sem novo `webServer`); `localStorage` só com `lcd.accessToken` (AC-24);
  `listRows` limita ao `main` porque o bottom nav também tem `listitem`; skeleton
  provado por `role`/`aria-busy` (o `role=status` não recebe nome acessível do
  conteúdo); duplo toque via `locator.dblclick()` (o clique por coordenada não
  disparava o submit)
- Observações: sem `any`, sem `test.skip`/`passWithNoTests`, sem `waitForTimeout`;
  a base `http://localhost:3000/api/shopping-list` + `Authorization` é afirmada em
  AC-24 (ADR 0009); ver Pendências para o flake de auth (corrigido) e para o toast
  sobre o sheet (apenas observado)
- Commit: `61a8335` (o orquestrador reconferiu `npx nx e2e web-e2e` → **32 passed
  (28.2s)** antes de commitar)

### T-16 — auditoria/completude dos testes unitários da PWA (`test-engineer`)

- Estado: concluída
- Arquivos alterados (só specs):
  `.../features/shopping-list/state/shopping-list-store.spec.ts` (+75 — describe
  "o navegador não guarda o estado da lista (AC-24/RN-19)" com 2 testes);
  `.../features/shopping-list/shopping-list-page.spec.ts` (+74 — "salvar a edição
  atualiza a linha e confirma com toast (AC-10)" e "concluir com tudo comprado cai
  no estado vazio (AC-03)"). **Nenhum arquivo de produção alterado.**
- ACs cobertos (unit): AC-01–AC-08, AC-10–AC-20, AC-22, AC-23, AC-25, AC-26 (+ AC-21
  e AC-24 como cobertura extra); **mapa AC → teste completo no handoff da sessão**
  (não reproduzido aqui). AC-09 é backend-only (integração).
- Testes executados: `npx nx test web` → **177 verdes**, 20 arquivos (cache 0/1 hit ⇒
  execução real; reforçado com `--skip-nx-cache`); `npx nx lint web` verde
- Decisões registradas: falseabilidade provada por mutação temporária em produção
  (teste de AC-24 falhou) e **revertida** (diff de produção vazio) — os testes novos
  são guardas reais; convenção de AC-25 em jsdom mantida (valor **declarado** do
  token, não `44px`); deliberadamente **não** duplicado o duplo-toque em "Excluir"
  (o single-flight do store já cobre)
- Observações: **E2E não executado** — as jornadas `apps/web-e2e/src/shopping-list/**`
  ainda não existem (entregável de T-17); a auditoria registra explicitamente que o
  gate de UI de ADR 0008 **não** está satisfeito até T-17
- Commit: `7011c4c`

### T-14 — ações do item, exclusão com Desfazer e conclusão (`angular-dev`)

- Estado: concluída
- Arquivos alterados: `item-actions-sheet.{ts,html,scss,spec.ts}` (novo),
  `checkout-sheet.{ts,html,scss,spec.ts}` (novo), `shopping-list-page.{ts,html,spec.ts}`
  (wiring)
- ACs cobertos: AC-11, AC-17, AC-18, AC-19, AC-20, AC-21 (UI), AC-23, AC-25, AC-26
- Testes executados: `npx nx test web` (**173 verdes**, 20 arquivos); `npx nx lint
  web` e `npx nx build web` verdes; `npx playwright test --config
  apps/web-e2e/playwright.config.mts` (6 verdes)
- Decisões registradas: `requestSheet('item-actions' | 'checkout')` como entrada
  única (app bar → checkout; linha → item-actions com o item); o sheet de ações não
  muta estado (emite `togglePurchased`/`edit`/`remove`/`closed`, consumidos por
  `consumeActionsItem()` — uma ação por abertura) e "Marcar" **reusa o
  `PurchaseSheet`** de T-13; excluir é imediato + toast `'Item excluído'` com ação
  `'Desfazer'` → `store.undoRemove()` (sem timers na tela); `removing: Set<string>`
  espelha `unmarking`; `<app-toast-host />` montado no fim do template (fixed +
  `--z-toast`) — fecha a pendência de T-12/T-13; `[closeOnBackdrop]="false"` no
  checkout
- Observações: **`npx nx e2e web-e2e` exige as portas 4200/3001 livres** — com um
  `ms-all` no ar o alvo `web:serve:development` não sobe e o Nx sai 1 (o Playwright
  em si passa); usar `npx playwright test --config apps/web-e2e/playwright.config.mts`
  enquanto o stack estiver no ar
- Commit: `07e8b27`

### T-13 — sheet de marcar/desmarcar comprado (`angular-dev`)

- Estado: concluída
- Arquivos alterados:
  `apps/web/src/app/features/shopping-list/purchase-sheet.{ts,html,scss,spec.ts}`
  (novo, 14 testes); `shopping-list-page.{ts,html,spec.ts}` (wiring: `purchaseItem`,
  `purchaseDrafts`, `unmarking`, `onTogglePurchased`/`onPurchaseClosed`/`onPurchased`,
  `unmark`)
- ACs cobertos: AC-12, AC-13, AC-14, AC-15, AC-16, AC-17 (edição), AC-23, AC-26
  (e AC-06 — unidade em `select` de 7 opções)
- Testes executados: `npx nx test web` (**147 verdes**, 18 arquivos); `npx nx lint
  web` e `npx nx build web` verdes; `npx nx e2e web-e2e` (6 verdes)
- Decisões registradas: o sheet recebe um `draft: PurchaseDraft | null` — a página o
  monta de `item.purchased` no desmarcar (valores digitados devolvidos pelo serviço),
  atendendo RN-12/CD-04 sem `output` extra; aviso de divergência = 2º
  `app-bottom-sheet [closeOnBackdrop]="false"` empilhado; estado de abertura por
  signal `purchaseItem` + mapa `purchaseDrafts` em memória (recarregar volta ao
  prefill); `unmarking: Set<string>` deduplica toast em toque duplo; números via
  `formatDecimal`/`parseDecimal` (RN-06)
- Observações: o *host* de toasts e o sheet de ações/conclusão são T-14 (aqui o
  `requestSheet('item-actions' | 'checkout')` fica como *seam*)
- Commit: `0e1f2d2`

### T-18 — corrida de duplicidade na criação (`backend-dev`)

- Estado: concluída
- Arquivos alterados:
  `apps/shopping-list-service/src/application/ports/shopping-list-repository.port.ts`
  (novo `ActiveItemNameConflictError` — o erro entra **pelo port**; `@throws` em
  `insert`); `.../infrastructure/persistence/drizzle/repository/shopping-list.repository.ts`
  (`insert` traduz `23505` → erro do port via `isUniqueViolation`, percorrendo a
  cadeia `cause`);
  `.../application/use-cases/create-shopping-list-item.use-case.ts`
  (`recoverFromConcurrentCreate`: relê **uma vez** e reusa `resolveExisting`);
  `.../create-shopping-list-item.use-case.spec.ts` (+3 testes: leitura vencida,
  colisão, erro alheio **não** engolido);
  `.../src/integration/shopping-list-postgres.spec.ts` (+3 testes em Postgres real
  com `StaleReadShoppingListRepository`, que força a leitura vencida e conta as
  colisões no índice); `libs/contracts/README.md` (nit)
- ACs cobertos: robustez sob concorrência de AC-09/RN-04/CD-02 (sem AC novo);
  sequencial preservado (201 `created: true` / 200 soma) e PATCH/CD-13 inalterado
- Testes executados: `npx nx test shopping-list-service` (**162 verdes**, 14
  arquivos; pré-requisito `npm run docker:up` + `db:migrate`; banco com 0 linhas ao
  final); `npx nx lint shopping-list-service` e `npx nx build shopping-list-service`
  verdes
- Decisões registradas: violação de unicidade entra pelo **port** (casos de uso não
  conhecem Postgres — ADR 0001); recuperação **bounded** (uma releitura; degrada
  para 409 canônico — nunca 500); `isUniqueViolation` casa só por `code === '23505'`
  (seguro: a tabela só tem esse índice único além da PK uuid); a prova de concorrência
  ficou na spec de **integração** (dois arquivos com `truncate` cruzado na mesma
  tabela se atropelariam no Vitest paralelo); **sem migração** e **sem contrato HTTP
  novo**
- Commit: `3d20cd8`

### T-12 — sheet de item adicionar/editar + duplicidade (`angular-dev`)

- Estado: concluída
- Arquivos alterados:
  `apps/web/src/app/features/shopping-list/item-form-sheet.{ts,html,scss,spec.ts}`
  (novo, 13 testes); `shopping-list-page.{ts,html,spec.ts}` (wiring: estados do
  form, `onOpenActions(item)`, `onFormSaved`, effect `mutationError` → toast)
- ACs cobertos: AC-04, AC-05, AC-06, AC-07, AC-08, AC-10, AC-23, AC-25, AC-26
- Testes executados: `npx nx test web` (**128 verdes**, 17 arquivos); `npx nx lint
  web` e `npx nx build web` verdes; `npx nx e2e web-e2e` (6 verdes)
- Decisões registradas: unidade via `[selected]` por `<option>` +
  `ngAfterViewInit` forçando `selectedIndex = -1` no estado "sem unidade" (o
  binding de `<select>` roda antes do `@for` criar as opções); a pergunta de soma
  empilha como 2º `app-bottom-sheet [closeOnBackdrop]="false"` sobre o form aberto
  (AC-07 exige o form visível); edição envia os opcionais com `null = limpar`
- Observações: o *host* de toasts é T-14 (aqui só se chama o service);
  `onOpenActions(item)` abre o form de edição como *seam* até o sheet de ações (T-14)
- Commit: `145ef02`

### T-15 — auditoria de testes do backend (`test-engineer`)

- Estado: concluída
- Arquivos alterados:
  `apps/shopping-list-service/src/integration/shopping-list-postgres.spec.ts`
  (novo — 12 testes com o `AppModule` real: Drizzle + Postgres, truncando
  `shopping_list_items` entre casos); `apps/shopping-list-service/vitest.config.mts`
  (remove `passWithNoTests: true`)
- ACs cobertos: AC-09, AC-21, AC-24 (prova com banco real) + contrato de
  AC-04–AC-13, AC-17–AC-20 (integrado à suíte `inject` já existente)
- Testes executados: `npx nx test shopping-list-service` (**156 verdes**, 14
  arquivos; pré-requisito `npm run docker:up` + `db:migrate`; banco deixado com 0
  linhas); `npx nx lint shopping-list-service` verde
- Decisões registradas: ADR 0001 (dono exclusivo dos dados — a suíte usa o banco
  real `shopping_list`); AC-24 provado com 2ª instância `NestFastifyApplication`
  (novo Pool); AC-21 provado por **ausência estrutural** (schema sem tabela de
  compra, sem rota `/history`, mensageria esqueleto) + hard delete físico
- Observações: os testes por `inject` usam repositório em memória; a **prova de
  banco real** veio só nesta tarefa (era a lacuna auditada)
- Commit: `940f291`

### T-11 — tela Lista (`angular-dev`)

- Estado: concluída
- Arquivos alterados:
  `apps/web/src/app/features/shopping-list/shopping-list-page.{ts,html,scss,spec.ts}`
  (novo), `apps/web/src/app/features/shopping-list/item-row.{ts,html,scss,spec.ts}`
  (novo), `apps/web/src/app/app.routes.ts` (`''` → `ShoppingListPage`), remoção de
  `apps/web/src/app/features/home/**`
- ACs cobertos: AC-01, AC-02, AC-03, AC-12, AC-18, AC-22, AC-24, AC-25
- Testes executados: `npx nx test web` (**112 verdes**, 16 arquivos); `npx nx lint
  web` e `npx nx build web` verdes; `npx nx e2e web-e2e` (6 verdes — regressão de auth)
- Decisões registradas: ordem/verdade vêm do serviço (a tela não reordena — RN-19);
  `ItemRow` é conteúdo puro com outputs `togglePurchased`/`openActions` para
  T-13/T-14; o conteúdo **não** readiciona o espaçamento da bottom nav (o shell já
  reserva via `.content-with-bottom-nav`)
- Observações: os sheets (T-12/T-13/T-14) ainda não existem — as ações ficam com
  *seams* no-op; o host de toasts é T-14
- Commit: `7018081`

### Correção de infraestrutura (`sdd-orchestrator`)

- `apps/web/tsconfig.app.json` — project reference de `libs/contracts` (via
  `nx sync`); desbloqueia `nx sync:check`/`nx build`/`nx e2e` (ver "Pendências").
  Commit `f5a68a4`.

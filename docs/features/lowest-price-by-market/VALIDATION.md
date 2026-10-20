# Validação — Menor preço por mercado

**Spec:** `docs/features/lowest-price-by-market/SPEC.md` (aprovada em 2026-10-19 — 16 ACs, 16 RNs, CD-01…CD-10)
**Plano:** `docs/features/lowest-price-by-market/PLAN.md` (aprovado em 2026-10-19 — revisão 3: T-01…T-17, matriz AC ↔ E2E 16/16)
**Data:** 2026-10-20
**Resultado:** **Aprovada** — 16/16 ACs com evidência executável (superfície de UI: Playwright)
**Superfície de UI (do plano):** **sim** (ADR 0008)

DoR da validação (§4 do `docs/process/sdd-workflow.md`): implementação e testes concluídos (T-01…T-17 commitadas nos pontos PC-0…PC-8, **nenhum AC/T reaberto** no `STATUS.md`), e o handoff do `test-engineer` registra a corrida Playwright (T-16: `npx nx e2e web-e2e --skip-nx-cache` → 72/72). Gate da ADR 0008 satisfeito — e **reproduzido por mim** (comandos ao final).

## Conferência do STATUS contra o repositório

- `git status --porcelain` → **vazio** (nenhum trabalho não commitado pendente).
- `git branch --show-current` → `feature/lowest-price-by-market`.
- Commits do `STATUS.md` existem no `git log`: PC-0 docs `19404f5`/`c4f9625`/`25b744c`/`46844e8`, PC-1 `5ce5d51`, PC-2 `d2cc806`, PC-3 `ce3e6df`, PC-4 `c0f41c0`, PC-5 `74b0e58`, PC-6 `e560123`, PC-7 `298321d`, retirada R-2 `2a55d05`, lição `3932133`, fechamento `d8e62cc`.
- **ACs reabertos: nenhum. Tarefas reabertas: nenhuma.**
- **Ambiente:** Docker Postgres `lista-de-compras-postgres` e RabbitMQ `lista-de-compras-rabbitmq` **Up (healthy)**; suítes de integração e E2E verdes sem correção de ambiente. `npm run docker:up` pré-requisito do plano satisfeito.
- Higiene de teste (R-4): suíte de integração do repositório trunca o banco de dev ao fim; conferido `docker exec … psql … → 0 / 0` (ver Comandos executados).

## Evidências por critério

Legenda: **Comando E2E** = `npx nx e2e web-e2e --skip-nx-cache`, corrida real de **72/72** reproduzida por mim (filtro da feature `-- --grep "[Mm]enor preço"` → **28/28**). **Unit web** = `npx nx test web` (**316/316**). **Backend** = `npx nx test price-history-service` (**146/146**) + `npx nx test shopping-list-service` (**206/206**, regressão). Títulos entre crases = `arquivo › título`; todos conferidos no código-fonte e verdes na corrida que executei.

| AC | Estado | Evidência Playwright (ADR 0008) — corrida 72/72 (filtro 28/28) | Evidência unit/integração | Observação |
| --- | --- | --- | --- | --- |
| AC-01 | **aprovado** | `lowest-price.spec.ts:15` — "lista agrupada: cada linha traz o menor preço por unidade e mercado · data · quantidade com a unidade da compra vencedora (AC-01/AC-03)" | Unit web: `lowest-price-page.spec.ts` (lista agrupada, metadados na linha); Backend: `lowest-prices.spec.ts` (vencedor → market/purchaseDate/quantity/unit) + `price-history.controller.spec.ts` (shape 200 agrupado) | Metadados da compra vencedora exibidos na linha |
| AC-02 | **aprovado** | `lowest-price.spec.ts:42` — "mercados A→Z (caixa/acentos ignorados) e itens A→Z dentro do grupo; item de vários mercados aparece uma vez; mercado sem item vencedor não gera cabeçalho (AC-02/CD-09)" | Unit web: `lowest-price-page.spec.ts` (grupos/ordem); Backend: `market-order.spec.ts` + `lowest-prices.spec.ts` (A→Z por normalização, desempate pelo texto cru, nenhum grupo vazio por construção) | CD-09 provado por construção (grupos partem dos itens) |
| AC-03 | **aprovado** | Mesmo teste AC-01/AC-03 (duas compras R$ 10,00 e R$ 7,50 → linha exibe R$ 7,50 e credita mercado/data/quantidade do registro de R$ 7,50) | Backend: `lowest-prices.spec.ts` (menor por unidade, sem média/último/tendência) + `list-lowest-prices.use-case.spec.ts` (agrupamento preservado com `q`); Unit web: `lowest-price-page.spec.ts` | Sem média, último preço ou tendência (fora de escopo) |
| AC-04 | **aprovado** | `lowest-price.spec.ts:65` — "empate de preço credita a compra mais recente; recarregar a tela mantém o mesmo grupo e os mesmos mercado/data/quantidade (AC-04)" | Backend: `lowest-prices.spec.ts` (desempate `unitPrice` → `purchaseDate` desc → `id` asc, estável entre ordens de entrada) + `list-lowest-prices.use-case.spec.ts`; Unit web: `lowest-price-page.spec.ts` | Determinismo pelo `id` do registro provado (estável entre cargas) |
| AC-05 | **aprovado** | `lowest-price-by-market.spec.ts:30` — "tocar a linha navega para `/menor-preco/cafe` (segmento = `nameNormalized` percent-encoded), resolve `Café` (acento) e mostra app bar + voltar em todos os estados (AC-05)" | Unit web: `app.routes.spec.ts` (rota lazy resolve a tela real) + `lowest-price-by-market-page.spec.ts` (4 estados, voltar); Backend: `price-history.controller.spec.ts` (200 para parâmetro não normalizado — R-1) | App bar + voltar visíveis em todos os estados |
| AC-06 | **aprovado** | `lowest-price-by-market.spec.ts:75` — "item em 3 mercados: 3 linhas A→Z, cada uma com o menor preço por unidade, data e quantidade com a unidade daquele mercado (AC-06)" | Backend: `lowest-price-by-item.spec.ts` (N mercados → N linhas A→Z) + `price-history.controller.spec.ts` (200 shape por mercado); Unit web: `lowest-price-by-market-page.spec.ts` | Uma linha por mercado, preço por unidade |
| AC-07 | **aprovado** | `lowest-price-by-market.spec.ts:103` — "duas compras no mesmo mercado: a linha daquele mercado mostra R$ 6,00 (o menor) com a data/quantidade dele (AC-07)" | Backend: `lowest-price-by-item.spec.ts` (vencedor dentro do mercado, não a última compra); Unit web: `lowest-price-by-market-page.spec.ts` | Menor no mercado, não a última compra |
| AC-08 | **aprovado** | `lowest-price.spec.ts` + `lowest-price-by-market.spec.ts:117` — "item de um único mercado aparece normalmente no grupo e a tela do item mostra uma única linha (AC-08)" | Backend: `lowest-price-by-item.spec.ts` (1 mercado → 1 linha, sem tratamento especial) + `lowest-prices.spec.ts`; Unit web: `lowest-price-page.spec.ts` + `lowest-price-by-market-page.spec.ts` | Sem erro nem estado vazio |
| AC-09 | **aprovado** | `lowest-price.spec.ts:89` — "busca `cafe` acha `café` e mantém o agrupamento; busca sem resultado mostra o empty de busca com Limpar busca (AC-09)" | Unit web: `lowest-price-page.spec.ts` (empty de busca distinto, debounce, `q` enviado ao serviço); Backend: `lowest-price-search.spec.ts` (substring normalizada) + `price-history.controller.spec.ts` (`q` respeitado, sem resultado → lista vazia) | Busca não filtra no cliente |
| AC-10 | **aprovado** | `lowest-price.spec.ts:144` — "sem preços, o Menor preço mostra empty state rico com uma única primary (AC-10/AC-16)" | Unit web: `lowest-price-page.spec.ts` (empty de lista ≠ empty de busca); Backend: `list-lowest-prices.use-case.spec.ts` (`markets: []`); Unit web store | Empty rico, nunca área em branco |
| AC-11 | **aprovado** | `lowest-price-by-market.spec.ts:142,175` — "voltar do item preserva o termo de busca e a lista filtrada (CD-10/AC-11)" e "entrar de novo pela aba Menor preço depois de abrir o item também preserva a busca (CD-10/AC-11)"; + `lowest-price.spec.ts:214` — "entrar na tela pela aba Menor preço repete a última busca em vez de recarregar a lista completa (CD-10/AC-11)" | Unit web: `price-history-store.spec.ts` (mantém `query` + lista entre navegações, retry repete a mesma consulta) + `lowest-price-page.spec.ts` (sincroniza campo com `store.query`) | CD-10 resolvido no store (estado de sessão) |
| AC-12 | **aprovado** | `lowest-price-by-market.spec.ts:268` — "abrir `/menor-preco/item-inexistente` mostra o bloco de não encontrado com voltar — nunca erro+retry (AC-12/R-5)" | Unit web: `price-history-store.spec.ts` (404 → `notFound`) + `lowest-price-by-market-page.spec.ts` (bloco de não encontrado com voltar); Backend: `get-lowest-prices-by-item.use-case.spec.ts` (`null` quando item ausente) + `price-history.controller.spec.ts` (404 canônico PT "Item não encontrado no histórico") | 404 vira `notFound`, não `error` (R-5) |
| AC-13 | **aprovado** | `lowest-price.spec.ts:125` — "primeira carga mostra skeleton na forma dos grupos (AC-13)" + `lowest-price-by-market.spec.ts:288` — "primeira carga do item mostra skeleton e Tentar novamente refaz a MESMA consulta do item (AC-13/AC-14)" | Unit web: `lowest-price-page.spec.ts` + `lowest-price-by-market-page.spec.ts` (skeleton por `role=status`, só quando não há dados) | Skeleton no formato do conteúdo, não spinner sozinho |
| AC-14 | **aprovado** | `lowest-price.spec.ts:161` — "falha ao carregar os menores preços: erro visível e Tentar novamente refaz o GET (AC-14)" + `:184` — "falha na busca: Tentar novamente repete a MESMA busca, não a lista completa (AC-14)" + `lowest-price-by-market.spec.ts:288` | Unit web: `price-history-store.spec.ts` (retry repete a última consulta — mesma busca/mesmo item) + páginas; Backend: `price-history.controller.spec.ts` (500 canônico) | Retry refetcha a chamada correta |
| AC-15 | **aprovado** | `lowest-price-by-market.spec.ts:352` — "sessão inválida na tela do item: 401 volta ao login com returnUrl (AC-15)" | Integração: `price-history.controller.spec.ts` (401 uniforme nas **duas** rotas — lista e drill-down, sem/com token inválido); Unit web: `price-history-api.service.spec.ts` + `auth.interceptor.spec.ts` (401 → logout + returnUrl); Regressão E2E `nav.spec.ts` (401 no histórico) | Chamadas sem JWT → 401 → retorno ao login |
| AC-16 | **aprovado** | `lowest-price-by-market.spec.ts:373` — "a tela do item em 360px: linhas ≥44px, sem primary concorrente e voltar acessível (AC-16)" + `lowest-price.spec.ts:144` (empty state com única primary) + `nav.spec.ts:110` — "viewport ~360px e desktop, tema claro/escuro, uma primary e alvos ≥44px (AC-19)" | Unit web: `design-tokens.smoke.spec.ts` (12 testes: 10 arquivos da superfície sem cor hardcoded + guard não-vácuo); Backend: N/A (AC observável na UI) | Ver checklist de design abaixo |

Regras (ADR 0008): Superfície de UI = **sim**; os **16 ACs** têm cenário Playwright citado acima e corrida real (72/72, filtro 28/28, registrada). **Nenhum AC é backend-only** nesta feature (AC-15 tem perna de backend, com evidência de integração adicional).

## Checklist de documentação

- [x] **Contratos HTTP/eventos coerentes com a implementação.**
  `libs/contracts/README.md` documenta as 4 operações do `price-history-service`
  (listar compras, detalhe, menores preços agrupados por mercado, menores preços
  do item por mercado), o parâmetro `{item}` percent-encoded, os shapes
  `LowestPricesResponse { markets }` / `LowestPriceByMarketResponse` e os status
  200/404/401/500 — conferindo com a tabela do `PLAN.md` e com os shapes
  assertados em `price-history.controller.spec.ts`. Evento de conclusão
  (`shopping-list.purchase-completed`) **inalterado** (v1) — sem mudança de
  produtor/consumidor/envelope/idempotência; verificado por `rabbitmq-purchase-completed-consumer.integration.spec.ts` (146/146).
- [x] **ADR registrada porque houve decisão arquitetural: ADR 0011**
  (`docs/decisions/0011-excecao-temporaria-ao-gateway-drill-down-menor-preco-por-mercado.md`
  — **Aceita**: operação nova `GET /api/price-history/lowest-prices/{item}` sob a
  mesma base `http://localhost:3002`, CORS inalterado, validade "enquanto o gateway
  não existir", critérios de saída iguais aos da ADR 0010, dono do follow-up =
  feature "API Gateway"), com **ponte na ADR 0010 §1** (quarta operação da
  exceção) — T-01. Revisão arquitetural **Aprovada com ressalvas (nenhuma
  bloqueante)** (`ARCHITECTURE-REVIEW.md`), ressalvas R-1…R-6 incorporadas ao
  plano (revisão 3) e cumpridas (normalização R-1 provada; round-trip R-2 provado;
  404 ≠ erro R-5; invariante R-6b provada). ADRs 0007/0008 vigentes.
- [x] **README / `.env.example` atualizados.** `.env.example` cobre
  `PRICE_HISTORY_DB_PASSWORD`, `PRICE_HISTORY_DATABASE_URL`,
  `PRICE_HISTORY_API_PORT=3002`, `PRICE_HISTORY_CORS_ORIGINS` (comentada) e a nota
  de uso de `RABBITMQ_URL` pelos dois serviços; ADR 0011 declara **nenhuma
  variável de ambiente nova** (operação nova reusa a base/porta/CORS existentes),
  portanto não há adição pendente. `libs/contracts/README.md` atualizado com as 4
  operações e as ADRs 0010 + 0011 (T-04). Nenhum segredo novo.
- [x] **`docs/lessons/`** — lição registrada: `docs/lessons/2026-10-19-menor-preco-por-mercado.md`
  (T-17, PC-8), com aprendizados transferíveis (evolução de contrato compartilhado
  quebrando consumidores + E2E hermético em série; higiene de specs de integração
  que escrevem em banco de dev — `update` sem `where` e limpeza determinística,
  incluindo o follow-up do banco de teste dedicado R-4; agrupamento como
  responsabilidade do serviço; ponto de commit da janela de suíte vermelha R-3).
- [x] **Documentação da feature atualizada quando ambiguidades resolvidas.**
  D-01…D-04 → CD-07…CD-10 registradas na `SPEC.md`; SPEC e `PLAN.md` com a frase
  canônica `Aprovado pelo usuário em 2026-10-19`; nenhuma decisão aberta
  remanescente. `STATUS.md` atualizado (PC-0…PC-8). Limitação R-2 retirada do
  `PLAN.md` em `2a55d05` após prova (critério de fechamento cumprido). `ARCHITECTURE-REVIEW.md` aprovada com ressalvas.
- [x] **`STATUS.md` final com próxima ação.** Atualizado por esta validação:
  fase → Validação aprovada; próxima ação → decisão de push/PR do usuário
  (seção de handoff ao final). Push/PR/merge permanecem decisão do usuário
  (skill `git-workflow`).

## Checklist de design (Superfície de UI = sim)

- [x] **Tokens: sem cor, espaço ou raio hardcoded.** Busca por `#[0-9a-fA-F]{3,8}`,
  `rgb(`, `hsl(` nos `.scss` de `features/price-history/**`: **0 ocorrências**
  (minha execução, `Select-String`). Guard reforçado por `design-tokens.smoke.spec.ts`
  (12 testes que leem o fonte — 10 arquivos da superfície nova sem cor literal +
  guard não-vácuo conferindo que `_tokens.scss` tem cor literal; falsificado de
  verdade na auditoria da v1). Dimensionamento com `var(--space-*)`,
  `var(--touch-target-min)`, `var(--radius-*)`, `var(--font-size-*)`. Lint 0 nos 4
  projetos.
- [x] **Quatro estados** em ambas as telas, cada um com evidência:
  **carregando** = skeleton (AC-13, E2E + unit nas duas telas); **vazio** =
  empty state rico (AC-10, E2E + unit: empty de lista ≠ empty de busca);
  **erro** = conteúdo + `Tentar novamente` (AC-14, E2E ×3 jornadas) + 404 →
  bloco de não encontrado com voltar (AC-12/R-5); **sucesso** = lista agrupada
  (AC-01/AC-02) e linhas por mercado (AC-06).
- [x] **Mobile-first / uma coluna:** E2E AC-16 (tela do item em 360px, linhas
  ≥44px, sem primary concorrente, voltar acessível) e `nav.spec.ts` AC-19
  (viewport ~360px e desktop com `--container-max`); padding reserva a bottom nav
  + safe area; coluna única.
- [x] **Foco e toque:** alvos ≥ 44px medidos na E2E (AC-16, nav.spec AC-19:
  linhas, campo de busca, voltar) e no unit (`min-height: var(--touch-target-min)`
  conferido nos `.scss`); `:focus-visible` visível (regressão `load.spec.ts` AC-19
  verde na mesma corrida).
- [x] **Erro visível na UI (nunca só no console):** área de conteúdo com
  `Tentar novamente` (AC-14 E2E ×3), bloco de não encontrado com voltar (AC-12
  E2E), 401 → retorno ao login com returnUrl (AC-15 E2E) — RN-13.
- [x] **Modo escuro via tokens:** E2E `nav.spec.ts` AC-19 com
  `emulateMedia({ colorScheme: 'dark' })` lendo `--color-canvas` /
  `--color-primary-text` **do token** (verde na corrida); tokens only (smoke spec
  barra cor hardcoded).
- [x] **Hierarquia tipográfica:** app bar título em `--font-size-h2`, apoio em
  `caption`/`--color-ink-muted`, linhas em `body`, metadados `mercado · data ·
  quantidade` em `caption`/`--color-ink-muted`, empty state em `title` —
  conferido nos `.scss`/`.html` da feature e nas asserções E2E (AC-16/AC-19).
- [x] **Agrupamento por whitespace:** ritmo maior entre grupos de mercado
  (`--space-lg`/`--space-xl`) e menor dentro do grupo (`--space-sm`/`--space-md`),
  hairline entre linhas — E2E AC-02 (grupos A→Z, sem cabeçalho vazio) e AC-19
  (viewport/tema) verdes; conferido nos `.scss`.
- [x] **Receita do tipo de tela (guia §4):** as duas telas são **lista/conteúdo**
  (app bar + coluna única + empty state rico com sticker/título/frase/CTA — E2E
  AC-10/AC-12) com drill-down como detalhe da mesma receita (app bar com nome do
  item, voltar com `aria-label` em todos os estados — E2E AC-05/AC-12);
  **nenhum form/conteúdo solto no void** (anti-padrão). Uma única `primary` por
  tela (ou no empty state) — E2E AC-16/AC-19.

## Verificações transversais

- [x] Contratos HTTP/eventos refletem a implementação (README × PLAN × specs de
  controller — 4 operações, shapes, status).
- [x] ADRs necessárias versionadas (0011 Aceita + ponte na 0010 §1; revisão
  arquitetural aprovada com ressalvas; ADRs 0006/0007/0008/0009/0010 vigentes).
- [x] Testes planejados executados e resultados registrados (seção abaixo).
- [x] **`npx nx e2e web-e2e` executado por mim** → **72 passed (39.7s)** com
  `--skip-nx-cache` (gate ADR 0008 reproduzido); filtro da feature → **28 passed
  (19.8s)**.
- [x] Checklists de documentação e de design acima completas.
- [x] Lint 0 (`web`, `web-e2e`, `shopping-list-service`, `price-history-service`)
  — regra `no-explicit-any` sem ocorrências.
- [x] `npx nx build web` (produção) verde com chunks lazy das duas telas
  (`lowest-price-page`, `lowest-price-by-market-page`); único aviso é o budget do
  `lowest-price-page.scss` (4,26 kB > 4 kB) — **pré-existente do PC-5**
  (`74b0e58`), não introduzido pelas auditorias nem pelo E2E, registrado como
  pendência não bloqueante.
- [x] Nenhum segredo/credencial versionado (`git ls-files` → só `.env.example`;
  busca por chave privada em arquivos versionados = 0 ocorrências).
- [x] Árvore limpa antes e depois das corridas (`git status --porcelain` vazio).
- [x] Higiene de teste (R-4): banco de dev `price_history` com **0 purchases /
  0 purchase_items** após a suíte (`docker exec … psql → 0 / 0`).

## Pendências e ressalvas aceitas (não bloqueantes)

**Nenhuma pendência de comportamento, contrato ou arquitetura em aberto.** Os
pontos abaixo são **conhecidos e aceitos**; nenhum rebaixa um AC:

1. **Follow-up do banco de teste dedicado (R-4)** — a suíte de integração do
   `price-history-service` trunca o banco de **dev** `price_history` a cada caso
   (higiene determinística da T-03 garante 0/0 ao fim). Banco de teste dedicado
   fica como follow-up de ambiente (registrado na lição T-17). Não muda
   comportamento nem AC.
2. **Budget do `lowest-price-page.scss`** — 4,26 kB > 4 kB (estouro de 262 bytes),
   **pré-existente do PC-5** (`74b0e58`), não introduzido pelas auditorias nem
   pelo E2E. Ajustar budget ou enxugar o estilo como follow-up, sem reabrir T-12.
3. **R-2 (round-trip do nome com `/`) — refutado por teste e retirado do plano.**
   `encodeURIComponent` codifica `/` como `%2F`; round-trip provado de ponta a
   ponta em 5 pontos (domínio, Fastify, URL PWA, rota e E2E). A limitação e a
   mitigação futura saíram de § Riscos do `PLAN.md` em `2a55d05`; sem mudança de
   escopo. A URL acentuada `/menor-preco/caf%C3%A9` também resolve por navegação
   direta (normalização no caso de uso, R-1).
4. **R-5 (404 → não encontrado, não erro+retry)** — confirmado: `/menor-preco/item-inexistente`
   mostra `.empty--not-found` com voltar, sem `role=alert` nem "Tentar novamente".
5. **Fake do E2E espelha o serviço** — paridade de tipo garantida por
   `@lista/contracts`, de comportamento pelas integrações do serviço; se a regra
   mudar, atualizar `support/price-history-fake-api.ts` (pendência de processo
   já registrada na v1).
6. **R-3 (suíte vermelha por design)** — encerrada; janela PC-2…PC-4 fechada com
   as auditorias T-14/T-15 e o gate de UI T-16; todas as suítes verdes.
7. **Observação de processo (2026-10-19)** — o agente `product-spec` teve
   `edit`/`write` negados em `docs/product/**` e aplicou a atualização do
   `initial-scope.md` via shell, com autorização explícita do usuário; o
   orquestrador verificou o diff (2 linhas). Se a intenção é que esse agente edite
   escopo de produto, ajustar a permissão dele em `.opencode/agents/product-spec.md`
   — caso contrário, o fluxo depende de contorno manual. Não afeta esta feature.

Nada disto muda comportamento, contrato ou arquitetura: **não há devolução ao
orquestrador por lacuna e nenhum AC a reabrir.**

## Comandos executados

Todos executados por mim em 2026-10-20 na branch `feature/lowest-price-by-market`
(árvore limpa):

```text
git status --porcelain            # → vazio (sem trabalho não commitado)
git branch --show-current         # → feature/lowest-price-by-market
git log --oneline -45             # → commits PC-0…PC-8 + 2a55d05 + 3932133 + d8e62cc conferem

npx nx test web --skip-nx-cache
# Test Files 30 passed (30); Tests 316 passed (316) — 6.72s — exit 0

npx nx test shopping-list-service --skip-nx-cache
# Test Files 20 passed (20); Tests 206 passed (206) — 4.54s — exit 0 (regressão, sem alteração de código)

npx nx test price-history-service --skip-nx-cache
# Test Files 23 passed (23); Tests 146 passed (146) — 4.27s — exit 0
# (inclui Postgres + RabbitMQ reais; integração do consumidor e db-ownership)

npx nx e2e web-e2e --skip-nx-cache
# Running 72 tests using 6 workers → 72 passed (39.7s) — exit 0
# (18 da feature: 7 lowest-price + 11+ lowest-price-by-market; 54 de regressão auth/lista/histórico/checkout — todos verdes)

npx nx e2e web-e2e --skip-nx-cache -- --grep "[Mm]enor preço"
# Running 28 tests using 4 workers → 28 passed (19.8s) — exit 0

npx nx lint web                   # ✔ All files pass linting — 0 problemas
npx nx lint web-e2e               # 0 problemas
npx nx lint price-history-service # 0 problemas
npx nx lint shopping-list-service # 0 problemas

npx nx build web --skip-nx-cache
# Application bundle generation complete — chunks lazy lowest-price-page /
# lowest-price-by-market-page — Successfully ran target build for project web
# (aviso: lowest-price-page.scss 4.26 kB > budget 4.00 kB — pré-existente, não bloqueante)

Select-String -Path "apps/web/src/app/features/price-history/*.scss" -Pattern "#[0-9a-fA-F]{3,8}|rgb\(|hsl\("
# → 0 ocorrências (tokens only)

docker exec lista-de-compras-postgres psql -U postgres -d price_history -c "select (select count(*) from purchases) as purchases, (select count(*) from purchase_items) as items"
# → purchases 0 | items 0 (higiene R-4 confirmada)

git ls-files | Select-String "\.env"   # → apenas .env.example
git ls-files | Select-String "id_rsa|\.pem|\.key"   # → 0 ocorrências
```

## Parecer

**Aprovada.** Os **16 critérios de aceite** possuem evidência executável
registrada: **16 com cenário Playwright** citado na matriz e corrida real
reproduzida por mim (`npx nx e2e web-e2e --skip-nx-cache` → **72 passed**, filtro
da feature → **28 passed**), mais evidência de integração/unitário complementar
(`npx nx test price-history-service` → **146/146**;
`npx nx test web` → **316/316**;
`npx nx test shopping-list-service` → **206/206**). O gate da ADR 0008 está
satisfeito (comando + resultado no handoff T-16 e nesta seção). O `STATUS.md`
confere com o repositório (hashes, árvore limpa, nenhum AC/T reaberto). As
checklists de documentação e de design estão completas; contratos, ADR 0011,
revisão arquitetural, README/`.env.example`, lição T-17 e segurança transversal
(sem segredo versionado) foram conferidos. As pendências registradas (follow-up
do banco de teste dedicado R-4 e budget do `lowest-price-page.scss`) são
**não bloqueantes** e não mudam comportamento, contrato ou arquitetura —
**nenhum AC a reabrir**. Push/PR/merge permanecem decisão do usuário.
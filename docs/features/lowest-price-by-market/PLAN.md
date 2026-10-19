# Plano técnico — Menor preço por mercado

**Status:** **Aprovado** em 2026-10-19 (revisão 3 — parecer arquitetural sem ressalva bloqueante; pronto para a implementação)
**Spec:** `docs/features/lowest-price-by-market/SPEC.md` (aprovada em 2026-10-19 — 16 ACs, 16 RNs, CD-01…CD-10, nenhuma decisão aberta)
**Última atualização:** 2026-10-19 (revisão 3 — incorpora o parecer arquitetural)
**Parecer arquitetural:** `docs/features/lowest-price-by-market/ARCHITECTURE-REVIEW.md` (2026-10-19) — **Aprovada com ressalvas**, **nenhuma bloqueante**; R-1…R-6 incorporadas nesta revisão (§ Parecer arquitetural e ressalvas incorporadas)
**Perguntas abertas:** **resolvidas pelo usuário em 2026-10-19** — 4/4 na recomendação do plano (ver § Perguntas abertas — resolvidas em 2026-10-19)
**Aprovação do usuário:** **aprovado em 2026-10-19** (frase canônica no § Gate do plano)

## Contexto

A feature **Menor preço por mercado** (spec aprovada pelo usuário em **2026-10-19**,
`docs/features/lowest-price-by-market/SPEC.md` — 16 ACs, 16 RNs, CD-01…CD-10,
nenhuma decisão aberta) dá **contexto à decisão de compra** sobre a tela
**Menor preço** entregue pela v1 `price-history` (validada e mergeada na `master`
— PR #4, merge `017801a`):

1. a lista principal passa a mostrar, em cada item, o **mercado**, a **data** e a
   **quantidade com a unidade** da compra que ostenta o menor preço por unidade
   e passa a ser **agrupada por mercado** (mercado A→Z, item A→Z; CD-04/CD-09);
2. tocar em um item abre a **tela dedicada `/menor-preco/:item`** com **uma linha
   por mercado** para aquele item (CD-01/CD-02/CD-07);
3. a **regra de menor preço por unidade**, a **normalização de nomes** e a
   **busca por nome** permanecem como na v1 (CD-05/CD-06).

A feature é **só de consulta/UI**: não muda a captura do checkout, o **evento de
conclusão**, a persistência de ingestão nem o consumidor (SPEC § Fora de escopo)
— logo, **nenhuma mudança de mensageria** e **nenhuma mudança de ownership**
(RN-01/ADR 0001 seguem intactas).

**Pré-condições já concluídas (não geram tarefa neste plano):**

- `docs/product/initial-scope.md` (§ Histórico de preços) foi **atualizado em
  2026-10-19** pelo `product-spec`, com autorização do usuário, trazendo a
  **comparação entre mercados** para o escopo do produto (a v1 a declarava fora);
  diff verificado pelo orquestrador (SPEC § Contratos afetados).
- Spec aprovada com a frase canônica; nenhuma decisão bloqueante aberta.
- Rework de higiene de teste da v1 **incluído neste plano** por decisão do
  usuário (2026-10-19) — ver **T-03**.

**Estado do código inspecionado nesta fase (não inventado):**

- `libs/contracts/src/http/price-history.ts` — `LowestPriceItem { name,
  nameNormalized, lowestUnitPrice }` e `LowestPricesResponse { items }` **sem**
  mercado/data/quantidade; `ItemUnit` vem de
  `libs/contracts/src/http/shopping-list.ts` (`'unidade' | 'kg' | 'g' | 'L' |
  'ml' | 'pacote' | 'caixa'`); `PurchaseItem` já tem `quantity`, `unit`,
  `unitPrice`.
- `apps/price-history-service`:
  - domínio: `domain/lowest-prices.ts` (`aggregateLowestPrices`, desempate
    atual `unitPrice` → `purchaseDate` → `createdAt`, saída ordenada por
    `nameNormalized`), `domain/lowest-price-search.ts` (substring normalizada),
    `domain/item-name.ts` (`normalizeItemName` = trim → NFKD → sem diacríticos →
    lower), `domain/purchase.ts` (`PriceHistoryPurchase { id, market,
    purchaseDate, createdAt, items }` — o **id da compra** já existe no domínio).
  - portas: `application/ports/purchase-repository.port.ts` com `insert`,
    `listSummaries`, `findById`, `findAllWithItems` (a agregação roda em memória
    sobre esse resultado).
  - adaptador: `infrastructure/persistence/drizzle/repository/purchase.repository.ts`
    (Drizzle; `purchase.repository.spec.ts` é integração com **Postgres real**);
    schema `purchases` + `purchase_items` com índice
    `purchase_items_name_normalized_idx` (`infrastructure/persistence/drizzle/schema/index.ts`).
  - borda: `api/http/price-history/price-history.controller.ts` (rotas
    `GET purchases`, `GET purchases/:id`, `GET lowest-prices?q=`), envelope
    canônico em `price-history-errors.ts` (`canonicalError`, `purchaseNotFound`),
    guard JWT global (ADR 0007).
  - migrations: `db:generate` / `db:migrate` no `project.json`; **nenhuma
    mudança de coluna é necessária nesta feature** (mercado, data, quantidade,
    unidade e preço por unidade **já** estão persistidos pela v1).
- `apps/web`: `core/price-history/price-history-api.service.ts` (3 consultas;
  base `PRICE_HISTORY_API_BASE_URL` = `http://localhost:3002`, ADR 0010), store
  `features/price-history/state/price-history-store.ts` (`providedIn: 'root'`,
  seções `purchases`/`detail`/`lowestPrices` com `{ status, data, error }`,
  guarda de sequência, retry "sem argumento repete a última busca"),
  `features/price-history/lowest-price-page.{ts,html,scss}` (lista plana
  nome+preço, busca com debounce 300ms, dois empties, skeleton/erro) e
  `purchase-format.ts` (`formatPurchaseDate`, `formatQuantity`,
  `formatUnitPrice`); rotas em `app.routes.ts` (`/historico`,
  `/historico/:id`, `/menor-preco`); `layout/bottom-nav` com abas `routerLink`
  ativas (a aba Menor preço já fica ativa em sub-rotas por prefixo).
- `apps/web-e2e`: Playwright **hermético** (ADR 0008) — fake do serviço tipado
  por `@lista/contracts` (`support/price-history-fake-api.ts`, dispatch das 3
  operações; `support/price-history-fixtures.ts`; `support/price-history-journey.ts`;
  jornadas em `src/price-history/{nav,history,lowest-price}.spec.ts`; hoje
  **56/56** verdes).

## Superfície de UI

- **Superfície de UI:** **sim**
- **Justificativa:** a feature altera `apps/web` (lista Menor preço agrupada com
  métricas novas, **rota nova** `/menor-preco/:item` + tela dedicada, camada de
  dados e store) e **todos** os 16 ACs têm comportamento observável em
  tela/interação — inclusive AC-04 (estabilidade da saída entre cargas é
  observável em recarga) e AC-15 (401 derruba a sessão e devolve ao login, já
  que as duas telas chamam o serviço). Pela **ADR 0008**: matriz `AC ↔ E2E`
  completa (abaixo) **e** tarefa Playwright obrigatória em `apps/web-e2e`
  (**T-16**, evidência `npx nx e2e web-e2e`).

## Abordagem

1. **ADR da operação nova (T-01).** A consulta do drill-down
   (`GET /api/price-history/lowest-prices/{item}`) **não** está enumerada no
   escopo da exceção temporária vigente (ADR 0010 §1); pela regra das ADRs
   0006/0010 isso exige **nova decisão registrada** (SPEC RN-15). Este plano
   decide por **ADR 0011 nova** (**decisão do usuário em 2026-10-19**, Pergunta
   3; mesma base `http://localhost:3002`, mesmo CORS,
   mesmos critérios de saída da 0010) + nota na **ADR 0010 §1** apontando para
   ela. Nada de infraestrutura muda.
2. **Contratos primeiro (T-04).** `libs/contracts/src/http/price-history.ts`
   passa a carregar mercado/data/quantidade(+unidade) na linha de menor preço,
   agrupa a resposta principal **por mercado** e ganha o tipo da resposta do
   drill-down; `libs/contracts/README.md` documenta as operações e status.
3. **Agregação continua no serviço (RN-12).** Domínio calcula o **registro
   vencedor** (menor preço por unidade; empate → compra mais recente; empate de
   data → `id` do registro), **agrupa por mercado** e **ordena**; a PWA não
   recalcula, não reordena e não decide empate (T-05…T-10).
4. **Leitura enxuta no drill-down (T-08).** Port ganha
   `findAllWithItemsByName(nameNormalized)`, implementado no adaptador Drizzle
   sobre o **índice já existente** `purchase_items_name_normalized_idx` — **sem
   migration nova** e **sem índice novo** (justificativa em § Dados e ownership).
5. **Borda HTTP (T-10).** A rota existente evolui (mesmo caminho, resposta nova)
   e entra a rota nova do item com **404 canônico** quando o parâmetro não resolve
   para nenhum item (RN-08/AC-12). Guard JWT global cobre as duas (ADR 0007).
6. **PWA (T-11…T-13).** Camada de dados + store com a seção nova do item;
   lista agrupada por mercado com cabeçalho de grupo; tela do item com app bar,
   **voltar** em todos os estados e uma linha por mercado; **CD-10** resolvido no
   store (o `query` e a lista sobrevivem à navegação — inclusive na entrada pela
   aba; **decisão do usuário em 2026-10-19**, Pergunta 4 — e a tela sincroniza o
   campo com o store, repetindo a última consulta em vez de descartar a busca).
7. **Rework de higiene de teste da v1 (T-03).** O spec de integração do
   repositório deixa de deixar resíduo no banco de dev (limpeza determinística
   após a suíte), **sem** enfraquecer a prova de rejeição de `unit` inválida.
8. **Testes.** Unit/integração no serviço (Postgres real onde couber), unit no
   PWA e **E2E Playwright hermético** (fake do serviço) para as jornadas de UI,
   incluindo asserção da base `http://localhost:3002` + `Authorization` na
   operação nova.
9. **Revisão arquitetural (T-02)** obrigatória antes do código (contrato público
   compartilhado evoluído + operação nova sob exceção ao gateway + consumo pela
   PWA). **Concluída em 2026-10-19:** aprovada **com ressalvas, nenhuma
   bloqueante**; R-1…R-6 incorporadas nesta revisão 3 (§ Parecer arquitetural e
   ressalvas incorporadas). Ressalva bloqueante → o plano não fecha o gate.

## Domínio e casos de uso

### `price-history-service` (evolução — nenhuma mudança de ingestão)

- **Vencedor por item (RN-02/RN-03/RN-04, AC-01/AC-03/AC-04):** para cada
  `nameNormalized`, a compra vencedora é a de **menor `unitPrice`**; empate →
  **maior `purchaseDate`**; empate de data → **`id` do registro** (o
  `completionId` da compra), comparado em ordem lexicográfica **crescente**
  (vence o menor `id`). A cadeia de desempate da v1 perde o último critério
  `createdAt` — a SPEC fixa o **`id`** como desempate final determinístico
  (CD-03). Da compra vencedora saem `market`, `purchaseDate`, `quantity` e
  `unit` (CD-08); o **nome de exibição** continua sendo o do item que ostenta o
  menor preço.
- **Agrupamento e ordenação (RN-05/CD-04/CD-09, AC-02):** itens agrupados pelo
  **mercado da compra vencedora**; mercados em **A→Z** pela normalização de
  nomes (caixa/acentos ignorados, **desempate pelo texto cru** — decisão do
  usuário em 2026-10-19, Pergunta 2); dentro do grupo, itens
  em **A→Z** por `nameNormalized` (comparação por código de ponto, estável, sem
  locale). **Só existem grupos com ≥1 item** — o agrupamento parte dos itens,
  então cabeçalho vazio é impossível por construção (CD-09).
- **Busca (RN-10/CD-06, AC-09):** inalterada na regra — filtro por substring sob
  a mesma normalização; o resultado filtrado é agrupado/ordenado como acima;
  busca sem resultado → lista vazia de grupos (a PWA mostra o **empty de busca**,
  distinto do empty de histórico).
- **Drill-down do item (RN-06/RN-07/RN-09, AC-05…AC-08):** o `{item}` chega cru
  da borda e é **normalizado com `normalizeItemName`** (a mesma normalização da
  busca — **R-1** do parecer); só então agrupa as compras **daquele item** por
  mercado e aplica a mesma cadeia de vencedor **dentro de cada mercado** (AC-07);
  devolve **uma linha por mercado** em A→Z (mesma normalização/desempate), com
  `market`, `lowestUnitPrice`,
  `purchaseDate`, `quantity` e `unit`; o **nome de exibição canônico** é o do
  item que ostenta o menor preço **entre todos os mercados** (consistente com a
  lista principal — CD-07). Item sem nenhuma compra → caso de uso devolve `null`
  → a borda responde **404** (RN-08/AC-12).
- **Não muda:** ingestão idempotente, consumidor RabbitMQ, validação de payload,
  persistência, ownership e o evento `shopping-list.purchase-completed` v1.

### PWA (`apps/web`)

- **Camada de dados:** `PriceHistoryApiService` ganha
  `getLowestPricesByItem(item) → GET {base}/api/price-history/lowest-prices/{item}`
  (segmento já percent-encoded) e mantém `getLowestPrices(q?)`; `Authorization` e
  401 continuam no interceptor de auth (ADR 0007/0010).
- **Store:** `lowestPrices` passa a guardar os **grupos** do serviço (sem
  agrupamento/ordenação no cliente); nova seção `itemLowestPrices`
  (`{ status, data, error, selectedItem }`) com retry sem argumento que repete
  **a mesma** consulta (mesma busca / mesmo item — AC-14). Estados
  `loading | loaded | notFound | error` — **R-5** do parecer: o store mapeia
  `HttpErrorResponse.status === 404` para **`notFound`** (não encontrado — AC-12)
  e **qualquer outro** erro para `error` (com retry — AC-14); o `status` derivado
  fica **no store**, não só na tela. Mais os estados de tela **empty** (lista,
  busca) e o **401** herdado do interceptor (AC-15).
- **CD-10 (voltar preservando busca):** o store é `providedIn: 'root'` e já
  guarda `query` + resultado; a tela do item **não** limpa nada; a lista, ao ser
  recriada, **sincroniza o campo com `store.query`** e repete a **mesma**
  consulta (em vez do `loadLowestPrices('')` da v1) — o termo e a lista filtrada
  continuam como estavam (AC-11).
- **Skeleton:** renderizado apenas quando **não há dados** da seção carregada
  (leitura literal de AC-13: "na primeira carga"), evitando piscar skeleton ao
  voltar do drill-down.
- **Lista agrupada (AC-01/AC-02/AC-08):** cabeçalho de grupo por mercado
  (`eyebrow`/`caption`, `--color-ink-muted`), whitespace maior entre grupos e
  menor dentro; linha = nome + menor preço (R$) + metadados
  `mercado · data · quantidade com a unidade`, toda clicável (≥ 44px) para
  `/menor-preco/:item` (`RouterLink` com `encodeURIComponent(nameNormalized)` —
  Pergunta 1).
- **Tela do item (AC-05/AC-06/AC-07/AC-12/AC-16):** app bar com o nome do item
  (do serviço), **voltar** com `aria-label` visível em todos os estados, uma
  linha por mercado (mercado + menor preço por unidade + `data · quantidade com
  a unidade`), bloco de **não encontrado** com voltar para `/menor-preco`, e os
  4 estados do guia.

## Contratos

### HTTP — `price-history-service` (prefixo global `api`, porta 3002)

Base da PWA `http://localhost:3002` (**ADR 0010** + **ADR 0011**, T-01). Todas as
rotas exigem JWT (guard global, ADR 0007) — 401 uniforme
`{ statusCode: 401, message: "Não autorizado" }`.

| Operação | Rota | Request | Sucesso | Erros |
| --- | --- | --- | --- | --- |
| Listar compras | `GET /api/price-history/purchases` | — | 200 `PurchaseListResponse` | 401, 500 |
| Detalhe da compra | `GET /api/price-history/purchases/{id}` | — | 200 `PurchaseDetailResponse` | 404, 401, 500 |
| Menores preços (evoluído) | `GET /api/price-history/lowest-prices` | query opcional `q` | **200 `LowestPricesResponse`** (agrupada por mercado) | 401, 500 |
| **Menores preços do item por mercado (novo)** | `GET /api/price-history/lowest-prices/{item}` | `{item}` = `nameNormalized` percent-encoded com `encodeURIComponent` (ex.: `caf%C3%A9`) | **200 `LowestPriceByMarketResponse`** | **404**, 401, 500 |

- As duas primeiras operações estão **inalteradas**.
- `q` continua sendo filtro de nome (substring normalizada); `q` vazio ou só
  espaços = lista completa.
- **404 da rota nova:** envelope canônico `{ statusCode: 404, message }` com
  mensagem PT própria (`Item não encontrado no histórico`) — mesmo padrão de
  `purchaseNotFound()`.
- **Rota nova e o caminho existente:** `lowest-prices/{item}` é sub-recurso de
  `lowest-prices`; não há conflito com `lowest-prices?q=`.
- **Limitação conhecida do parâmetro (Pergunta 1, decidida em 2026-10-19):** o
  caminho carrega o `nameNormalized` **literal percent-encoded**
  (`encodeURIComponent`); nome de item contendo `/` **não** é representável e cai
  em 404 embora exista — risco registrado em § Riscos (não bloqueante), com
  mitigação futura fora desta feature.
- CORS **inalterado** (`PRICE_HISTORY_CORS_ORIGINS`, `methods: ['GET','OPTIONS']`,
  `allowedHeaders: ['Content-Type','Authorization']`).

### Contratos compartilhados — `libs/contracts/src/http/price-history.ts`

```ts
import { ItemUnit } from './shopping-list';

/** Linha de menor preço de um item na lista principal (RN-02/RN-03/RN-04). */
export interface LowestPriceItem {
  /** Nome de exibição do item que ostenta o menor preço (RN-03). */
  name: string;
  /** Chave de agrupamento/busca e parâmetro `{item}` da rota do drill-down
   * (percent-encoded com `encodeURIComponent`) — RN-02/RN-09/CD-07. */
  nameNormalized: string;
  /** Menor preço POR UNIDADE, em R$ — nunca o total da compra (RN-02). */
  lowestUnitPrice: number;
  /** Mercado da compra vencedora (RN-03). */
  market: string;
  /** Data da compra vencedora, `YYYY-MM-DD` (RN-03). */
  purchaseDate: string;
  /** Quantidade da compra vencedora, com a unidade (CD-08). */
  quantity: number;
  unit: ItemUnit;
}

/** Grupo de mercado da lista principal, já ordenado e nunca vazio (RN-05/CD-04/CD-09). */
export interface LowestPriceMarketGroup {
  market: string;
  /** Itens do grupo em ordem A→Z por `nameNormalized` (RN-05). */
  items: LowestPriceItem[];
}

/** Lista principal: agrupamento, ordenação e desempate vêm prontos do serviço (RN-12). */
export interface LowestPricesResponse {
  /** Mercados em ordem A→Z; só grupos com ao menos um item (CD-09). */
  markets: LowestPriceMarketGroup[];
}

/** Uma linha por mercado do drill-down de um item (RN-06). */
export interface LowestPriceByMarketLine {
  market: string;
  /** Menor preço POR UNIDADE daquele item NAQUELE mercado, em R$ (RN-06). */
  lowestUnitPrice: number;
  /** Data da compra vencedora naquele mercado, `YYYY-MM-DD`. */
  purchaseDate: string;
  /** Quantidade da compra vencedora naquele mercado, com a unidade (CD-08). */
  quantity: number;
  unit: ItemUnit;
}

/** Drill-down: `/menor-preco/:item` (CD-01/CD-02/CD-07). */
export interface LowestPriceByMarketResponse {
  /** Nome de exibição canônico, vindo do serviço (RN-09/CD-07). */
  name: string;
  nameNormalized: string;
  /** Mercados em ordem A→Z (RN-06). */
  markets: LowestPriceByMarketLine[];
}
```

- **Breaking change declarada:** `LowestPricesResponse.items` →
  `markets[]` e `LowestPriceItem` ganha 4 campos. Consumidores afetados (todos
  atualizados **dentro desta feature**): domínio/casos de uso/controller do
  `price-history-service`; store/tela/fixtures da PWA; fake e jornadas do
  `web-e2e`; `libs/contracts/README.md`. Ver § Impacto nos testes existentes.
- Sem `any`: os tipos acima são a única fonte de verdade (serviço ↔ PWA ↔ E2E).

### Acesso da PWA (exceção ao gateway)

- A PWA continua chamando o `price-history-service` **diretamente** (porta 3002,
  `/api/price-history/*`), com JWT no header (RN-15).
- A **operação nova** do drill-down exige decisão registrada pela regra das ADRs
  0006/0010 → **ADR 0011** (T-01), com os mesmos critérios de saída/migração da
  0010 e ponte na ADR 0010 §1.

### Evento de conclusão (mensageria)

- **Nenhuma mudança.** Produtor, consumidor, envelope, routing key, fila e
  idempotência permanecem exatamente como na v1
  (`docs/features/price-history/PLAN.md` § Contratos · Eventos).

## Dados e ownership

- **Ownership inalterado (RN-01/ADR 0001):** o `price-history-service` continua
  dono exclusivo do banco lógico `price_history`; nenhum outro serviço lê ou
  grava esse banco. Nenhum serviço novo, nenhuma integração nova.
- **Nenhuma migration e nenhum índice novo.** Os dados exigidos já existem:
  `purchases(market, purchase_date, created_at)`,
  `purchase_items(name, name_normalized, quantity, unit, unit_price)`. O
  drill-down filtra por `purchase_items.name_normalized` — coberto pelo índice
  **existente** `purchase_items_name_normalized_idx`; a junção com `purchases`
  é por PK. **Trade-off registrado:** um índice composto
  (`(name_normalized, …)`) ou a agregação em SQL não se justificam no volume
  atual (a v1 já agrega em memória) e adicionariam risco sem ganho observável —
  se o volume crescer, a evolução vira tarefa própria com migration.
- **Porta/adaptador (onde vive o quê):**
  - **domínio** (`domain/lowest-prices.ts` / `domain/lowest-price-by-item.ts`):
    escolha do vencedor, agrupamento por mercado, ordenação e desempate — puro,
    sem framework/banco (RN-12).
  - **porta** (`application/ports/purchase-repository.port.ts`): novo método
    `findAllWithItemsByName(nameNormalized): Promise<PriceHistoryPurchase[]>`
    (contrato dos casos de uso; o fake in-memory dos specs também implementa).
  - **adaptador** (`infrastructure/persistence/drizzle/repository/purchase.repository.ts`):
    implementação Drizzle com `inner join` + `where name_normalized = $1`,
    devolvendo cada compra com **apenas** os itens que casam com o nome (a
    agregação não precisa dos demais e o contrato fica explícito no spec de
    integração).
- **Casos de uso** ficam sobre a porta: `ListLowestPricesUseCase` (evolui) e
  `GetLowestPricesByItemUseCase` (novo, devolve `null` quando o item não existe).
- **Segredos:** nenhum novo. JWT público e RabbitMQ como na v1; nenhuma variável
  de ambiente nova.

## Revisão arquitetural

- **Obrigatória:** **sim** — o **contrato público compartilhado**
  (`libs/contracts`) muda de forma incompatível, uma **operação nova** passa a
  usar a exceção temporária ao gateway (RN-15/ADR 0010 → ADR 0011) e a PWA muda
  de camada de dados a telas. Não há mudança de ownership, de evento nem
  cruzamento entre serviços.
- **Parecer:** `docs/features/lowest-price-by-market/ARCHITECTURE-REVIEW.md`
  (2026-10-19) — **Aprovada com ressalvas**, **nenhuma bloqueante** (R-1…R-6,
  todas com tarefa dona).
- **Tarefa:** **T-02** (`architecture-review`), sobre este plano + a ADR 0011
  (T-01). **Estado: concluída** — parecer **sem ressalva bloqueante**, o que
  habilita a frase canônica do usuário. As ressalvas R-1…R-6 foram incorporadas
  na **revisão 3** deste plano antes da aprovação (detalhe na § Parecer
  arquitetural e ressalvas incorporadas).

## Estratégia de testes

Pré-requisitos backend: `npm run docker:up` (Postgres 5432 + RabbitMQ 5672);
`npx nx run price-history-service:db:migrate`. E2E de UI permanece **hermético**
(sem Docker, sem broker, sem JWT real — ADR 0008).

- **`price-history-service` — domínio (unit):** vencedor e desempate
  (`unitPrice` → data → `id`), agrupamento por mercado A→Z, itens A→Z, ausência
  de grupo vazio, busca sob o item evoluído, drill-down do item (N mercados → N
  linhas; mais de uma compra no mesmo mercado → menor daquele mercado; um único
  mercado → uma linha). Comando: `npx nx test price-history-service -- domain`.
- **`price-history-service` — persistência (integração, Postgres real):**
  `findAllWithItemsByName` devolve só as compras que contêm o item, com só os
  itens que casam, na ordem estável do contrato; suíte sem resíduo no banco
  (T-03). Comando: `npx nx test price-history-service -- repository`.
- **`price-history-service` — casos de uso (unit com repo fake):** lista
  agrupada; `q` filtra e mantém o agrupamento; drill-down **normaliza o
  parâmetro** (`Café`/`CAFÉ`/` café ` → mesmo item, R-1) e devolve `null` para
  item sem histórico (404 da borda); retry idêntico. Comando:
  `npx nx test price-history-service -- use-cases`.
- **`price-history-service` — borda HTTP (integração de controller com JWT):**
  200 nos dois shapes; `q`; parâmetro **não** normalizado (`Caf%C3%A9`) resolvendo
  o item (R-1); **round-trip do nome com `/`** (`leite%2Fa%C3%A7%C3%BAcar`, R-2);
  invariante `items[].market === markets[].market` (R-6b); 404 canônico PT; 401
  sem/with token inválido nas duas rotas. Comandos:
  `npx nx test price-history-service -- http`;
  `npx nx build price-history-service`.
- **`web` (unit):** serviço HTTP (URL + `Authorization` + `q`, itens com `/` no
  nome codificados — R-2); store (grupos, item, estados, **404 → `notFound`** vs.
  erro+retry, R-5; retry idêntico; 401); telas (agrupamento visual, metadados,
  navegação para o drill-down, 4 estados, empty de busca, não encontrado vindo do
  store, voltar). Comando: `npx nx test web` (+ `npx nx lint web`).
- **E2E Playwright (ADR 0008):** jornadas herméticas em
  `apps/web-e2e/src/price-history/` com o fake tipado por `@lista/contracts`
  servindo os **dois** shapes novos e a nova rota; ≥1 asserção de chamada a
  `http://localhost:3002/api/price-history/lowest-prices/{item}` com
  `Authorization` (ADR 0011); jornada com item contendo `/` no nome (round-trip
  R-2). Comando: `npx nx e2e web-e2e --skip-nx-cache`
  (filtro `-- --grep "[Mm]enor preço"`).
- **Regressão:** jornadas de auth, Lista, Histórico e checkout devem permanecer
  verdes (a nav, as rotas existentes e o contrato de compras não mudam).

### Matriz AC ↔ E2E

Arquivos: `apps/web-e2e/src/price-history/lowest-price.spec.ts` (**atualizado**),
`.../lowest-price-by-market.spec.ts` (**novo**), `.../nav.spec.ts` (regressão de
acesso/sessão), `apps/web-e2e/src/support/price-history-{fake-api,fixtures}.ts`.

| AC | Observável na UI? | Cenário Playwright (arquivo / título) | Evidência não-E2E (complemento) |
| --- | --- | --- | --- |
| AC-01 | sim | `lowest-price.spec.ts` — "lista agrupada: cada linha traz o menor preço por unidade e mercado · data · quantidade com a unidade da compra vencedora" | `npx nx test price-history-service -- domain`/`-- http`: shape do contrato; unit web da linha |
| AC-02 | sim | `lowest-price.spec.ts` — "mercados A→Z (caixa/acentos ignorados) e itens A→Z dentro do grupo; item de vários mercados aparece uma vez; mercado sem item vencedor não gera cabeçalho" | unit domínio (grupos/ordenação/nenhum grupo vazio — CD-09) |
| AC-03 | sim | `lowest-price.spec.ts` — "dois registros do mesmo item (R$ 10,00 e R$ 7,50): a linha credita o mercado/data/quantidade do registro de R$ 7,50" | unit domínio (menor por unidade, sem média/último preço) |
| AC-04 | sim | `lowest-price.spec.ts` — "empate de preço credita a compra mais recente; recarregar a tela mantém o mesmo grupo e os mesmos mercado/data/quantidade" | unit domínio (desempate `id` determinístico) |
| AC-05 | sim | `lowest-price-by-market.spec.ts` — "tocar a linha navega para `/menor-preco/cafe` (caminho = `nameNormalized` percent-encoded — Pergunta 1), resolve `Café` (acento) e mostra app bar + voltar em todos os estados" | unit rotas (`app.routes.spec`) + página |
| AC-06 | sim | `lowest-price-by-market.spec.ts` — "item em 3 mercados: 3 linhas A→Z, cada uma com o menor preço por unidade, data e quantidade com a unidade daquele mercado" | unit domínio (`lowest-price-by-item`) + contrato HTTP |
| AC-07 | sim | `lowest-price-by-market.spec.ts` — "duas compras no mesmo mercado (R$ 9,00 e R$ 6,00): a linha daquele mercado mostra R$ 6,00 e a data/quantidade da compra de R$ 6,00" | unit domínio (vencedor dentro do mercado) |
| AC-08 | sim | `lowest-price.spec.ts` + `lowest-price-by-market.spec.ts` — "item de um único mercado aparece normalmente no grupo e a tela do item mostra uma única linha" | unit domínio (sem tratamento especial) + unit tela |
| AC-09 | sim | `lowest-price.spec.ts` — "busca `cafe` acha `café` e mantém o agrupamento; busca sem resultado mostra o empty de busca com Limpar busca" | unit domínio (filtro) + unit página |
| AC-10 | sim | `lowest-price.spec.ts` (jornada de lista vazia) — "sem preços, empty state rico com uma única primary" | unit página (empty de lista ≠ empty de busca) |
| AC-11 | sim | `lowest-price-by-market.spec.ts` — "voltar da tela do item preserva o termo `cafe` e a lista filtrada; entrar de novo pela aba Menor preço também preserva (não recarrega a lista completa)" | unit store (query + lista preservadas) + unit páginas |
| AC-12 | sim | `lowest-price-by-market.spec.ts` — "abrir `/menor-preco/item-inexistente` mostra o bloco de não encontrado com voltar; nunca tela em branco" | integração HTTP 404 canônico + unit store/página |
| AC-13 | sim | `lowest-price.spec.ts` + `lowest-price-by-market.spec.ts` — "primeira carga das duas telas mostra skeleton na forma do conteúdo (nunca spinner sozinho)" | unit páginas (skeleton por `role=status`) |
| AC-14 | sim | `lowest-price.spec.ts` + `lowest-price-by-market.spec.ts` — "falha de carga: erro visível e Tentar novamente refaz a MESMA consulta (mesma busca / mesmo item)" | unit store (retry repete a última consulta) + páginas |
| AC-15 | sim | `nav.spec.ts` (ou `lowest-price-by-market.spec.ts`) — "401 na lista e na tela do item: volta ao login com returnUrl; a chamada que gerou 401 levou `Bearer`" | integração HTTP 401 nas duas rotas + interceptor/serviço unit |
| AC-16 | sim | `nav.spec.ts` + as duas jornadas — "360px e desktop, tema claro/escuro, uma primary por tela, alvos ≥44px, cor lida do token" | `design-tokens.smoke.spec.ts` (sem cor hardcoded) + checklist de design da VALIDATION |

Regras (ADR 0008): **Superfície de UI = sim**; os **16 ACs** têm cenário
Playwright citado acima; nenhum E2E por AC — as jornadas cobrem vários ACs.
Nenhum AC é backend-only nesta feature (AC-15 tem perna de backend, com
evidência de integração adicional).

## Riscos e trade-offs

- **Contrato compartilhado com breaking change.** `LowestPricesResponse` muda de
  `items` para `markets` e a linha ganha 4 campos. Sequência adotada: contratos
  (T-04) → serviço (T-05…T-10) → PWA (T-11…T-13) → auditorias (T-14/T-15) →
  E2E (T-16). **Entre T-04 e T-10/T-11 há suítes temporariamente vermelhas** por
  consumirem o shape antigo (lista exata em § Impacto nos testes existentes).
  Não são regressões: cada uma é fechada pela T indicada e o gate final exige
  tudo verde (auditorias T-14/T-15 + E2E T-16).
- **Resposta agrupada (`markets[]`) × lista plana.** A forma agrupada foi
  escolhida porque a SPEC (RN-12/CD-04/CD-09) determina que **o agrupamento
  chega pronto do serviço** e que **não há grupo vazio** — com grupos explícitos
  isso é garantia do contrato, não convenção da PWA. Custo: contrato novo em vez
  de campo aditivo. Alternativa (lista plana + PWA agrupando por consecutividade
  de mercado) foi descartada por deixar a regra de CD-09 do lado do cliente.
- **Cadeia de desempate muda.** Sai `createdAt`, entra o `id` do registro
  (RN-04/CD-03). Um caso da suíte v1 (`lowest-prices.spec.ts`, empate por
  `createdAt`) é reescrito em T-05 — não é regressão, é a regra nova.
- **Ordenação de mercado.** **Decidido pelo usuário em 2026-10-19** (Pergunta 2):
  A→Z pela **normalização** de nomes (a mesma `normalizeItemName`: trim → NFKD →
  sem diacríticos → minúsculas), com desempate pelo **texto cru**. A ordenação é
  do serviço (T-05/T-07) e tem caso de spec dedicado (`Atacadão` antes de
  `Zaffari`) — a PWA só renderiza a ordem recebida.
- **`createdAt`/`id` do item.** O desempate usa o `id` da **compra**
  (`completionId`), que é o registro cujos mercado/data/quantidade são
  creditados; usar `purchase_items.id` exigiria expor a coluna no domínio sem
  ganho de produto. Registrado como decisão.
- **Parâmetro `:item` — hipótese a refutar por teste (R-2), não bloqueante.**
  **Decidido pelo usuário em 2026-10-19** (Pergunta 1): o caminho carrega o
  **`nameNormalized` literal percent-encoded** (`encodeURIComponent`), sem "slug"
  com hífens e sem transformação nova — `/menor-preco/batata`,
  `/menor-preco/caf%C3%A9`. A hipótese de limitação ("nome com `/` não é
  representável no caminho → 404 embora o item exista") é **provavelmente falsa**
  conforme o parecer (§ Ressalvas R-2): `encodeURIComponent` codifica `/` como
  `%2F` e o router da PWA e o Fastify decodificam **por segmento**, não por
  caminho. **A hipótese fica em aberto até a evidência:** spec de round-trip nas
  tarefas **T-05** (domínio: `nameNormalized` de `Leite/Açúcar` preservado),
  **T-11** (URL gerada `…/leite%2Fa%C3%A7%C3%BAcar`), **T-10** (200 no Fastify
  para o caminho codificado), **T-13** (rota resolve `leite/açúcar`) e jornada
  **T-16**. **Critério de fechamento:** se o round-trip passar em todos os
  pontos, a limitação é **retirada** desta § Riscos e da nota da § Perguntas
  resolvidas no fechamento da feature (`VALIDATION.md`/handoff de T-16 registram
  a retirada), ficando só a nota "coberto por teste"; se **qualquer** round-trip
  falhar, a limitação permanece como risco e a **mitigação futura** (rota por
  identificador opaco, ex.: `/menor-preco/:id`, ou segmento base64url) vira
  follow-up com ADR própria — **sem** mudança de escopo nesta feature.
- **CD-10 no store (estado de sessão).** **Decidido pelo usuário em 2026-10-19**
  (Pergunta 4): preservar busca/lista implica que a tela Menor preço **não**
  volta à lista completa a cada entrada (comportamento da v1) enquanto o store
  estiver `loaded`; a tela **repete a última consulta** (busca preservada, sem
  piscar skeleton). O skeleton só aparece sem dados, então a volta não pisca.
- **Higiene de teste (v1).** O `update … set({unit:'invalida'})` sem `where`
  corrompia `purchase_items` no banco de dev e derrubava `GET
  /api/price-history/lowest-prices` com 500 (achado de 2026-10-19). T-03 trunca
  a cada caso e prova `count(*) = 0` no fim; banco de teste dedicado fica fora
  do escopo (exigiria decisão de configuração/ambiente própria).
  **R-4 (parecer):** o **cabeçalho do spec** precisa declarar, em texto, que a
  suíte **apaga `purchases`/`purchase_items` do banco de dev `price_history` a
  cada caso** (o banco de dev passa a ser descartável) e que o **banco de teste
  dedicado é follow-up** registrado — o follow-up é encaminhado à lição **T-17**.
- **Parâmetro cru → 404 espúrio (R-1).** Se o `{item}` chegar sem passar pela
  normalização, uma URL digitada à mão (`/lowest-prices/Caf%C3%A9`) cairia em 404
  apesar de o item existir — quebra a RN-09 ("resolve pela mesma normalização",
  como o `q` da busca faz em `domain/lowest-price-search.ts`). Mitigado em T-09
  (normalização no caso de uso) e provado em T-10 (200 para o parâmetro não
  normalizado).
- **E2E hermético × integração real.** O E2E prova a **UI** contra contratos
  tipados; a agregação/desempate reais são provados por unit de domínio e
  integração Postgres (mesmo desenho da v1).
- **Fake do E2E espelha o serviço.** O fake agrupa e filtra como o serviço; se a
  RN-05/RN-10 mudar, `support/price-history-fake-api.ts` precisa acompanhar
  (pendência de processo já registrada na v1).

## Parecer arquitetural e ressalvas incorporadas (revisão 3)

Parecer `docs/features/lowest-price-by-market/ARCHITECTURE-REVIEW.md`
(2026-10-19): **Aprovada com ressalvas — nenhuma bloqueante**. As seis ressalvas
foram incorporadas nas tarefas já existentes (sem renumerar T nem onda, sem
alterar a matriz `AC ↔ E2E`).

| Ressalva (parecer) | Onde entrou nesta revisão | Tarefas |
| --- | --- | --- |
| **R-1** — normalizar `{item}` no serviço | § Domínio e casos de uso (drill-down); § Decisões; § Estratégia de testes; T-09 (normalização + spec) e T-10 (evidência `/lowest-prices/Caf%C3%A9` → 200) | T-09, T-10 |
| **R-2** — provar o round-trip do nome com `/` e retirar a "limitação" se passar | § Riscos (limitação reescrita como **hipótese a refutar**); § Perguntas resolvidas (nota condicional); T-05, T-10, T-11, T-13, T-16 (specs/jornada de round-trip) | T-05, T-10, T-11, T-13, T-16 |
| **R-3** — ponto de commit da janela de suíte vermelha | § Composição dos commits e janela vermelha (nova subseção de § Impacto nos testes existentes); § Ordem e paralelismo | T-04 (+ consumidores), orquestrador |
| **R-4** — documentar que T-03 trunca o banco de dev | T-03 (cabeçalho do spec + evidência) e T-17 (lição: banco de teste dedicado como follow-up) | T-03, T-17 |
| **R-5** — 404 ≠ erro genérico no store | § PWA (estados da seção `itemLowestPrices`); T-11 (mapeamento `status === 404` → não encontrado + specs) e T-13 (tela consome o estado) | T-11, T-13 |
| **R-6** — coerência de contrato/documentação | T-04 (README cita **ADR 0011**) e T-05/T-10 (invariante `item.market === grupo.market` provada por teste) | T-04, T-05, T-10 |

> **Nenhuma ressalva exigiu decisão nova** do usuário: todas são ajuste de
> detalhe contratual, de processo ou de documentação, com tarefa dona. Os dois
> pontos que dependem de **resultado de teste** estão declarados como tal: o
> round-trip do nome com `/` (R-2) e a composição dos commits (R-3).

## Tarefas

Cada tarefa: **um agente**, escopo de arquivos explícito, dependências, comando
de teste executável e evidência esperada. O padrão é **sequencial**; paralelismo
só com arquivos disjuntos e sem dependências (máx. 2 simultâneas — provas na
§ Ordem e paralelismo).

| ID | ACs | Agente | Descrição | Arquivos permitidos | Depende de | Testes/comandos | Evidência esperada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | RN-15 (acesso/ADR; habilita AC-05/AC-06) | backend-dev | **ADR 0011** (nova) registrando a operação nova `GET /api/price-history/lowest-prices/{item}` no escopo da exceção temporária ao gateway (base `http://localhost:3002`, CORS inalterado, validade "enquanto o gateway não existir", critérios de saída iguais aos da ADR 0010, dono do follow-up = feature "API Gateway"); **nota na ADR 0010 §1** apontando para a 0011 (quarta operação da exceção) — **forma decidida pelo usuário em 2026-10-19**, Pergunta 3: ADR **nova** em vez de estender a 0010 | `docs/decisions/0011-excecao-temporaria-ao-gateway-drill-down-menor-preco-por-mercado.md`, `docs/decisions/0010-excecao-temporaria-ao-gateway-price-history-service.md` | — | revisão de doc: `git diff docs/decisions`; formato de `docs/decisions/TEMPLATE-adr.md` | ADR no formato do template (Contexto/Decisões/Alternativas/Consequências), citando SPEC RN-15 e a operação nova; ADR 0010 §1 com a ponte para a 0011 |
| T-02 | — (gate do plano) | architecture-review | **Revisão arquitetural** do plano + ADR 0011: forma do contrato agrupado, breaking change em `libs/contracts`, leitura enxuta na porta (`findAllWithItemsByName` sem migration), desempate pelo `id`, exceção ao gateway e camadas da PWA | `docs/features/lowest-price-by-market/ARCHITECTURE-REVIEW.md` | T-01 | revisão do `PLAN.md`/`SPEC.md`/ADR 0011 + `git diff` | Parecer com estado explícito (**aprovada** / **aprovada com ressalvas** / **reprovada**) e riscos; **nenhuma ressalva bloqueante** → habilita a aprovação do usuário — **concluído em 2026-10-19: Aprovada com ressalvas (nenhuma bloqueante); R-1…R-6 incorporadas ao PLAN na revisão 3** |
| T-03 | — (rework v1; sustenta a evidência do serviço usada por AC-01…AC-16) | backend-dev | **Higiene do spec de integração**: limpeza determinística após a suíte (ex.: `afterEach` truncando, reaproveitando o `beforeEach`) e `update` escopado com `where` no caso do `unit` inválido (L216–224), **sem** enfraquecer a prova de rejeição; opcionalmente `afterAll` afirmando `count(*) = 0` antes de fechar o pool; **cabeçalho do spec** declarando que a suíte **apaga `purchases`/`purchase_items` do banco de dev `price_history` a cada caso** (banco de dev descartável) e que o **banco de teste dedicado é follow-up** (**R-4**) | `apps/price-history-service/src/infrastructure/persistence/drizzle/repository/purchase.repository.spec.ts` | — | `npm run docker:up`; `npx nx run price-history-service:db:migrate`; `npx nx test price-history-service -- repository`; `docker exec lista-de-compras-postgres psql -U postgres -d price_history -c "select (select count(*) from purchases) as purchases, (select count(*) from purchase_items) as items"` | Suíte verde **e** contagem **0 / 0** logo após a corrida (nenhum resíduo no banco de dev); teste "linha com unit fora do domínio falha explícita no mapeamento" mantido e ainda rejeitando; **cabeçalho do spec** com o aviso "esta suíte apaga o banco de dev" + follow-up do banco dedicado (R-4) |
| T-04 | AC-01…AC-09, AC-12 (base de contratos) | backend-dev | **Contratos**: evoluir `LowestPriceItem` (market/purchaseDate/quantity/unit) e `LowestPricesResponse` (`markets[]`), criar `LowestPriceMarketGroup`, `LowestPriceByMarketLine` e `LowestPriceByMarketResponse`; atualizar `libs/contracts/README.md` com a operação nova (rota, 200/404/401, shape, `{item}` = `nameNormalized` **percent-encoded** com `encodeURIComponent` — decisão do usuário em 2026-10-19, Pergunta 1) — citando **a ADR 0010 *e* a ADR 0011** na base direta (**R-6a**) | `libs/contracts/src/http/price-history.ts`, `libs/contracts/README.md` | T-02 | `npx nx build contracts`; `npx nx lint contracts` | build/lint verdes; tipos novos sem `any`; README com as 4 operações, o parâmetro `{item}` percent-encoded, os shapes e as ADRs **0010 + 0011** (R-6a); (suítes consumidoras ficam vermelhas até T-05…T-13 — previsto na § Impacto) |
| T-05 | AC-01, AC-02, AC-03, AC-04, AC-08 (lado lista) | backend-dev | **Domínio — vencedor + agrupamento**: `aggregateLowestPrices` devolve o item com `market`/`purchaseDate`/`quantity`/`unit` da compra vencedora (cadeia `unitPrice` asc → `purchaseDate` desc → `id` asc, sem `createdAt`); novo `groupByMarket` (mercados **A→Z por nome normalizado**, itens A→Z, nenhum grupo vazio); helper de comparação de mercado (caixa/acentos ignorados, **desempate pelo texto cru** — decisão do usuário em 2026-10-19, Pergunta 2); spec da **invariante** `item.market === grupo.market` em cada linha (**R-6b**) e do `nameNormalized` de nome com `/` (`Leite/Açúcar` → `leite/açúcar`, barra preservada — **round-trip R-2**); barrel do domínio | `apps/price-history-service/src/domain/lowest-prices.ts`, `apps/price-history-service/src/domain/lowest-prices.spec.ts`, `apps/price-history-service/src/domain/market-order.ts` (novo), `apps/price-history-service/src/domain/market-order.spec.ts` (novo), `apps/price-history-service/src/domain/index.ts` | T-04 | `npx nx test price-history-service -- domain` | Specs: menor por unidade (sem média/último); empate → mais recente; empate de data → `id` estável entre ordens de entrada; mercados A→Z por normalização com desempate pelo texto cru (`Atacadão` antes de `Zaffari`); itens A→Z; nenhum grupo vazio; nome de exibição do vencedor; **invariante `item.market === grupo.market`** em todas as linhas (R-6b); `nameNormalized` de `Leite/Açúcar` preservado com a barra (round-trip R-2) |
| T-06 | AC-09 | backend-dev | **Domínio — busca sob o item evoluído**: `filterLowestPrices` mantém a regra (substring normalizada, busca vazia = lista completa) sobre o novo shape e **não** reordena; spec atualizada para o novo contrato | `apps/price-history-service/src/domain/lowest-price-search.ts`, `apps/price-history-service/src/domain/lowest-price-search.spec.ts` | T-04 | `npx nx test price-history-service -- domain` | Specs: `cafe` acha `café`; sem resultado → vazio; vazia/espaços → lista completa; ordem de entrada preservada (não toca `domain/index.ts`) |
| T-07 | AC-06, AC-07, AC-08 (lado item) | backend-dev | **Domínio — drill-down por item × mercado**: nova função (ex. `aggregateLowestPricesByItem(purchases, nameNormalized)`) → `{ name, nameNormalized, markets[] }` com vencedor por mercado (mesma cadeia), mercados **A→Z pela mesma normalização de T-05** (Pergunta 2), uma linha por mercado e nome canônico = item vencedor entre todos os mercados; lista vazia quando não há histórico do item | `apps/price-history-service/src/domain/lowest-price-by-item.ts` (novo), `apps/price-history-service/src/domain/lowest-price-by-item.spec.ts` (novo), `apps/price-history-service/src/domain/index.ts` | T-05 | `npx nx test price-history-service -- domain` | Specs: 3 mercados → 3 linhas A→Z (caixa/acentos ignorados, desempate pelo texto cru); duas compras no mesmo mercado → o menor daquele mercado com a data/quantidade dele; 1 mercado → 1 linha; item ausente → `markets: []` (404 é da borda) |
| T-08 | AC-06, AC-12 (leitura) | backend-dev | **Porta + adaptador + fake**: novo `findAllWithItemsByName(nameNormalized)` na porta (documentado: devolve as compras que contêm o item, **apenas** com os itens que casam, na ordem estável de `findAllWithItems`); implementação Drizzle com `inner join` + `where name_normalized = $1` (índice existente, **sem migration**); spec de integração do método; fake in-memory + fixtures atualizados | `apps/price-history-service/src/application/ports/purchase-repository.port.ts`, `apps/price-history-service/src/application/ports/index.ts`, `apps/price-history-service/src/infrastructure/persistence/drizzle/repository/purchase.repository.ts`, `apps/price-history-service/src/infrastructure/persistence/drizzle/repository/purchase.repository.spec.ts`, `apps/price-history-service/src/application/use-cases/testing/in-memory-purchase-repository.ts`, `apps/price-history-service/src/application/use-cases/testing/purchase-fixtures.ts` | T-03, T-04 | `npx nx test price-history-service -- repository`; `npx nx test price-history-service` (Docker up + migrate) | Spec de integração verde (só compras do item, só itens que casam, ordem estável); `git status` **sem** novos arquivos em `drizzle/migrations`; `db-ownership.spec.ts`/`app.module` seguem verdes |
| T-09 | AC-01…AC-09, AC-12 (casos de uso) | backend-dev | **Casos de uso**: `ListLowestPricesUseCase` passa a devolver `{ markets }` (filtro → agrupamento, nessa ordem); novo `GetLowestPricesByItemUseCase.execute(itemParam)` que **normaliza o parâmetro com `normalizeItemName`** antes de consultar a porta (**R-1**: paridade com a busca — `/lowest-prices/Caf%C3%A9` resolve `café`) → resposta do item ou `null`; barris de casos de uso/application; specs com repo fake | `apps/price-history-service/src/application/use-cases/list-lowest-prices.use-case.ts`, `apps/price-history-service/src/application/use-cases/list-lowest-prices.use-case.spec.ts`, `apps/price-history-service/src/application/use-cases/get-lowest-prices-by-item.use-case.ts` (novo), `apps/price-history-service/src/application/use-cases/get-lowest-prices-by-item.use-case.spec.ts` (novo), `apps/price-history-service/src/application/use-cases/index.ts`, `apps/price-history-service/src/application/index.ts` | T-05, T-06, T-07, T-08 | `npx nx test price-history-service -- use-cases` | Specs: lista agrupada com `q` filtrando sem perder o agrupamento; busca sem resultado → `markets: []`; drill-down **normaliza** o parâmetro (`Café`, `CAFÉ`, ` café ` → mesmo item — R-1) e devolve `null` só quando o item normalizado não tem histórico; o caso de uso não recalcula nada no cliente |
| T-10 | AC-05, AC-06, AC-12, AC-14, AC-15 (borda) | backend-dev | **Borda HTTP + wiring**: rota `GET lowest-prices/{item}` (param obrigatório, repassa o parâmetro cru — já percent-decoded pelo router — ao caso de uso, que normaliza; **nada** de normalizar no controller — **R-1**) com **404 canônico** (`Item não encontrado no histórico`) via `price-history-errors.ts`; rota `lowest-prices?q=` devolvendo o shape novo; provider do caso de uso novo no módulo; specs de controller atualizadas (200/404/401/500) | `apps/price-history-service/src/api/http/price-history/price-history.controller.ts`, `apps/price-history-service/src/api/http/price-history/price-history.controller.spec.ts`, `apps/price-history-service/src/api/http/price-history/price-history-errors.ts`, `apps/price-history-service/src/api/http/price-history/price-history.module.ts` | T-09 | `npx nx test price-history-service -- http`; `npx nx build price-history-service` | 200 nos dois shapes (agrupado e por mercado), `q` respeitado, 404 canônico PT para parâmetro que não resolve para nenhum item; `/lowest-prices/Caf%C3%A9` → 200 resolvendo `café` (R-1); `/lowest-prices/leite%2Fa%C3%A7%C3%BAcar` → 200 com o item `leite/açúcar` (round-trip R-2); invariante `items[].market === markets[].market` no corpo serializado (R-6b); 401 sem/with token inválido nas duas rotas, 500 canônico; build verde |
| T-11 | AC-01…AC-09, AC-12, AC-14, AC-15 (camada PWA) | angular-dev | **PWA — dados + store**: `getLowestPricesByItem(item)` no `PriceHistoryApiService`, codificando o segmento com **`encodeURIComponent`** (`café` → `caf%C3%A9`) — decisão do usuário em 2026-10-19 (Pergunta 1); store com a seção `itemLowestPrices` (`status` = `loading`/`loaded`/`notFound`/`error`, `data`, `error`, `selectedItem`, guarda de sequência, retry sem argumento repete a **mesma** consulta; **R-5**: `HttpErrorResponse.status === 404` → **`notFound`** e os demais erros → `error` com retry) e `lowestPrices` tipada com os **grupos** do serviço (sem agregação/ordenação no cliente), preservando busca + lista entre navegações (Pergunta 4); specs atualizados | `apps/web/src/app/core/price-history/price-history-api.service.ts`, `apps/web/src/app/core/price-history/price-history-api.service.spec.ts`, `apps/web/src/app/features/price-history/state/price-history-store.ts`, `apps/web/src/app/features/price-history/state/price-history-store.spec.ts`, `apps/web/src/app/features/price-history/data/index.ts` | T-04 | `npx nx test web`; `npx nx lint web` | Specs: URL `…/api/price-history/lowest-prices/caf%C3%A9` para o item `café` e `…/leite%2Fa%C3%A7%C3%BAcar` para `leite/açúcar` (round-trip R-2) + `Authorization` (base 3002); estados `loading/loaded/error`; **404 → `notFound`** e demais erros → `error` com retry (R-5, AC-12 ≠ AC-14); retry repete busca/item; store mantém `query` + lista ao entrar/sair da tela do item (Pergunta 4, AC-11); 401 → sessão; **nenhum** cálculo/ordenação de domínio no cliente |
| T-12 | AC-01, AC-02, AC-03, AC-08, AC-09, AC-10, AC-11, AC-13, AC-14, AC-16 | angular-dev | **PWA — lista agrupada**: cabeçalho de grupo por mercado A→Z, itens A→Z, linha com nome + menor preço + `mercado · data · quantidade com a unidade`, linha inteira como link para `/menor-preco/{nameNormalized}` com **`encodeURIComponent`** (≥44px), empty de lista ≠ empty de busca preservados, skeleton por `role=status` **só quando não há dados**; sincronizar o campo com `store.query` e **repetir a mesma consulta ao entrar** (CD-10 — decisão do usuário em 2026-10-19, Pergunta 4); helper de quantidade com unidade em `purchase-format.ts` | `apps/web/src/app/features/price-history/lowest-price-page.ts`, `apps/web/src/app/features/price-history/lowest-price-page.html`, `apps/web/src/app/features/price-history/lowest-price-page.scss`, `apps/web/src/app/features/price-history/lowest-price-page.spec.ts`, `apps/web/src/app/features/price-history/purchase-format.ts`, `apps/web/src/app/features/price-history/purchase-format.spec.ts` | T-11 | `npx nx test web` | Specs: agrupamento/ordem iguais à resposta (mercados A→Z por normalização); metadados na linha; link com `encodeURIComponent(nameNormalized)` (item `café` → `/menor-preco/caf%C3%A9`); nenhum cabeçalho vazio; empty de busca; skeleton só na primeira carga; entrada na tela repete a última busca (store) em vez de recarregar a lista completa; tokens/alvos/uma `primary` |
| T-13 | AC-05, AC-06, AC-07, AC-08, AC-11, AC-12, AC-13, AC-14, AC-16 | angular-dev | **PWA — tela do item + rota**: novo componente `lowest-price-by-market-page` (app bar com o nome do serviço, **voltar** com `aria-label` para `/menor-preco` em todos os estados, uma linha por mercado A→Z (mesma normalização/desempate de T-05), não encontrado com voltar (estado `notFound` do store — **R-5**), skeleton/erro+retry) e rota lazy `/menor-preco/:item` sob `authGuard`, lendo o parâmetro **já decodificado pelo router** e repassando-o cru ao store (o percent-encoding é definido na borda de dados — Pergunta 1), preservando busca/lista na entrada pela nav (Pergunta 4); specs de rota/componente; conferir o smoke de tokens | `apps/web/src/app/features/price-history/lowest-price-by-market-page.ts` (novo), `.../lowest-price-by-market-page.html` (novo), `.../lowest-price-by-market-page.scss` (novo), `.../lowest-price-by-market-page.spec.ts` (novo), `apps/web/src/app/app.routes.ts`, `apps/web/src/app/app.routes.spec.ts`, `apps/web/src/app/design-tokens.smoke.spec.ts` | T-11, T-12 | `npx nx test web`; `npx nx build web` | Rota resolve a tela real (lazy, sob shell+authGuard), `/menor-preco/caf%C3%A9` resolve o item `café` (decodificação do router) e `/menor-preco/leite%2Fa%C3%A7%C3%BAcar` resolve `leite/açúcar` (round-trip R-2), e `/menor-preco` continua intacta; specs dos 4 estados + não encontrado (vindo do estado `notFound` do store, R-5) + voltar; entrada pela nav repete a última busca em vez de recarregar a lista completa (Pergunta 4); chunk lazy no build; aba **Menor preço** ativa na rota nova; smoke de tokens verde e não-vácuo |
| T-14 | AC-01…AC-09, AC-12, AC-14, AC-15 (backend) | test-engineer | **Auditoria backend**: mapa `AC → teste` do serviço + contratos; fechar lacunas (shape agrupado, drill-down por mercado, 404, `q` com agrupamento, determinismo do desempate) e confirmar que a suíte está verde por completo após a evolução do contrato | `apps/price-history-service/**`, `libs/contracts/**` (+ `apps/shopping-list-service/**` apenas se houver regressão) | T-10 | `npm run docker:up`; `npx nx run price-history-service:db:migrate`; `npx nx test price-history-service`; `npx nx test shopping-list-service`; `npx nx build contracts` | Suítes verdes + mapa `AC → teste` no handoff; nenhuma lacuna aberta; qualquer falha é resolvida **antes** de avançar (regra do `AGENTS.md`) |
| T-15 | AC-01…AC-16 (camada unit PWA) | test-engineer | **Auditoria unitária PWA**: mapa `AC → teste` das telas/store/serviço/rotas; completar lacunas (agrupamento visual, CD-08/CD-09/CD-10, não encontrado, 401) e provar por falsificação que os testes pegam regressão | `apps/web/**` | T-13 | `npx nx test web`; `npx nx lint web`; `npx nx build web` | Suíte verde + mapa `AC → teste`; pelo menos uma falsificação registrada (ex.: remover o agrupamento ou o `where` do parâmetro derruba spec) e revertida |
| T-16 | Todos os ACs da matriz AC ↔ E2E | test-engineer | **E2E Playwright (gate ADR 0008)**: atualizar o fake + fixtures para os dois shapes novos e a rota do item; atualizar `lowest-price.spec.ts` (agrupamento, metadados, empate, busca, empty, skeleton, erro+retry, entrada pela aba repetindo a última busca — Pergunta 4) e criar `lowest-price-by-market.spec.ts` (navegação pelo toque com URL percent-encoded `/menor-preco/caf%C3%A9`, linhas por mercado A→Z, menor no mesmo mercado, 1 mercado, voltar preservando a busca, entrada pela nav preservando a busca, item com `/` no nome navegado por `/menor-preco/leite%2Fa%C3%A7%C3%BAcar` (round-trip R-2), item inexistente mostrando **não encontrado** (e não erro+retry — R-5), 401); afirmar base `http://localhost:3002/api/price-history/lowest-prices/{item}` (segmento percent-encoded) + `Authorization`; manter **hermético** | `apps/web-e2e/**` | T-13, T-15 | `npx nx e2e web-e2e --skip-nx-cache`; filtro `npx nx e2e web-e2e --skip-nx-cache -- --grep "[Mm]enor preço"` | **Suíte verde** (registrando comando + resultado no handoff) e matriz coberta; URLs das chamadas com o item percent-encoded; **round-trip do nome com `/` provado de ponta a ponta** (R-2 — o resultado decide a retirada da limitação da § Riscos, registrado no handoff); 404 mostra não encontrado em vez de erro+retry (R-5); busca preservada na volta e na entrada pela nav; nenhuma jornada da v1 (auth, lista, histórico, checkout) quebrada |
| T-17 | — (docs/lição; trabalho técnico justificado) | test-engineer | **Lição transferível**: registrar os aprendizados desta rodada (evolução de contrato compartilhado quebrando consumidores + E2E hermético em série; higiene de specs de integração que escrevem em banco de dev — o `update` sem `where` e a limpeza determinística, **incluindo o follow-up do banco de teste dedicado (R-4)**; agrupamento como responsabilidade do serviço; **ponto de commit da janela de suíte vermelha (R-3)**) | `docs/lessons/2026-10-19-menor-preco-por-mercado.md` | T-16 | revisão de doc: `git diff docs/lessons` | Lição curta (2–3 tópicos), com o que foi aprendido, o gatilho e onde o guard ficou (teste/regra), sem repetir o conteúdo do PLAN/SPEC; follow-up do **banco de teste dedicado** registrado como pendência de ambiente (R-4) |

> Tabela de tarefas: T-01…T-17. Cada `T-*` roda em **uma** chamada de agente e
> tem comando de teste próprio; após `concluída` com testes verdes, o
> orquestrador **comita** antes da próxima T (skill `git-workflow`).

## Impacto nos testes existentes (não deve haver surpresa no gate)

| Suíte/spec que pode quebrar | Por quê | Quem atualiza |
| --- | --- | --- |
| `apps/price-history-service/src/domain/lowest-prices.spec.ts` (L51, L68, L89, L105–109, L128) | assume `LowestPriceItem` sem mercado/data/quantidade e o desempate por `createdAt`; a saída passa a ser agrupada e o desempate final é o `id` | **T-05** |
| `apps/price-history-service/src/domain/lowest-price-search.spec.ts` (L5–9) | fixtures de item no shape antigo | **T-06** |
| `apps/price-history-service/src/application/use-cases/list-lowest-prices.use-case.spec.ts` (L31–42) | espera `{ items }` ordenado por nome | **T-09** |
| `apps/price-history-service/src/application/use-cases/testing/in-memory-purchase-repository.ts` (+ fixtures) | precisa implementar o método novo da porta | **T-08** |
| `apps/price-history-service/src/api/http/price-history/price-history.controller.spec.ts` (L297–350) | asserts de `items`/shape antigo | **T-10** |
| `apps/price-history-service/src/infrastructure/persistence/drizzle/repository/purchase.repository.spec.ts` (L216–224) | resíduo no banco de dev na v1 + método novo da porta | **T-03** (higiene) e **T-08** (método novo) |
| `apps/web/src/app/core/price-history/price-history-api.service.spec.ts` | URL/shape da consulta de menores preços; endpoint novo do item | **T-11** |
| `apps/web/src/app/features/price-history/state/price-history-store.spec.ts` (L198–270) | `LowestPricesResponse.items` na fixture e no consumo | **T-11** |
| `apps/web/src/app/features/price-history/lowest-price-page.spec.ts` (L14–18, L133–134, L207) | helper `item()` no shape antigo; lista passa a ser agrupada e a linha vira link | **T-12** |
| `apps/web/src/app/features/price-history/purchase-format.spec.ts` | helper novo de quantidade com unidade | **T-12** |
| `apps/web/src/app/app.routes.spec.ts` | rota nova `/menor-preco/:item` | **T-13** |
| `apps/web/src/app/design-tokens.smoke.spec.ts` (L15, L41–45) | varre a pasta `features/price-history` e exige contagem não-vácua — a tela nova entra na varredura | **T-13** |
| `apps/web-e2e/src/support/price-history-fake-api.ts` (L54, L237–262), `support/price-history-fixtures.ts` (L48–51, L92–94) | fake serve o contrato antigo (`items`) e só 3 caminhos | **T-16** |
| `apps/web-e2e/src/price-history/lowest-price.spec.ts` | assere `.prices__name`/`.prices__value` planos e a busca | **T-16** |
| `apps/web-e2e/src/price-history/nav.spec.ts` (assinatura de AC-21/ADR 0010) | segue válido; revisar se a asserção passa a citar a operação nova (ADR 0011) | **T-16** |

Nenhuma mudança atinge `apps/shopping-list-service`; sua suíte é rodada em
**T-14** apenas como regressão.

### Composição dos commits e janela vermelha (R-3 do parecer)

A evolução do contrato compartilhado deixa consumidores vermelhos entre **T-04** e
**T-09/T-10/T-11/T-12**. Para não violar a regra "nunca avançar com falha de
teste" (`AGENTS.md`, `sdd-workflow` §3), o plano **define os pontos de commit** —
o orquestrador segue esta tabela; nada fica implícito.

| Ponto de commit | Tarefas que compõem o commit | Verdes ao fechar | Ainda vermelhas **por design** (dona) |
| --- | --- | --- | --- |
| **PC-0** (docs, na branch da feature) | T-01, T-02 (podem ser 2 commits: `docs(adr)` e `docs(plan)`) | revisão de docs (nenhuma suíte afetada) | — |
| **PC-1** | T-03 (sozinha) | `npx nx test price-history-service -- repository` + banco limpo | — |
| **PC-2** | **T-04 + T-05 + T-06 (commit conjunto)** | `npx nx build contracts`, `npx nx lint contracts`, `npx nx test price-history-service -- domain` | `-- use-cases` (T-09), `-- http` (T-10), `apps/web` (T-11/T-12/T-13), `web-e2e` (T-16) |
| **PC-3** | T-07 + T-08 | `-- domain`, `-- repository` | idem PC-2 |
| **PC-4** | T-09 + T-10 | **`price-history-service` inteira verde** | `apps/web` (T-11/T-12/T-13), `web-e2e` (T-16) |
| **PC-5** | T-11 + T-12 + T-13 | `npx nx test web`, `npx nx lint web`, `npx nx build web` | `web-e2e` (T-16) |
| **PC-6** | T-14 + T-15 | serviço + contratos + `web` + `shopping-list-service` (regressão) | `web-e2e` (T-16) |
| **PC-7** | T-16 | **E2E Playwright verde** (gate de UI, ADR 0008) | — |
| **PC-8** | T-17 (lição) | revisão de docs | — |

- **T-04 não é commitada sozinha** (decisão do plano para o R-3): suas mudanças
  ficam no *working tree* até T-05 e T-06 fecharem, e as três entram no **PC-2**.
  Alternativa admitida pelo parecer (commit de T-04 separado): só é aceitável se o
  **handoff do commit** declarar, em texto, a dependência "shape novo aguardando
  T-05/T-06/T-09/T-10/T-11/T-12" **e** a lista das suítes vermelhas com a T dona.
- **Todo handoff de commit registra:** (a) comando executado + resultado; (b) a
  lista das suítes ainda vermelhas **por design**, com a T dona de cada uma;
  (c) confirmação de que **nenhuma** falha pertence a tarefa já concluída.
- **Nenhum gate de fase roda dentro da janela** (PC-2…PC-4): sem
  `feature-validator`, sem PR e sem validação final enquanto houver suíte vermelha
  listada acima; a suíte completa verde é exigida em T-14/T-15 e o gate de UI em
  T-16.

## Ordem e paralelismo (para o orquestrador)

Máximo de **duas** tarefas simultâneas, arquivos disjuntos, sem dependências
cruzadas. Provas de independência entre parênteses.

- **Onda 0 — plano/docs (antes do código):** **T-01** (ADR 0011, só `docs/decisions`)
  → **T-02** (revisão arquitetural, só `docs/features/lowest-price-by-market`).
  **Estado em 2026-10-19:** T-02 **concluída** — parecer **Aprovada com ressalvas,
  nenhuma bloqueante** (`ARCHITECTURE-REVIEW.md`), ressalvas R-1…R-6 incorporadas
  na **revisão 3** deste plano. Falta apenas a **frase canônica** do usuário; o
  commit dos dois artefatos de docs é o **PC-0**.
- **Onda 1:** **T-03** ∥ **T-04** — T-03 só toca
  `infrastructure/…/purchase.repository.spec.ts`; T-04 só toca
  `libs/contracts/**`. Sem dependência entre elas e sem interseção de arquivos.
- **Onda 2:** **T-05** ∥ **T-06** — ambas dependem de T-04; `lowest-prices.ts` +
  `market-order.ts` (T-05) × `lowest-price-search.ts` (T-06) são disjuntos;
  **T-06 não toca `domain/index.ts`** (barrel fica com T-05).
- **Onda 3:** **T-07** ∥ **T-08** — T-07 só domínio (`lowest-price-by-item.ts` +
  spec + barrel); T-08 só porta/adaptador/spec de repositório/fake. Arquivos
  disjuntos; T-08 depende de T-03 (mesmo arquivo de spec) já concluída.
- **Onda 4:** **T-09** — sozinha (consome T-05…T-08; arquivos de
  `application/use-cases/**`).
- **Onda 5:** **T-10** ∥ **T-11** — backend (`api/http/price-history/**`) × PWA
  (`apps/web/**`): disjuntos, sem dependência cruzada (T-10 dep T-09; T-11 dep
  T-04).
- **Onda 6:** **T-12** — sozinha (pasta `features/price-history/**` da PWA).
- **Onda 7:** **T-13** — sozinha (pasta da feature + `app.routes.ts`; reusa o
  helper de formatação criado em T-12).
- **Onda 8:** **T-14** ∥ **T-15** — backend × PWA, arquivos disjuntos; ambas
  dependem de T-10/T-13 concluídas.
- **Onda 9:** **T-16** — sozinha (E2E Playwright; gate de UI do ADR 0008).
- **Onda 10:** **T-17** — sozinha (lição, depois da corrida E2E).

> **Nota T-12/T-13:** por padrão **sequenciais** (mesma pasta
> `apps/web/src/app/features/price-history/**` e helper compartilhado em
> `purchase-format.ts`). Só paralelizar se o implementador comprovar arquivos
> disjuntos no handoff.

O orquestrador comita por **ponto de commit** (§ Composição dos commits e janela
vermelha — R-3), em Conventional Commits citando os `T-XX` de cada ponto, sempre
**antes** de abrir a onda seguinte. **Antes da implementação:** frase canônica no
plano (parecer T-02 já sem ressalva bloqueante) → branch
`feature/lowest-price-by-market` a partir da `master`, commit de docs PC-0
(T-01/T-02) e delegação de T-03/T-04.

## Checklists (DoR/DoD)

### Definition of Ready do plano

- [x] `SPEC.md` aprovada com a frase canônica
      (`Aprovado pelo usuário em 2026-10-19`) e refletida no `STATUS.md`.
- [x] Todos os `AC-*` (16) estão estáveis e mapeados na matriz AC ↔ E2E.
- [x] Escopo de produto (`initial-scope.md`) já atualizado — pré-condição
      concluída, sem tarefa.
- [x] Contratos atuais e ADRs aplicáveis (0001, 0006, 0007, 0008, 0010) lidos e
      citados.

### Definition of Done do plano (gate)

- [ ] Tarefas `T-*` mapeiam ACs, agente, arquivos, dependências, testes e
      evidência (feito aqui; conferir no parecer T-02).
- [ ] Tarefas pequenas, uma por agente, cada uma com comando de teste
      executável (feito aqui).
- [ ] `Superfície de UI: sim` declarada com justificativa (feito aqui).
- [ ] Matriz `AC ↔ E2E` completa + tarefa Playwright com
      `npx nx e2e web-e2e` (**T-16**) — feito aqui.
- [ ] Contratos, ownership, riscos e trade-offs definidos (feito aqui).
- [x] Perguntas abertas respondidas pelo usuário em **2026-10-19** (4/4 na
      recomendação do plano) — registradas na § Perguntas abertas resolvidas,
      com as tarefas afetadas; nenhuma decisão bloqueante aberta.
- [x] **Revisão arquitetural** concluída em **2026-10-19** — `ARCHITECTURE-REVIEW.md`
      **Aprovada com ressalvas**, **nenhuma bloqueante** (**T-02**).
- [x] Ressalvas do parecer **R-1…R-6 incorporadas** nesta revisão 3 (§ Parecer
      arquitetural e ressalvas incorporadas), com tarefa dona e evidência em cada
      uma.
- [x] Artefato contém a frase canônica no bloco do § Gate do plano —
      **aprovada pelo usuário em 2026-10-19**.

### Definition of Ready da implementação

- [ ] Plano aprovado com a frase canônica no `PLAN.md` e refletida no `STATUS.md`.
- [ ] Branch `feature/lowest-price-by-market` criada a partir da `master`.
- [ ] Docker (Postgres 5432) no ar e `db:migrate` executado para as T de
      integração (T-03, T-08, T-14).

### Definition of Done da implementação

- [ ] Todas as T concluídas (ou reabertas tratadas), com commit por T.
- [ ] Contratos e ADR 0011 versionados; `libs/contracts/README.md` atualizado.
- [ ] Suítes verdes: `price-history-service`, `shopping-list-service`
      (regressão), `web` e **E2E Playwright** com **comando + resultado**
      registrados no handoff (ADR 0008) — nenhuma falha em aberto.
- [ ] Matriz AC ↔ E2E coberta; checklist de design do `GUIA-DESIGN` §4 preenchido
      na validação (2 telas, 4 estados, tokens, ≥44px, 360px/desktop, claro/escuro).
- [ ] Lição registrada (T-17) e nenhuma pendência de comportamento/contrato/
      arquitetura.

## Decisões

- **ADR 0011 (nova)** — operação `GET /api/price-history/lowest-prices/{item}`
  no escopo da exceção temporária ao gateway (mesma base/CORS da ADR 0010,
  mesmos critérios de saída) + ponte na ADR 0010 §1. Criada em **T-01** —
  **decidido pelo usuário em 2026-10-19** (Pergunta 3), mantendo a ADR 0010
  ("Aceita") estável.
- **Contrato agrupado:** `LowestPricesResponse { markets: [{ market, items[] }] }`
  — o agrupamento (CD-04/CD-09) e a ordenação (RN-05) chegam prontos do serviço
  (RN-12); a PWA só renderiza.
- **Linha de menor preço** passa a carregar `market`, `purchaseDate`, `quantity`
  e `unit` (CD-08); preço sempre **por unidade** (RN-02).
- **Parâmetro `:item`:** `GET /lowest-prices/{item}` com `{item}` = `nameNormalized`
  literal percent-encoded (`encodeURIComponent`) — **decidido pelo usuário em
  2026-10-19** (Pergunta 1, CD-07/RN-09; ex.: `/menor-preco/batata`,
  `/menor-preco/caf%C3%A9`); 404 canônico PT quando não resolve para nenhum
  item (RN-08/AC-12); nome de exibição canônico vem na resposta. A hipótese de
  limitação para nome com `/` está em § Riscos como **hipótese a refutar por
  teste** (R-2 do parecer).
- **Normalização do `{item}` no caso de uso (R-1 do parecer):**
  `GetLowestPricesByItemUseCase` aplica `normalizeItemName` ao parâmetro (mesma
  regra da busca — `domain/lowest-price-search.ts`); a borda só recebe o segmento
  já decodificado pelo router e **não** normaliza. Prova: `/lowest-prices/Caf%C3%A9`
  resolve `café` (T-09/T-10).
- **Ponto de commit (R-3 do parecer):** **T-04 não é commitada sozinha** — entra
  no **PC-2** junto de T-05/T-06 (primeiros consumidores verdes); nenhum gate de
  fase roda dentro da janela vermelha (§ Composição dos commits e janela
  vermelha).
- **Store: 404 ≠ erro (R-5 do parecer):** a seção `itemLowestPrices` mapeia
  `status === 404` para **`notFound`** (AC-12) e os demais erros para `error` +
  retry (AC-14); o estado derivado fica no store, não na tela.
- **Desempate:** `unitPrice` asc → `purchaseDate` desc → `id` da compra asc
  (o `createdAt` sai da cadeia — CD-03/RN-04).
- **Ordenação de mercado (decidida em 2026-10-19):** A→Z pela
  normalização de nomes (caixa e acentos ignorados), desempate pelo **texto
  cru** (Pergunta 2).
- **Sem migration/índice novo:** a porta ganha `findAllWithItemsByName` sobre o
  índice existente `purchase_items_name_normalized_idx`.
- **CD-10 no store:** estado de sessão preservado (busca + lista) e skeleton só
  quando não há dados — **decidido pelo usuário em 2026-10-19** (Pergunta 4): a
  entrada pela bottom nav repete a última consulta em vez de recarregar a lista
  completa.
- **Rework de higiene (T-03):** truncamento por caso + `where` escopado; prova
  `count(*) = 0` no banco de dev ao fim da suíte.
- **E2E hermético** (ADR 0008), fake tipado por `@lista/contracts`, com prova de
  base `http://localhost:3002` + `Authorization` na operação nova.

## Perguntas abertas — resolvidas em 2026-10-19

As 4 perguntas foram **respondidas pelo usuário em 2026-10-19**, todas na
recomendação do plano. **Não há pergunta aberta nem decisão bloqueante** para o
parecer arquitetural (T-02). Rastreabilidade: pergunta → resposta do usuário →
efeito no plano/tarefas.

1. **Forma do `:item` na rota** — **Resposta:** **nome normalizado direto**,
   `nameNormalized` literal **percent-encoded** (`encodeURIComponent`), sem slug
   com hífens (`/menor-preco/batata`, `/menor-preco/caf%C3%A9`). **Efeito:** T-04
   (comentário do tipo + README), T-11 (`encodeURIComponent` no serviço de dados,
   spec com `caf%C3%A9`), T-12 (link com `encodeURIComponent(nameNormalized)`),
   T-13 (`:item` chega decodificado pelo router e é repassado cru ao store),
   T-16 (E2E assere a URL `/menor-preco/caf%C3%A9`). **Limitação aceita e
   documentada:** item com `/` no nome não é representável no caminho (risco
   registrado em § Riscos, com mitigação futura fora desta feature) —
   **não bloqueante, sem mudança de escopo**.
2. **Ordenação A→Z de mercado** — **Resposta:** por **nome normalizado**
   (caixa/acentos ignorados), **desempate pelo texto cru**. **Efeito:** T-05
   (comparador `market-order.ts` + spec `Atacadão` antes de `Zaffari`), T-07
   (mesma ordenação no drill-down), expectativa de ordem em T-12/T-16.
3. **ADR 0011 nova × extensão da ADR 0010** — **Resposta:** **ADR 0011 nova** +
   **ponte na ADR 0010 §1**. **Efeito:** T-01 como estava (2 arquivos de ADR);
   T-02 revisa o PLAN + a ADR 0011.
4. **Entrada na tela Menor preço vinda da bottom nav** — **Resposta:**
   **preservar busca e lista** do store e **repetir a última consulta** (sem
   recarregar a lista completa da v1). **Efeito:** T-11 (store mantém `query` +
   `status/data`; retry repete a mesma consulta), T-12 (tela sincroniza o campo
   com `store.query` e repete a consulta; skeleton só sem dados), T-13 (entrada
   pela rota nova não descarta a busca), T-16 (jornada de nav preservando a
   busca).

> **Nota condicional (R-2 do parecer):** a limitação do nome com `/` é uma
> **hipótese a refutar**, não uma decisão. Se os testes de round-trip (T-05, T-10,
> T-11, T-13, T-16) passarem, o texto desta seção é ajustado no fechamento da
> feature (a limitação sai e fica só a nota "coberto por teste"); se algum falhar,
> permanece como risco com a mitigação futura já descrita em § Riscos —
> identificador opaco (`/menor-preco/:id`) ou segmento base64url, em feature
> própria com ADR.

## Gate do plano

- [x] Todas as tarefas referenciam ao menos um `AC-*` ou justificam trabalho
      técnico (T-01, T-02, T-03, T-17).
- [x] Tarefas preferem escopo pequeno e cada uma declara comando de teste.
- [x] `Superfície de UI: sim` declarada com justificativa (ADR 0008).
- [x] Matriz AC ↔ E2E completa (16/16 ACs) e tarefa Playwright **T-16** com
      `npx nx e2e web-e2e` (ou filtro).
- [x] Dependências, arquivos permitidos, testes e evidências explícitos;
      ordem/paralelismo (máx. 2) com prova de independência.
- [x] Contratos e ownership definidos (HTTP + contrato compartilhado; evento e
      bancos inalterados).
- [x] **Revisão arquitetural** (T-02) concluída em **2026-10-19** — parecer
      `ARCHITECTURE-REVIEW.md` **Aprovada com ressalvas**, **nenhuma bloqueante**.
- [x] Ressalvas **R-1…R-6 incorporadas** nesta revisão 3 (§ Parecer arquitetural e
      ressalvas incorporadas) — nenhuma delas exigiu decisão nova do usuário; os
      pontos dependentes de teste estão declarados no texto (R-2, R-3).
- [x] Perguntas abertas respondidas pelo usuário em **2026-10-19** (4/4 na
      recomendação do plano — ids 1–4 acima), sem pergunta aberta remanescente.
- [x] Artefato contém a frase canônica no bloco de código abaixo —
      **aprovada pelo usuário em 2026-10-19**.

```text
Aprovado pelo usuário em 2026-10-19
```

> **Aprovação:** o bloco acima é a **frase canônica** exigida pelo
> `docs/process/sdd-workflow.md`; o usuário aprovou o plano em **2026-10-19** (via
> orquestrador). O parecer arquitetural (**T-02**) saiu em **2026-10-19**
> (`ARCHITECTURE-REVIEW.md`, aprovada com ressalvas, nenhuma bloqueante) e as
> ressalvas **R-1…R-6** estão incorporadas nesta revisão 3. **Gate do plano
> fechado** — a implementação segue pela skill `git-workflow` (branch
> `feature/lowest-price-by-market`, commit de docs PC-0).

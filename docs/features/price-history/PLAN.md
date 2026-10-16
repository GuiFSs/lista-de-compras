# Plano técnico — Histórico de preços

**Status:** Aprovado
**Spec:** `docs/features/price-history/SPEC.md`
**Última atualização:** 2026-10-16
**Aprovação do usuário:** Aprovado pelo usuário em 2026-10-16

## Contexto

A feature **Histórico de preços** (spec aprovada pelo usuário em 2026-10-16 —
`docs/features/price-history/SPEC.md`, 21 ACs, 16 RNs, CD-01…CD-07, nenhuma
decisão aberta) entrega a rodada **completa (A)**: evolução do checkout da lista
(mercado + data), publicação do evento de conclusão com **outbox + retry**,
novo **`price-history-service`** (dono exclusivo do banco `price_history`), e as
telas PWA **Histórico** e **Menor preço** com bottom nav navegável.

Substitui o comportamento provisório de `shopping-list` em que concluir **não**
pedia mercado/data nem publicava evento (RN-16/AC-21 daquela feature).

**Estado do código inspecionado nesta fase (não inventado):**
- `apps/price-history-service` **não existe** — banco lógico `price_history` e
  senha `PRICE_HISTORY_DB_PASSWORD` já provisionados no Docker
  (`docker/postgres/init`, ADR 0004); `.env.example` comenta
  `PRICE_HISTORY_DATABASE_URL`.
- `apps/shopping-list-service` tem checkout sem corpo
  (`POST /api/shopping-list/checkout`), remove só comprados, **sem** evento;
  `src/infrastructure/messaging/` é esqueleto; JWT global (ADR 0007) e CORS
  (ADR 0009) já existem; porta `API_PORT=3000`.
- `apps/auth-service` espelha scaffold Nest/Fastify/hexagonal + Drizzle +
  targets `db:*` (porta `AUTH_API_PORT=3001`) — referência para o serviço novo.
- RabbitMQ já no compose (`5672` / management `15672`); `RABBITMQ_URL` no
  `.env.example`.
- `libs/contracts`: HTTP de auth e shopping-list; `src/events/index.ts` vazio
  (`export {}`).
- PWA: bottom nav com Histórico/Menor preço **desabilitados** (“em breve”);
  checkout sheet sem mercado/data; interceptor JWT já anexa `Authorization` em
  URLs `localhost`.
- `apps/web-e2e`: Playwright hermético (contrato interceptado) + jornadas da
  lista; padrão a reutilizar.

## Superfície de UI

- **Superfície de UI:** **sim**
- **Justificativa:** altera `apps/web` (bottom nav, rotas Histórico / Menor
  preço / detalhe, evolução do checkout sheet) e a maioria dos ACs é observável
  em tela (AC-01…AC-15, AC-19, AC-20; AC-21 observável como base URL). Pela
  ADR 0008: matriz AC ↔ E2E + ≥1 tarefa Playwright — ambas neste plano (T-22 e
  matriz abaixo). ACs só-backend (AC-16, AC-17 e parte de AC-18) têm evidência
  unit/integração.

## Abordagem

1. **Decisão de acesso (ADR 0010).** PWA → `price-history-service` em
   `http://localhost:3002` (exceção temporária à ADR 0001 / CD-04), com CORS
   `PRICE_HISTORY_CORS_ORIGINS`, critérios de saída e dono da migração. ADR
   criada nesta fase (`docs/decisions/0010-…`); T-01 confere consistência e
   anota a ADR 0006 §1.
2. **Contratos primeiro.** DTOs HTTP do histórico + evolução do checkout +
   envelope do evento em `libs/contracts` (fonte única serviço ↔ PWA ↔
   consumidor).
3. **Novo serviço hexagonal** `apps/price-history-service` (Nest + Fastify,
   Drizzle, Postgres próprio, JWT local ADR 0007, prefixo `PRICE_HISTORY_*`).
4. **Mensageria.** Produtor no shopping-list: **outbox + publisher com retry**
   (CD-06). Consumidor no price-history: **idempotente** por `completionId`
   (RN-11/AC-16). Conclusão da lista **não** depende do broker.
5. **Checkout.** `POST /checkout` passa a exigir `market` + `purchaseDate`
   (`YYYY-MM-DD`) quando há ≥1 comprado; rejeita data futura e mercado vazio;
   sem comprados: sem corpo, sem evento (RN-09).
6. **PWA.** Ativar rotas Histórico / Menor preço / detalhe; wire do checkout;
   camada de dados tipada apontando para `localhost:3002` (ADR 0010).
7. **Revisão arquitetural** já concluída (`ARCHITECTURE-REVIEW.md` —
   **Aprovada com ressalvas**, 2026-10-16); ressalvas incorporadas neste plano
   (outbox na mesma transação; nack/requeue; ordem best-effort).
8. **Testes.** Unit/integração nos dois serviços (Postgres + RabbitMQ local
   onde couber); E2E hermético Playwright para jornadas de UI.

## Domínio e casos de uso

### shopping-list-service (evolução)

- **Checkout com comprados (RN-03, RN-04, CD-07):** exige `market` (trim, não
  vazio) e `purchaseDate` (`YYYY-MM-DD`, ≤ data de calendário “hoje” no
  servidor em UTC como defesa; PWA valida no calendário local). Data futura →
  400; mercado inválido → 400. Gera `completionId` (UUID), remove comprados
  (`DELETE`) e **grava o outbox na mesma transação Postgres** — sem exceção —
  e responde 200 com a lista restante — **mesmo se o broker estiver fora**.
- **Checkout sem comprados (RN-09):** sem exigir mercado/data; não grava
  outbox; lista inalterada.
- **Normalização de nomes:** inalterada na lista ativa; o **evento** leva o
  `name` como digitado (trim); o consumidor normaliza para agregação.

### price-history-service (novo)

- **Ingestão (RN-02, RN-05, RN-11):** a partir do evento, persiste uma compra
  (`completionId`, mercado, data, itens). **Ack só após ingest bem-sucedida**;
  falha transitória → **nack/requeue** (a idempotência por `completionId`
  cobre a reentrega). Reentrega do mesmo `completionId` → **no máximo um**
  registro (unique + ignore/early-return). DLQ opcional fora da v1.
- **Menor preço (RN-06, RN-07, CD-05):** agrupa por `name_normalized` (mesma
  regra da lista: trim → NFKD → remove diacríticos → lower). Menor
  `unit_price` do grupo. Nome de exibição = nome do item que ostenta o menor
  preço (empate: o da compra mais recente).
- **Busca:** filtra grupos cujo nome normalizado **contém** o termo normalizado
  da query (substring).
- **Histórico (RN-08):** lista compras por `purchase_date` desc, empate por
  `created_at` desc; detalhe traz itens daquela conclusão.

## Contratos

### HTTP — shopping-list-service (evolução)

| Operação | Rota | Request | Sucesso | Erros de negócio |
| --- | --- | --- | --- | --- |
| Concluir (com ≥1 comprado) | `POST /api/shopping-list/checkout` | `CheckoutShoppingListRequest` `{ market, purchaseDate }` | **200** `ShoppingListResponse` | **400** mercado vazio / data ausente ou futura / data inválida; 401; 500 |
| Concluir (0 comprados) | `POST /api/shopping-list/checkout` | corpo omitido ou `{}` | **200** `ShoppingListResponse` (inalterada) | 401; 500 |

Demais rotas da lista **inalteradas**. Envelope de erro canônico
`{ statusCode, message }` (PT). Mensagens: `"Mercado é obrigatório"`,
`"Data da compra é obrigatória"`, `"Data da compra não pode ser futura"`,
`"Data da compra inválida"`.

Tipos novos/alterados em `libs/contracts/src/http/shopping-list.ts`:

```ts
/** Corpo do checkout quando há ≥1 item comprado. */
export interface CheckoutShoppingListRequest {
  market: string;       // trim; rejeitar vazio/só espaços
  purchaseDate: string; // YYYY-MM-DD; ≤ hoje (calendário)
}
```

### HTTP — price-history-service (novo)

Prefixo global `api`, porta `PRICE_HISTORY_API_PORT=3002`, base PWA
`http://localhost:3002` (ADR 0010). **Todas** as rotas exigem JWT (guard global,
ADR 0007) — 401 uniforme `{ statusCode: 401, message: "Não autorizado" }`.

| Operação | Rota | Request | Sucesso | Erros |
| --- | --- | --- | --- | --- |
| Listar compras | `GET /api/price-history/purchases` | — | **200** `PurchaseListResponse` | 401, 500 |
| Detalhe | `GET /api/price-history/purchases/{id}` | — | **200** `PurchaseDetailResponse` | **404**, 401, 500 |
| Menores preços | `GET /api/price-history/lowest-prices` | query opcional `q` | **200** `LowestPricesResponse` | 401, 500 |

Tipos em `libs/contracts/src/http/price-history.ts`:

```ts
export interface PurchaseListItem {
  id: string;            // = completionId
  market: string;
  purchaseDate: string;  // YYYY-MM-DD
  itemCount: number;
  createdAt: string;     // ISO-8601
}

export interface PurchaseListResponse {
  purchases: PurchaseListItem[]; // mais recente primeiro
}

export interface PurchaseItem {
  name: string;
  quantity: number;
  unit: ItemUnit;
  unitPrice: number;     // R$
}

export interface PurchaseDetailResponse {
  id: string;
  market: string;
  purchaseDate: string;
  items: PurchaseItem[];
  createdAt: string;
}

export interface LowestPriceItem {
  name: string;          // exibição (ver domínio)
  nameNormalized: string;
  lowestUnitPrice: number;
}

export interface LowestPricesResponse {
  items: LowestPriceItem[]; // ordenação estável por nameNormalized asc
}
```

**CORS (ADR 0010):** `@fastify/cors` com `PRICE_HISTORY_CORS_ORIGINS` (default
`http://localhost:4200`), `methods: ['GET','OPTIONS']`,
`allowedHeaders: ['Content-Type','Authorization']`.

### Eventos

| Campo | Valor |
| --- | --- |
| **Nome / tipo** | `shopping-list.purchase-completed` |
| **Versão** | `1` (`eventVersion: 1`) |
| **Produtor** | `shopping-list-service` (outbox → RabbitMQ) |
| **Consumidor** | `price-history-service` |
| **Broker** | RabbitMQ (`RABBITMQ_URL`) |
| **Exchange** | `domain.events` (tipo **topic**, durable) |
| **Routing key** | `shopping-list.purchase-completed.v1` |
| **Fila** | `price-history.shopping-list.purchase-completed` (durable; bind na routing key) |
| **Entrega** | at-least-once via outbox + retry no produtor; ack só após ingest bem-sucedida; falha transitória → nack/requeue |
| **Ordem** | best-effort (fila single-active / FIFO); ordenação de produto por `purchase_date` (+ `created_at` de ingestão) |
| **Idempotência** | chave de negócio `payload.completionId` (UUID gerado no checkout); unique no banco do histórico |

Envelope em `libs/contracts/src/events/shopping-list.ts`:

```ts
export const PURCHASE_COMPLETED_EVENT_TYPE =
  'shopping-list.purchase-completed' as const;
export const PURCHASE_COMPLETED_EVENT_VERSION = 1 as const;
export const PURCHASE_COMPLETED_ROUTING_KEY =
  'shopping-list.purchase-completed.v1' as const;

export interface PurchaseCompletedItem {
  name: string;
  quantity: number;
  unit: ItemUnit;
  unitPrice: number;
}

export interface PurchaseCompletedPayload {
  completionId: string;
  market: string;
  purchaseDate: string; // YYYY-MM-DD
  items: PurchaseCompletedItem[];
}

export interface PurchaseCompletedEventV1 {
  eventId: string;       // UUID da mensagem (rastreio)
  eventType: typeof PURCHASE_COMPLETED_EVENT_TYPE;
  eventVersion: typeof PURCHASE_COMPLETED_EVENT_VERSION;
  occurredAt: string;    // ISO-8601 (momento do checkout)
  payload: PurchaseCompletedPayload;
}
```

**Quando publica:** após checkout bem-sucedido com ≥1 comprado (gravação no
outbox na conclusão; publicação assíncrona pelo publisher).
**Quando não publica:** 0 comprados; checkout com 400.

## Dados e ownership

- **`shopping_list` (Postgres):** dono exclusivo do `shopping-list-service`.
  Nova tabela **`outbox_messages`** (no mesmo banco — padrão transactional
  outbox):

  | Coluna | Tipo | Notas |
  | --- | --- | --- |
  | `id` | `uuid` PK | |
  | `completion_id` | `uuid not null unique` | chave de negócio do evento |
  | `event_type` | `text not null` | `shopping-list.purchase-completed` |
  | `event_version` | `int not null` | `1` |
  | `payload` | `jsonb not null` | envelope completo ou payload tipado |
  | `created_at` | `timestamptz not null` | |
  | `published_at` | `timestamptz null` | null ⇒ pendente |
  | `attempts` | `int not null default 0` | |
  | `last_error` | `text null` | |

  Índice parcial `where published_at is null` para o publisher. A conclusão
  continua fazendo `DELETE` físico dos itens comprados (lista ativa limpa);
  o histórico **não** vive neste banco.

- **`price_history` (Postgres):** dono exclusivo do `price-history-service`
  (RN-01 / ADR 0001). Tabelas:

  **`purchases`**

  | Coluna | Tipo | Notas |
  | --- | --- | --- |
  | `id` | `uuid` PK | = `completionId` (idempotência) |
  | `market` | `text not null` | |
  | `purchase_date` | `date not null` | |
  | `created_at` | `timestamptz not null` | ordem de registro |

  **`purchase_items`**

  | Coluna | Tipo | Notas |
  | --- | --- | --- |
  | `id` | `uuid` PK | |
  | `purchase_id` | `uuid` FK → purchases | cascade |
  | `name` | `text not null` | como no evento |
  | `name_normalized` | `text not null` | domínio (CD-05) |
  | `quantity` | `numeric(12,3) not null` | |
  | `unit` | `text not null` | |
  | `unit_price` | `numeric(12,2) not null` | R$ |

  Índice em `purchase_items(name_normalized)` para agregação/busca.

- **Código compartilhado:** só `libs/contracts` (HTTP + evento). Sem
  compartilhar bancos, ORM ou módulos de domínio entre serviços.
- **Segredos:** nenhum novo. JWT público já no `.env`
  (`AUTH_JWT_PUBLIC_KEY_B64`). RabbitMQ local guest/guest (já documentado).

## Revisão arquitetural

- **Obrigatória:** **sim** — cruza `shopping-list-service` ↔ evento RabbitMQ ↔
  `price-history-service` ↔ PWA; novo ownership (`price_history`); contrato de
  evento + outbox; ADR 0010 de acesso.
- **Parecer:** `docs/features/price-history/ARCHITECTURE-REVIEW.md`
- **Estado:** **aprovada com ressalvas** (2026-10-16) — ressalvas incorporadas
  neste plano: (a) outbox na **mesma** transação Postgres do `DELETE` dos
  comprados; (b) ack após ingest / nack-requeue em falha transitória;
  (c) ordem de entrega best-effort; produto ordena por `purchase_date`.

## Estratégia de testes

Pré-requisitos backend: `npm run docker:up` (Postgres + RabbitMQ);
`npx nx run shopping-list-service:db:migrate`;
`npx nx run price-history-service:db:migrate`. E2E de UI permanece
**hermético** (sem Docker).

- **`shopping-list-service`:** unit (validação mercado/data; checkout gera
  outbox só com comprados); integração HTTP (400 data futura / mercado;
  200 sem broker); integração outbox → publish (com RabbitMQ ou fake do
  port) + retry.
- **`price-history-service`:** unit (normalização, menor preço, busca,
  idempotência do ingest); integração HTTP (list/detail/lowest + 401);
  integração consumidor (duplicar evento → 1 registro — AC-16); ausência de
  `DATABASE_URL` do shopping-list / sem client cross-DB (AC-17).
- **`web`:** store/API (base `localhost:3002` + `Authorization`); telas 4
  estados; checkout sheet (campos, validação local, single-flight); bottom
  nav ativa.
- **E2E Playwright:** jornadas herméticas em `apps/web-e2e/src/price-history/`
  + evolução de `shopping-list/checkout.spec.ts`; fake APIs tipadas por
  `@lista/contracts`; ≥1 asserção de chamada a `http://localhost:3002` com
  `Authorization` (AC-21 / ADR 0010). Comando: `npx nx e2e web-e2e` (filtro
  `-- --grep "histórico"` / `"menor preço"` / `"checkout"`).
- **Regressão:** suíte E2E existente de auth + shopping-list deve permanecer
  verde após mudança de nav e checkout.

### Matriz AC ↔ E2E

| AC | Observável na UI? | Cenário Playwright (arquivo / título) | Evidência não-E2E (se AC só backend) |
| --- | --- | --- | --- |
| AC-01 | sim | `price-history/nav.spec.ts` — "toca Histórico: navega, aba ativa, sem 'em breve'" | — |
| AC-02 | sim | `price-history/nav.spec.ts` — "toca Menor preço: navega, aba ativa, sem 'em breve'" | — |
| AC-03 | sim | `shopping-list/checkout.spec.ts` — "com comprados, sheet mostra Mercado e Data (hoje, editável, sem futura)" | unit sheet |
| AC-04 | sim | `shopping-list/checkout.spec.ts` — "mercado vazio ou data futura: erro no campo, lista intacta, sem POST de sucesso" | integração checkout 400 + outbox vazio |
| AC-05 | sim | `shopping-list/checkout.spec.ts` — "confirma com mercado/data válidos: só comprados saem + toast sucesso" | integração: checkout 200 grava outbox mesmo com publisher falhando |
| AC-06 | sim | `price-history/history.spec.ts` — "após 'consumo' (fake API com compra), Histórico mostra data/mercado e detalhe com itens" | integração consumidor → GET purchases |
| AC-07 | sim | `shopping-list/checkout.spec.ts` — "sem comprados: sem campos mercado/data; lista igual; histórico fake sem nova compra" | integração: sem outbox |
| AC-08 | sim | `price-history/lowest-price.spec.ts` — "lista menor preço; café/cafe como um item" | unit agregação |
| AC-09 | sim | `price-history/lowest-price.spec.ts` — "busca `cafe` acha `café`; sem resultado = empty de busca" | unit busca |
| AC-10 | sim | `price-history/lowest-price.spec.ts` — "dois preços → exibe o menor (ex. R$ 7,50)" | unit/integração min |
| AC-11 | sim | `price-history/history.spec.ts` — "abre compra: detalhe com data, mercado e itens" | — |
| AC-12 | sim | `price-history/history.spec.ts` + `lowest-price.spec.ts` — "empty states ricos sem compras / sem preços" | — |
| AC-13 | sim | `price-history/history.spec.ts` + `lowest-price.spec.ts` — "primeira carga: skeleton no formato do conteúdo" | unit estados |
| AC-14 | sim | ambos — "falha de carga: erro + Tentar novamente refetcha" | unit store |
| AC-15 | sim | `shopping-list/checkout.spec.ts` — "falha do shopping-list no checkout: toast, digitado preservado, sem fantasma" | unit store |
| AC-16 | **não** | — | **integração** price-history: reentregar mesmo evento → 1 registro (`npx nx test price-history-service`) |
| AC-17 | **não** | — | **integração/arquitetura**: ingest só via evento; sem conexão ao DB `shopping_list`; outbox no produtor |
| AC-18 | parcial (PWA 401→login) | `price-history/nav.spec.ts` ou jornada auth — "401 no histórico → volta ao login" | integração HTTP 401 sem JWT |
| AC-19 | sim | `price-history/nav.spec.ts` + history/lowest — "360px/desktop, tema claro/escuro, primary, alvos ≥44px" | checklist VALIDATION |
| AC-20 | sim | `shopping-list/checkout.spec.ts` — "duplo toque: Concluindo…, disabled, 1 requisição" | unit single-flight |
| AC-21 | sim | ≥1 jornada price-history — "PWA chama `http://localhost:3002/api/price-history/*` com Authorization" | — |

## Riscos e trade-offs

- **Consistência eventual (CD-06).** Toast de sucesso na lista ≠ histórico
  atualizado na hora. E2E hermético simula o consumo via fake API; a prova
  ponta-a-ponta broker fica na integração dos serviços.
- **Outbox no mesmo DB da lista.** Padrão clássico; ownership da lista
  preservado. **`DELETE` dos comprados + `INSERT` em `outbox_messages` na
  mesma transação Postgres** (ressalva da revisão arquitetural — sem
  “sequência atômica equivalente”). Alternativa (mensagem síncrona no
  request) violaria CD-06.
- **Ordem de entrega.** At-least-once não garante ordem global entre
  conclusões distintas; a fila assume consumo single-active / FIFO
  **best-effort**. A ordenação observável no produto privilegia
  `purchase_date` (+ `created_at` de ingestão).
- **Fuso da “data de hoje”.** PWA valida no calendário local; serviço rejeita
  `purchaseDate > YYYY-MM-DD(UTC now)` como defesa. Edge case perto da
  meia-noite UTC×BRT aceito na v1 (risco baixo; documentado).
- **RabbitMQ guest local.** Só desenvolvimento; credenciais já no compose.
- **E2E hermético × full-stack.** Mesmo padrão da lista: UI + contrato
  interceptado; regras de serviço na integração. Full-stack exigiria JWT
  real + dois serviços + broker — fora do padrão atual.
- **Duplicação de `normalizeItemName`.** Cada serviço tem a função no próprio
  domínio (hexagonal; sem lib de domínio compartilhada). Manter paridade via
  specs espelhando CD-05; extrair para lib só se o usuário pedir depois.
- **Scaffold Nx do serviço novo.** T-03 cria o app espelhando auth/shopping-list
  (webpack Nest, vitest, drizzle). Risco de drift de config — mitigado
  copiando o esqueleto do `auth-service` e ajustando prefixos.
- **Cadeia front sequencial.** T-17→T-18→T-19→T-20 tocam rotas/shell/nav e
  features adjacentes — paralelismo limitado.
- **Testes de integração dependem de Docker** (Postgres + RabbitMQ).

## Tarefas

Cada tarefa: um agente, arquivos permitidos, deps, comando e evidência.
Paralelismo só com arquivos disjuntos e sem deps (máx. 2). ADR 0010 está
**Aceita**; T-01 confere consistência documental e anota a ADR 0006 §1.

| ID | ACs | Agente | Descrição | Arquivos permitidos | Depende de | Testes/comandos | Evidência esperada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | AC-21 (acesso) | backend-dev | **ADR 0010** (já criada): conferir com template; anotar **ADR 0006 §1** apontando para 0010 (terceira exceção); alinhar `.env.example` comentários de `PRICE_HISTORY_*` / porta 3002 se ainda faltarem na doc | `docs/decisions/0006-excecao-temporaria-ao-gateway-e-politicas-da-v1.md`, `docs/decisions/0010-excecao-temporaria-ao-gateway-price-history-service.md`, `.env.example` | — | revisão de doc (`git diff docs/decisions`) | ADR 0010 no formato do template (escopo, base URL, CORS, saída, dono); ADR 0006 apontando para 0010 |
| T-02 | AC-03–AC-11, AC-16, AC-18, AC-21 (base contratos) | backend-dev | **Contratos** em `libs/contracts`: `CheckoutShoppingListRequest`; HTTP price-history (`Purchase*`, `LowestPrice*`); evento `PurchaseCompletedEventV1` + constantes de tipo/versão/routing key; exports `http/index.ts` + `events/index.ts`; README com rotas/status/evento | `libs/contracts/src/http/shopping-list.ts`, `libs/contracts/src/http/price-history.ts`, `libs/contracts/src/http/index.ts`, `libs/contracts/src/events/**`, `libs/contracts/README.md` | — | `npx nx build contracts`; `npx nx lint contracts` | build/lint verdes; README documentando checkout evoluí­do, 4 operações do histórico e o evento v1 |
| T-03 | AC-17, AC-18 (infra serviço) | backend-dev | **Scaffold `price-history-service`**: app Nest/Fastify hexagonal (`domain`/`application`/`infrastructure`/`api`), ConfigModule, Drizzle + `PRICE_HISTORY_DATABASE_URL`, prefixo `api`, porta `PRICE_HISTORY_API_PORT=3002`, **JwtAuthModule** global (ADR 0007, mesma chave pública), CORS stub/`PRICE_HISTORY_CORS_ORIGINS`, targets `build`/`serve`/`test`/`db:generate`/`db:migrate` no `project.json`, vitest | `apps/price-history-service/**`, `tsconfig.base.json` (path se necessário), `package.json` só se deps novas forem inevitáveis | T-01 | `npx nx build price-history-service`; `npx nx test price-history-service` | build verde; suíte mínima (smoke JWT/config) verde; app sobe na 3002 |
| T-04 | — (infra/doc) | backend-dev | **Env e docs**: descomentar/documentar `PRICE_HISTORY_DATABASE_URL`, `PRICE_HISTORY_API_PORT`, `PRICE_HISTORY_CORS_ORIGINS`, uso de `RABBITMQ_URL` pelos dois serviços; README com base URL ADR 0010, Docker (Postgres+RabbitMQ), comandos `db:*` do novo serviço | `.env.example`, `README.md` | T-01 | revisão de doc | variáveis documentadas; README com porta 3002 e migrate |
| T-05 | AC-08, AC-09, AC-10 (regras domínio PH) | backend-dev | **Domínio price-history**: `normalizeItemName` (paridade CD-05), entidades compra/item, agregação de menor preço, filtro de busca, validação de ingest + specs | `apps/price-history-service/src/domain/**` | T-02, T-03 | `npx nx test price-history-service -- domain` | specs: `café`=`cafe`; menor preço; busca; sinônimos distintos |
| T-06 | AC-06, AC-11, AC-16, AC-17 | backend-dev | **Persistência PH**: schema Drizzle `purchases` + `purchase_items` (PK=`completionId`), migração, port `PurchaseRepository` + adaptador; targets db | `apps/price-history-service/src/infrastructure/persistence/**`, `apps/price-history-service/src/application/ports/**`, `apps/price-history-service/project.json`, `apps/price-history-service/drizzle.config.ts` | T-05 | `npx nx run price-history-service:db:generate`; `npx nx run price-history-service:db:migrate` | SQL versionado; migrate no DB `price_history` ok |
| T-07 | AC-06, AC-08–AC-12, AC-16 | backend-dev | **Casos de uso PH** (framework-free): ingest idempotente; listar compras; detalhe; listar/buscar menores preços + specs com repo fake | `apps/price-history-service/src/application/use-cases/**`, `apps/price-history-service/src/application/index.ts` | T-05, T-06 | `npx nx test price-history-service -- use-cases` | specs verdes incl. 2ª ingest do mesmo `completionId` sem duplicar |
| T-08 | AC-01, AC-02, AC-06, AC-08–AC-14, AC-18, AC-21 | backend-dev | **Borda HTTP PH**: controller rotas GET purchases / purchases/:id / lowest-prices?q; 404/401/500 canônicos; CORS; módulo + `configure-app` + AppModule | `apps/price-history-service/src/api/**`, `apps/price-history-service/src/app/**`, `apps/price-history-service/src/main.ts` | T-02, T-06, T-07 | `npx nx test price-history-service -- http`; `npx nx build price-history-service` | inject + JWT: 200/404/401; CORS preflight origem 4200; query `q` |
| T-09 | AC-06, AC-16, AC-17 | backend-dev | **Consumidor RabbitMQ**: bind fila, deserializa evento v1, chama ingest; **ack só após ingest OK**; falha transitória → **nack/requeue** (idempotência por `completionId` cobre reentrega; DLQ fora da v1); config `RABBITMQ_URL` | `apps/price-history-service/src/infrastructure/messaging/**`, `apps/price-history-service/src/app/**` | T-02, T-07 | `npx nx test price-history-service -- messaging` (com Docker RabbitMQ ou double do port) | 2× publish mesmo `completionId` → 1 purchase; nack/requeue em falha simulada; sem acesso ao DB da lista |
| T-10 | AC-03, AC-04, AC-05, AC-07, AC-16 (produtor) | backend-dev | **Domínio/validação checkout SL**: validar mercado/data (não futura); gerar `completionId` + montar payload do evento (puro) + specs | `apps/shopping-list-service/src/domain/**` | T-02 | `npx nx test shopping-list-service -- domain` | specs: data futura rejeitada; mercado só espaços rejeitado; payload com itens comprados |
| T-11 | AC-05, AC-07, AC-16, AC-17 | backend-dev | **Outbox SL**: schema `outbox_messages` + migração; port `OutboxRepository` / `EventPublisher`; adaptador Drizzle | `apps/shopping-list-service/src/infrastructure/persistence/**`, `apps/shopping-list-service/src/application/ports/**`, `apps/shopping-list-service/src/infrastructure/messaging/**` (ports/types) | T-10 | `npx nx run shopping-list-service:db:generate`; `npx nx run shopping-list-service:db:migrate` | SQL outbox versionado; migrate ok |
| T-12 | AC-05, AC-07, AC-16, AC-17 | backend-dev | **Checkout + publisher**: use case, na **mesma transação Postgres**, faz `DELETE` dos comprados + `INSERT` no outbox (sem outbox se 0); publisher periódico/retry até `published_at`; falha do broker **não** falha o HTTP | `apps/shopping-list-service/src/application/use-cases/**`, `apps/shopping-list-service/src/infrastructure/messaging/**` | T-10, T-11 | `npx nx test shopping-list-service -- use-cases`; `npx nx test shopping-list-service -- messaging` | checkout 200 com publisher fake falhando ainda grava outbox na mesma tx do DELETE; 0 comprados → 0 outbox; retry marca published |
| T-13 | AC-03–AC-05, AC-07, AC-15, AC-20 | backend-dev | **HTTP checkout SL**: body `CheckoutShoppingListRequest`; 400 de validação; wiring use case; testes de controller/integração atualizados (substituem “sem mercado/data”) | `apps/shopping-list-service/src/api/http/shopping-list/**`, `apps/shopping-list-service/src/integration/**` | T-02, T-12 | `npx nx test shopping-list-service` | 400 mercado/data; 200 com outbox; 200 sem comprados sem outbox; regressão demais rotas |
| T-14 | AC-01, AC-02, AC-06, AC-08–AC-14, AC-18, AC-21 | angular-dev | **Camada de dados PWA do histórico**: `PRICE_HISTORY_API_BASE_URL` (3002), `PriceHistoryApiService` tipado, store signals (loading/loaded/error, list/detail/lowest, refetch) | `apps/web/src/app/core/price-history/**`, `apps/web/src/app/features/price-history/data/**`, `apps/web/src/app/features/price-history/state/**` | T-02 | `npx nx test web` | specs: URL/header Authorization; estados de erro; 401 tratado como sessão |
| T-15 | AC-03–AC-05, AC-07, AC-15, AC-20 | angular-dev | **API/store checkout SL**: enviar `market`/`purchaseDate` no POST; tipagem `@lista/contracts`; single-flight | `apps/web/src/app/features/shopping-list/data/**`, `apps/web/src/app/features/shopping-list/state/**`, `apps/web/src/app/core/shopping-list/**` | T-02 | `npx nx test web` | payload correto; 1 request; erro preserva digitado |
| T-16 | AC-01, AC-02, AC-19 | angular-dev | **Bottom nav + rotas**: Histórico `/historico`, Menor preço `/menor-preco`, detalhe `/historico/:id`; abas ativas sem “em breve”; Lista permanece `/` | `apps/web/src/app/layout/**`, `apps/web/src/app/app.routes.ts` | — | `npx nx test web`; `npx nx e2e web-e2e` (regressão auth/lista) | nav navega; E2E auth + shopping-list load sem regressão grave de shell |
| T-17 | AC-03, AC-04, AC-05, AC-07, AC-15, AC-19, AC-20 | angular-dev | **Checkout sheet**: campos Mercado\* e Data\* (hoje, `max=hoje`); validação local; wiring; sem campos se 0 comprados; rótulo `Concluindo…` | `apps/web/src/app/features/shopping-list/checkout-sheet.*`, `apps/web/src/app/features/shopping-list/shopping-list-page.*` | T-15, T-16 | `npx nx test web` | specs AC de formulário/validação/single-flight verdes |
| T-18 | AC-01, AC-06, AC-11–AC-14, AC-19 | angular-dev | **Telas Histórico + detalhe**: lista (data+mercado), empty/skeleton/erro+retry, detalhe com voltar `aria-label`, tokens GUIA | `apps/web/src/app/features/price-history/**` | T-14, T-16 | `npx nx test web` | 4 estados + detalhe verdes |
| T-19 | AC-02, AC-08–AC-10, AC-12–AC-14, AC-19 | angular-dev | **Tela Menor preço**: busca por nome, lista nome+R$, empty de lista e de busca, skeleton/erro | `apps/web/src/app/features/price-history/**` | T-14, T-16 | `npx nx test web` | busca/agregação de UI + 4 estados verdes |
| T-20 | AC-05, AC-07, AC-16, AC-17 + contratos HTTP | test-engineer | **Auditoria backend**: mapa AC→teste; lacunas outbox/retry, idempotência, 400 checkout, HTTP PH, 401; Postgres+RabbitMQ | `apps/shopping-list-service/**`, `apps/price-history-service/**` | T-08, T-09, T-13 | `npx nx test shopping-list-service`; `npx nx test price-history-service` (Docker up + migrates) | suítes verdes + mapa AC no handoff |
| T-21 | AC-01–AC-15, AC-18–AC-21 (camada unit PWA) | test-engineer | **Auditoria unitária PWA**: nav, checkout sheet, history/lowest states, store 401, design tokens smoke | `apps/web/**` | T-17, T-18, T-19 | `npx nx test web` | suíte verde + mapa AC |
| T-22 | Todos os ACs observáveis na UI (matriz) | test-engineer | **E2E Playwright**: helpers fake price-history + evolução checkout fake; jornadas `nav`, `history`, `lowest-price`, checkout atualizado; afirmar base `localhost:3002` + Authorization; manter hermético | `apps/web-e2e/**` | T-17, T-18, T-19, T-21 | `npx nx e2e web-e2e` (filtros `-- --grep "histórico\|menor preço\|checkout"`) e suíte completa | **suíte verde** + comando/resultado no handoff; matriz coberta |

### Ordem e paralelismo (para o orquestrador)

Máximo de **duas** tarefas simultâneas, arquivos disjuntos, sem deps cruzadas.

- **Onda 1:** T-01 (docs/ADR) ∥ T-02 (contracts)
- **Onda 2:** T-03 (scaffold PH, dep T-01) ∥ T-04 (env/README, dep T-01)
- **Onda 3:** T-05 (domínio PH, dep T-02/T-03) ∥ T-10 (domínio checkout SL, dep T-02)
- **Onda 4:** T-06 (persistência PH) ∥ T-11 (outbox SL, dep T-10)
- **Onda 5:** T-07 (use cases PH) ∥ T-12 (checkout+publisher SL, dep T-10/T-11)
- **Onda 6:** T-08 (HTTP PH) ∥ T-13 (HTTP checkout SL)
- **Onda 7:** T-09 (consumidor PH, dep T-07/T-02) ∥ T-14 (data PWA PH, dep T-02)
- **Onda 8:** T-15 (data checkout PWA) ∥ T-16 (nav/rotas)
- **Onda 9:** T-17 (checkout sheet, dep T-15/T-16) — sozinha
- **Onda 10:** T-18 (Histórico UI) ∥ T-20 (auditoria backend, dep T-08/T-09/T-13) — arquivos disjuntos
- **Onda 11:** T-19 (Menor preço UI, dep T-14/T-16; idealmente após T-18 se compartilhar pasta — **sequencial se os mesmos arquivos `features/price-history/**` forem tocados**; se T-18/T-19 usarem arquivos disjuntos dentro da feature, o orquestrador pode paralelizar T-19 com o fim de T-18 **somente** com escopos de arquivo sem interseção)
- **Onda 12:** T-21 (auditoria web) — sozinha
- **Onda 13:** T-22 (E2E) — sozinha

> **Nota T-18/T-19:** por padrão **sequenciais** (ambos em
> `apps/web/src/app/features/price-history/**`). Só paralelizar se o
> implementador declarar arquivos disjuntos no handoff da onda.

Após cada T com testes verdes, o orquestrador comita (Conventional Commits,
`T-XX`) antes da próxima.

**Antes da implementação:** plano aprovado + parecer arquitetural sem
bloqueios — o orquestrador cria a branch `feature/price-history` e delega
**T-01**.

## Decisões

- **ADR 0010** (`docs/decisions/0010-excecao-temporaria-ao-gateway-price-history-service.md`,
  **Aceita**): PWA → `price-history-service` em `http://localhost:3002`; CORS
  `PRICE_HISTORY_CORS_ORIGINS`; critérios de saída; prefixo `PRICE_HISTORY_*`.
- **Evento:** `shopping-list.purchase-completed` v1; routing key
  `shopping-list.purchase-completed.v1`; idempotência por `completionId`.
- **Outbox + retry** no shopping-list (CD-06): `DELETE` dos comprados +
  `INSERT` no outbox na **mesma** transação Postgres; consumidor idempotente
  com ack após ingest e nack/requeue em falha transitória.
- **Ordem:** entrega best-effort; produto ordena por `purchase_date`.
- **Checkout:** body `{ market, purchaseDate }` obrigatório só com ≥1
  comprado; data `YYYY-MM-DD` sem futura (CD-07).
- **APIs PH:** `GET /api/price-history/purchases`, `…/purchases/{id}`,
  `…/lowest-prices?q=`.
- **JWT local** em ambos (ADR 0007); sem gateway nesta rodada.
- **Revisão arquitetural:** obrigatória; estado **aprovada com ressalvas**
  (`ARCHITECTURE-REVIEW.md`, 2026-10-16); ressalvas incorporadas neste plano.
- **E2E hermético** (ADR 0008), padrão da feature shopping-list.

## Gate do plano

- [x] Todas as tarefas referenciam ao menos um `AC-*` ou justificam trabalho
      técnico (T-01, T-04).
- [x] Tarefas preferem escopo pequeno e cada uma declara comando de teste.
- [x] `Superfície de UI: sim` declarada com justificativa (ADR 0008).
- [x] Matriz AC ↔ E2E completa; tarefa Playwright **T-22** com
      `npx nx e2e web-e2e` (ou filtro).
- [x] Dependências, arquivos permitidos, testes e evidências explícitos;
      ordem/paralelismo (máx. 2).
- [x] Contratos e ownership definidos (HTTP + evento + bancos).
- [x] Revisão arquitetural **obrigatória** concluída — estado **aprovada com
      ressalvas**; parecer em `ARCHITECTURE-REVIEW.md`; ressalvas
      incorporadas neste plano.
- [x] Não há decisão de comportamento, contrato ou arquitetura de produto em
      aberto (CD-01…CD-07 fechadas; ADR 0010 Aceita; ressalvas do parecer
      aplicadas).
- [x] Artefato contém a frase canônica
      `Aprovado pelo usuário em 2026-10-16`.

```text
Aprovado pelo usuário em 2026-10-16
```

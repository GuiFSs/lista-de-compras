# Plano técnico — Lista de compras ativa

**Status:** Aprovado
**Spec:** `docs/features/shopping-list/SPEC.md`
**Última atualização:** 2026-10-13
**Aprovação do usuário:** Aprovado pelo usuário em 2026-10-13

## Contexto

A feature **Lista de compras ativa** (spec aprovada pelo usuário em 2026-10-13 —
`docs/features/shopping-list/SPEC.md`, 26 ACs, 20 RNs, CD-01…CD-12, nenhuma decisão
aberta) entrega a tela principal da PWA depois do login: obter a lista ativa,
adicionar/editar/excluir item, marcar/desmarcar como comprado e concluir a compra.
Histórico de preços, menor preço, comparação e o envio ao histórico por evento ficam
**fora desta rodada** (RN-16/AC-21; escopo confirmado no `STATUS.md`).

Tudo o que a spec deixou para o nível técnico é fechado aqui: contratos HTTP exatos
do `shopping-list-service`, modelagem/migração Drizzle, unicidade do nome
(normalização sem acentos/maiúsculas/espaços), comportamento da PWA (estados, sheets,
toasts) e a **ADR 0009** — exceção temporária à ADR 0001 para a PWA chamar o serviço
de lista diretamente (prevista em CD-01 e exigida pela ADR 0006 §1).

**Estado do código inspecionado nesta fase (não inventado):**
`apps/shopping-list-service` tem o esqueleto hexagonal (`src/domain`,
`src/application/{ports,use-cases}`, `src/infrastructure/persistence/drizzle`,
`src/api/http/auth`) com `ConfigModule` global, Drizzle provider (`DATABASE_URL`),
prefixo global `api`, porta `API_PORT=3000` e **guard global de JWT já registrado**
(`JwtAuthModule`, 401 uniforme — ADR 0007); schema Drizzle e migrations vazios.
`apps/auth-service` é o espelho de como o time estruturou serviço + schema + targets
`db:generate`/`db:migrate`. A PWA (`apps/web`) tem `core/auth` (session service,
guard, interceptor que já anexa `Authorization` em URLs `localhost` e trata 401 →
login), `layout/authenticated-shell` (app bar + "Sair"), tokens em
`styles/_tokens.scss`, rota `''` ainda apontando para o placeholder `features/home`.
`apps/web-e2e` tem Playwright com dois `webServer` (`web` 4200 e `auth-service` 3001)
e specs herméticos por interceptação de rota. `libs/contracts` guarda os DTOs de
login em `src/http/auth.ts`; `libs/ui-web` é um scaffold sem target de teste.

## Superfície de UI

- **Superfície de UI:** **sim**
- **Justificativa:** a feature altera `apps/web` (nova tela Lista, bottom nav, sheets,
  toasts, rota autenticada) e a esmagadora maioria dos ACs é observável em
  tela/interação (AC-01…AC-08, AC-10…AC-20, AC-22…AC-26). Pela ADR 0008, isso exige
  matriz AC ↔ E2E e ao menos uma tarefa Playwright em `apps/web-e2e` com evidência de
  comando + resultado — ambas presentes neste plano (T-17 e matriz na seção
  "Matriz AC ↔ E2E").

## Abordagem

1. **Decisão de acesso primeiro (ADR 0009).** A PWA chama o `shopping-list-service`
   direto em `http://localhost:3000` como exceção temporária à ADR 0001, com CORS
   local (`SHOPPING_LIST_CORS_ORIGINS`), critérios de saída e dono da migração. A
   ADR é entrega **desta** fase de plano (arquivo em `docs/decisions/`); a ADR 0006
   §1 ganha nota apontando para ela. Sem isso o contrato da PWA ficaria com decisão
   de arquitetura em aberto.
2. **Contrato como fonte única.** Os DTOs das operações da lista vão para
   `libs/contracts/src/http/shopping-list.ts` e são consumidos **pelos dois lados**
   (serviço e PWA). A lista `ITEM_UNITS` (as sete unidades do RN-05) é declarada uma
   única vez ali — RN-05/AC-06 deixam de depender de duas strings divergentes.
3. **Serviço hexagonal (domínio → aplicação → borda HTTP).** Domínio puro
   (`src/domain`): `ShoppingListItem`, normalização do nome, validações, soma,
   marcação/desmarcação, ordenação e seleção do que sai na conclusão. Casos de uso em
   `src/application/use-cases` sobre o port `ShoppingListRepository`. Adaptador
   Drizzle + schema/migração em `src/infrastructure/persistence`. Borda HTTP em
   `src/api/http/shopping-list` (controller + módulo + mensagens), com o guard global
   de JWT já existente (ADR 0007) — **nenhuma alteração de autenticação**.
4. **Persistência.** Uma tabela (`shopping_list_items`) **é** a lista ativa; a
   unicidade do nome é garantida por **índice único parcial** sobre a coluna
   `name_normalized` (o domínio calcula; o banco impõe — AC-09). Exclusão com
   "Desfazer" usa *soft delete* (`removed_at`); a conclusão da compra faz
   *hard delete* apenas dos itens comprados (AC-21: nada de compra permanece
   armazenado).
5. **PWA.** Camada de dados tipada (`features/shopping-list/data` + `state` com
   signals) e tela Lista composta pela receita "lista/conteúdo" do GUIA-DESIGN §4:
   app bar (título + ação de ícone **Concluir compra** contribuída pela rota), apoio
   curto, coluna única com pendentes→comprados, **uma** ação primary ("Adicionar
   item") e bottom nav com as três abas. Sheets (bottom) para item, marcar comprado,
   ações do item, duplicidade (só na criação) e conclusão; toasts para confirmações
   (≈4s) e erros (permanecem até o descarte).
6. **Testes.** Unitários de domínio/casos de uso (Vitest) e integração com Postgres
   local no serviço (incl. AC-09, AC-21, AC-24); unitários da PWA; **Playwright
   hermético** para as jornadas de UI (mesmo padrão da feature de autenticação:
   contrato HTTP interceptado), com paridade de contrato garantida pelos tipos de
   `libs/contracts` e pela integração real do serviço.

## Domínio e casos de uso

Regras que o domínio/casos de uso precisam impor (nada disso depende de Nest,
Fastify, Drizzle ou HTTP):

- **Nome obrigatório e normalizado (RN-02, CD-12):** `normalizeItemName(nome)` =
  trim → NFC/NFKD → remoção de diacríticos (marcas combinantes) → `toLowerCase()`.
  Assim `café`, `CAFE`, `Cafe ` e `cafe` são o **mesmo** item; `cebola branca` ≠
  `cebola` (sinônimos não são tratados como iguais). A coluna `name_normalized` é
  derivada **só** no domínio — nenhum cliente calcula normalização (por isso o 409
  devolve `duplicateOf.name`).
- **Campos opcionais (RN-03):** quantidade planejada, unidade e preço planejado são
  opcionais; no `PATCH`, **campo ausente = manter** e **campo `null` = limpar**
  (semântica explícita do contrato, ver "Contratos").
- **Valores (RN-06, CD-08):** quantidade (planejada e comprada) **> 0** quando
  informada; preços **≥ 0**; unidade sempre uma das sete; decimais com vírgula ou
  ponto são aceitos **na entrada da PWA** (parse) e trafegam como número JSON.
- **Duplicidade na criação (RN-04, CD-02):** criar com nome já existente não cria
  segundo item; o serviço responde **409** e a PWA pergunta "somar quantidade?".
  Confirmando, a quantidade informada é **somada** ao item existente
  (`duplicateResolution: "sum-planned-quantity"`; sem quantidade informada, o
  existente fica como está). Recusando, nada muda e o formulário continua aberto.
- **Duplicidade na edição (RN-04, CD-13):** editar o nome de um item para um nome já
  existente em **outro** item **não aplica a mudança** — o item permanece exatamente
  como estava (nome e demais campos originais) e **nada é somado** a nenhum item.
  Aqui **não há** a pergunta "somar quantidade": o serviço responde **409** e a PWA
  mostra o **conflito visível no formulário** ("Já existe um item com esse nome"),
  permitindo corrigir o nome ou cancelar. Renomear um item para o **próprio** nome
  normalizado (`cafe` → `café` do mesmo item) **não** é conflito e a edição é
  aplicada normalmente (o conflito do `PATCH` exclui o próprio item).
- **Excluir/restaurar (RN-07, RN-08, CD-07):** excluir tira o item da lista ativa
  imediatamente (`removed_at`); restaurar devolve **os mesmos dados** (inclusive o
  estado comprado); se o nome já tiver sido retomado por outro item ativo, a
  restauração é recusada com 409 (conflito de negócio).
- **Marcar/desmarcar (RN-09…RN-13):** marcar exige quantidade comprada, unidade e
  preço por unidade; o item **continua na lista**; desmarcar devolve a pendente e
  **limpa** os dados da compra no serviço (a preservação dos valores digitados é de
  tela — CD-04; recarregando, vale o pré-preenchimento do AC-15).
- **Concluir (RN-14…RN-16, AC-19…AC-21):** concluir remove **somente** os comprados
  (`DELETE` físico da linha); sem comprados, nada sai e nada é gravado; não há
  mercado/data, **não** há registro de compra, **não** há evento e **não** existe
  rota de histórico.
- **Ordem (RN-18):** o serviço devolve **pendentes primeiro, comprados depois**
  (dentro de cada grupo, pela criação). A PWA renderiza a ordem recebida — a regra
  tem um dono só.

## Contratos

### HTTP — shopping-list-service (novo)

Serviço existente `apps/shopping-list-service` (Fastify, prefixo global `api`), porta
`API_PORT=3000` (herança do primeiro serviço — ADR 0006 §4/ADR 0009 §4). A PWA chama
direto `http://localhost:3000` (ADR 0009). **Todas** as rotas exigem sessão: o guard
global valida o JWT localmente (RS256, `AUTH_JWT_PUBLIC_KEY_B64`, `iss`) e responde
**401 uniforme** `{ "statusCode": 401, "message": "Não autorizado" }` (ADR 0007).

Convenções do contrato (valem para todas as rotas):

- **Envelope de erro canônico** (mesmo da feature de auth): `{ statusCode, message }`
  — PT, genérico; `message` nunca expõe detalhe interno; 500 sem stack/detalhe.
- **Toda mutação responde a lista ativa completa** (`ShoppingListResponse`) — o
  estado relevante vive no serviço (RN-19/AC-24) e a PWA não recombina estado no
  cliente. Payload é uma lista única e compartilhada, naturalmente pequena.
- **409 de duplicidade — criação é fluxo, edição é conflito de formulário:** em ambos
  os casos o corpo traz, além do envelope canônico, `error: "duplicate-item-name"` e
  `duplicateOf: { id, name }` (nome canônico do item existente). Na **criação**, a PWA
  usa `duplicateOf.name` no texto da pergunta "somar?" e **não** mostra toast de erro.
  Na **edição**, a PWA mostra o conflito **no formulário** ("Já existe um item com esse
  nome") e **não** oferece a pergunta de somar.
- **Resolução de duplicidade é do serviço e só existe na criação:** confirmando a soma,
  o cliente reenvia o `POST /items` com `duplicateResolution: "sum-planned-quantity"`; o
  serviço localiza o item existente pela normalização do nome e soma (o cliente
  **nunca** normaliza nem faz aritmética). O `PATCH` (edição) **não** aceita
  `duplicateResolution` nem soma: o 409 é terminal — o item permanece inalterado e a
  pessoa corrige o nome ou cancela.

| Operação | Rota | Request | Sucesso | Erros de negócio |
| --- | --- | --- | --- | --- |
| Obter a lista ativa | `GET /api/shopping-list` | — | **200** `ShoppingListResponse` | 401, 500 |
| Criar item | `POST /api/shopping-list/items` | `CreateShoppingListItemRequest` | **201** `ShoppingListResponse` (criado) / **200** quando `duplicateResolution: "sum-planned-quantity"` e o nome já existia (soma aplicada) | **409** `DuplicateItemErrorResponse` (com `reject`, default), **400** (nome ausente/só espaços; quantidade ≤ 0; preço < 0; unidade inválida), 401 |
| Editar item | `PATCH /api/shopping-list/items/{id}` | `UpdateShoppingListItemRequest` | **200** `ShoppingListResponse` | **409** `DuplicateItemErrorResponse` (nome colide com **outro** item ativo — conflito de edição, **sem** `duplicateResolution`/soma), **400** (validações acima), **404** (id inexistente/já removido), 401 |
| Excluir item | `DELETE /api/shopping-list/items/{id}` | — | **200** `ShoppingListResponse` (item fora) — **idempotente** | 401, 500 |
| Restaurar (Desfazer) | `POST /api/shopping-list/items/{id}/restore` | — | **200** `ShoppingListResponse` (item de volta com os mesmos dados) | **409** (nome retomado por outro item ativo), **404** (id nunca existiu), 401 |
| Marcar como comprado | `PUT /api/shopping-list/items/{id}/purchase` | `MarkItemPurchasedRequest` | **200** `ShoppingListResponse` (item comprado, **presente na lista**) | **400** (qualquer um dos três campos ausente/inválido), **404**, 401 |
| Desmarcar | `DELETE /api/shopping-list/items/{id}/purchase` | — | **200** `ShoppingListResponse` (item pendente, dados da compra limpos) — idempotente | **404**, 401 |
| Concluir a compra | `POST /api/shopping-list/checkout` | — (sem corpo; **sem mercado/data**) | **200** `ShoppingListResponse` (somente os não comprados) | 401, 500 |

Tipos (em `libs/contracts/src/http/shopping-list.ts`, re-exportados por
`@lista/contracts`):

```ts
export const ITEM_UNITS = ['unidade', 'kg', 'g', 'L', 'ml', 'pacote', 'caixa'] as const;
export type ItemUnit = (typeof ITEM_UNITS)[number];

export interface PurchasedDetails {
  quantity: number;   // > 0
  unit: ItemUnit;
  unitPrice: number;  // >= 0, R$
  purchasedAt: string; // ISO-8601
}

export interface ShoppingListItem {
  id: string;
  name: string;                       // como digitado (trim aplicado)
  plannedQuantity: number | null;     // opcional (RN-03)
  unit: ItemUnit | null;              // opcional
  plannedPrice: number | null;        // opcional
  purchased: PurchasedDetails | null; // presente ⇒ item comprado (segue na lista)
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListResponse { items: ShoppingListItem[] } // pendentes → comprados

export type DuplicateResolution = 'reject' | 'sum-planned-quantity'; // só na criação (CD-02)

export interface CreateShoppingListItemRequest {
  name: string;
  plannedQuantity?: number | null;
  unit?: ItemUnit | null;
  plannedPrice?: number | null;
  duplicateResolution?: DuplicateResolution; // default 'reject'; 'sum-planned-quantity' soma ao item existente
}

export interface UpdateShoppingListItemRequest {
  name?: string;                  // ausente = mantém o nome
  plannedQuantity?: number | null; // ausente = mantém; null = limpa
  unit?: ItemUnit | null;
  plannedPrice?: number | null;
  // Sem `duplicateResolution`: na edição o 409 é terminal (CD-13) — nada é somado.
}

export interface MarkItemPurchasedRequest {
  purchasedQuantity: number;
  unit: ItemUnit;
  unitPrice: number;
}

export interface DuplicateItemErrorResponse extends ApiErrorResponse {
  error: 'duplicate-item-name';
  duplicateOf: { id: string; name: string }; // usado na criação (pergunta) e na edição (conflito no formulário)
}
```

Mensagens PT do serviço (genéricas, sem detalhe interno): 400 → `"Nome do item é
obrigatório"`, `"Quantidade deve ser maior que zero"`, `"Preço não pode ser
negativo"`, `"Unidade inválida"`; 404 → `"Item não encontrado"`; 409 →
`"Já existe um item com esse nome"` (na **criação** acompanha `duplicateOf` e aceita
`duplicateResolution`; na **edição** é conflito terminal, sem soma — CD-13); 500 →
`"Erro interno"`. O `README` de `libs/contracts` documenta rotas, status e o 409
estendido **dos dois casos** (criação com soma; edição sem soma) — fonte única também
para o gateway futuro.

**CORS (ADR 0009):** `@fastify/cors` no serviço com `origin` =
`SHOPPING_LIST_CORS_ORIGINS` (default `http://localhost:4200`),
`methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS']`,
`allowedHeaders: ['Content-Type','Authorization']`. CORS não é controle de segurança:
a autorização é o JWT (ADR 0007).

**Não existe rota de histórico** nesta rodada (AC-21) — verificável por requisição
direta (404).

### Eventos

**Nenhum.** Concluir a compra não publica evento, não grava registro e não aciona
RabbitMQ (RN-16/AC-21). O `src/infrastructure/messaging/` do serviço permanece
esqueleto. O evento de conclusão da compra (ADR 0001) é contrato da **feature de
histórico** — não é criado, nem proposto como ADR, nesta rodada.

## Dados e ownership

- **Banco lógico `shopping_list`** (Postgres, já provisionado no Docker local —
  ADR 0004): pertence **exclusivamente** ao `shopping-list-service` (ADR 0001).
  Nenhum outro serviço lê esse banco; o `auth-service` é dono de `auth`. A PWA
  consome a lista só por HTTP. A exceção de acesso direto (ADR 0009) **não** muda
  ownership: nenhum outro serviço toca os dados da lista.
- **Tabela única `shopping_list_items`** (a lista ativa é a tabela; nesta rodada não
  existe entidade "lista" nem histórico — RN-01):

  | Coluna | Tipo | Notas |
  | --- | --- | --- |
  | `id` | `uuid` PK `gen_random_uuid()` | mesmo padrão do `users` do auth-service |
  | `name` | `text not null` | como digitado (trim) |
  | `name_normalized` | `text not null` | derivado no domínio (RN-02/CD-12); base da unicidade |
  | `planned_quantity` | `numeric(12,3) null` | > 0 quando presente (RN-06) |
  | `unit` | `text null` | uma das sete (validação na aplicação, não enum do PG) |
  | `planned_price` | `numeric(12,2) null` | ≥ 0, R$ |
  | `purchased_quantity` | `numeric(12,3) null` | obrigatórios em conjunto ao marcar |
  | `purchased_unit` | `text null` | |
  | `unit_price` | `numeric(12,2) null` | |
  | `purchased_at` | `timestamptz null` | `null` ⇒ pendente |
  | `removed_at` | `timestamptz null` | *soft delete* do excluir + Desfazer (AC-11) |
  | `created_at` / `updated_at` | `timestamptz not null` | `now()`; `updated_at` atualizado em cada mutação |

  **Unicidade (AC-09):** índice **único parcial** sobre `name_normalized`
  `where removed_at is null` — impede dois itens ativos com o mesmo nome mesmo por
  requisição direta ao serviço, e **libera** o nome de um item removido (permite
  excluir e recriar). O domínio continua validando antes (mensagem de negócio), e o
  banco é a garantia final.
- **Migração:** `drizzle-kit generate` → SQL versionado em
  `apps/shopping-list-service/src/infrastructure/persistence/drizzle/migrations/`;
  aplicação por `drizzle-kit migrate`, expostos como os targets
  `db:generate`/`db:migrate` do `project.json` (mesmo padrão do auth-service).
  `drizzle.config.ts` continua lendo `DATABASE_URL` (herança de nome — ADR 0009 §4).
- **Conclusão da compra** faz `DELETE` físico das linhas compradas: nenhum dado de
  compra (mercado/data/preço pago) fica armazenado ou consultável (AC-21). As linhas
  apenas marcadas como removidas pelo "Excluir" permanecem com os **dados planejados**
  (não são registro de compra) — ver "Riscos" para a limpeza futura.
- **Código compartilhado (não é dado):** `libs/contracts` (DTOs HTTP/eventos). A lib
  continua sem dependência de framework/banco e sem regra de negócio.
- **Segredos:** nenhum novo. A chave **pública** do JWT já vem do `.env` local
  (`AUTH_JWT_PUBLIC_KEY_B64`, ADR 0007); `.env.example` só recebe
  `SHOPPING_LIST_CORS_ORIGINS` (valor local não sensível).

## Revisão arquitetural

- **Obrigatória:** **não** — nesta rodada há **um único serviço** backend
  (`shopping-list-service`) e a PWA; **não** há contrato entre serviços, **não** há
  evento/mensageria e **não** há alteração de ownership de dados (o banco
  `shopping_list` já pertence a este serviço desde a ADR 0004). Pelos critérios do
  processo (mais de um serviço, contrato entre serviços, evento, mudança de
  ownership) nenhum se aplica. A **ADR 0009** é decisão de arquitetura, mas de
  *acesso* (exceção temporária à ADR 0001), não de integração entre serviços: ela é
  registrada, tem escopo/critérios de saída/dono e está fechada neste plano — sem
  decisão em aberto.
- **Recomendado (opcional, não bloqueante):** se o usuário quiser segunda opinião
  sobre a ADR 0009 e o desenho do contrato PWA↔serviço, o orquestrador pode acionar o
  `architecture-review` **antes** da implementação, com escopo só nesses dois pontos.
  Não é pré-requisito de gate.
- Parecer: não aplicável (`docs/features/shopping-list/ARCHITECTURE-REVIEW.md` não é
  exigido nesta rodada).
- Estado: não aplicável.

## Estratégia de testes

Pré-requisitos: `npm run docker:up` para os testes de integração do serviço e
`npx nx run shopping-list-service:db:migrate` (banco lógico `shopping_list`). O E2E de
UI é **hermético** (não exige Docker, banco, chaves ou seed) e permanece herméticos
após esta feature.

Camadas (o `test-engineer` audita e completa em T-15/T-16; os devs escrevem os testes
próximos da mudança, sem `passWithNoTests`):

- **`shopping-list-service` (Vitest)**
  - *Unit (domínio/aplicação, sem HTTP/banco)*: `normalizeItemName` (`café`=`CAFE`=
    `cafe `; `cebola branca` ≠ `cebola`), validações (nome, quantidade > 0, preços ≥ 0,
    unidade), soma de quantidade, marcar/desmarcar, ordem pendentes→comprados,
    seleção do que sai na conclusão (AC-20), casos de uso com repositório fake
    (na **criação** a soma ao item existente; na **edição** o conflito com outro item
    ativo **não soma e não aplica** — item inalterado, CD-13; renomear para o próprio
    nome normalizado aplica).
  - *Integração (módulo Nest + Fastify `inject` + JWT de teste)*: cada rota no
    caminho de sucesso e de erro (201/200/400/404/409/401), envelope canônico, 409 da
    **criação** com `duplicateOf` e `duplicateResolution: "sum-planned-quantity"`, 409
    da **edição** (`PATCH`) como conflito terminal **sem** soma (item inalterado),
    CORS/preflight da origem da PWA, idempotência de `DELETE` e de `DELETE …/purchase`.
  - *Persistência (Postgres local)*: migração aplicada; **índice único parcial**
    barrando duplicata por inserção direta (AC-09); duplicata por chamada HTTP direta
    → 409 **sem** criar segundo item (AC-09); estado sobrevive a nova leitura
    (AC-24); conclusão **não** deixa registro nem evento e **não** existe rota de
    histórico (AC-21).
- **`web` (Vitest, `@angular/build:unit-test`)**: store/API (URLs, headers,
  payloads, single-flight, erro sem estado fantasma, timer de undo com fake timers),
  tela e estados (skeleton/vazio/erro/lista, ordem, alvos ≥44px), sheets (validação
  local sem requisição, prefill, aviso de divergência; **criação**: duplicidade como
  fluxo com pergunta/soma; **edição**: 409 como conflito no formulário, sem soma),
  toasts (auto-dismiss ≈4s; erro persistente), bottom nav (abas sem rota), shell
  (título/ações por rota; "Sair" preservado).
- **E2E (Playwright, `apps/web-e2e`)**: 6 jornadas herméticas com contrato
  interceptado e store em memória tipado por `@lista/contracts`
  (`apps/web-e2e/src/support/`), comando `npx nx e2e web-e2e` (filtro por jornada:
  `npx nx e2e web-e2e -- --grep "duplicidade"`). Pelo menos uma jornada afirma que a
  PWA chama `http://localhost:3000/api/shopping-list` **com** `Authorization` (ADR
  0009 + interceptor) — o E2E é também a prova da chamada direta registrada na ADR.
- **Regressão obrigatória:** a suíte E2E existente do auth (`apps/web-e2e/src/app.spec.ts`)
  precisa continuar verde depois da mudança do shell (T-09/T-11) — logout, `.app-bar`
  e rota `**` autenticada não podem regredir.
- Regras do repo: sem `any` (lint é gate), sem cor/espaço hardcoded (tokens), sem
  `passWithNoTests`, `git status` antes de cada commit (lições do setup).

## Matriz AC ↔ E2E

Superfície de UI = sim ⇒ todo AC observável na UI tem ≥1 cenário Playwright.
Jornadas (não um teste por AC), em `apps/web-e2e/src/shopping-list/`:

| AC | Observável na UI? | Cenário Playwright (arquivo / título) | Evidência não-E2E (se AC só backend) |
| --- | --- | --- | --- |
| AC-01 | sim | `load.spec.ts` — "abre na Lista: app bar com título, coluna única e bottom nav com Lista ativa e Histórico/Menor preço desabilitadas que não navegam" | — |
| AC-02 | sim | `load.spec.ts` — "primeira carga mostra skeleton na forma da lista (sem spinner) e depois a lista" | unit (store: estado `loading`) |
| AC-03 | sim | `load.spec.ts` — "lista vazia mostra empty state com CTA primary Adicionar item" | — |
| AC-04 | sim | `items.spec.ts` — "adiciona item só com o nome: aparece pendente com opcionais vazios" | unit (form) |
| AC-05 | sim | `items.spec.ts` — "salvar sem nome/só com espaços: erro no campo e nenhuma requisição" | unit (form) |
| AC-06 | sim | `items.spec.ts` — "unidade oferece exatamente as 7 opções, sem digitação livre (item e compra)" | unit (contrato `ITEM_UNITS`) |
| AC-07 | sim | `duplicates.spec.ts` — "`cafe`/`Café`: pergunta somar; confirmar soma e mantém um item; recusar mantém o form com o digitado" | integração (`409` direto, AC-09) |
| AC-08 | sim | `duplicates.spec.ts` — "editar para um nome existente: conflito visível no formulário, a edição **não** é aplicada e **nada** é somado; renomear para o próprio nome aplica" | integração (409 terminal no PATCH, item inalterado) |
| AC-09 | **não** | — (coberto indiretamente em AC-07/AC-08) | **integração**: `npx nx test shopping-list-service` — POST duplicado direto → 409 sem criar segundo item + índice único parcial no banco |
| AC-10 | sim | `items.spec.ts` — "editar planejados e salvar atualiza a linha" | unit (form/store) |
| AC-11 | sim | `delete-undo.spec.ts` — "excluir sai na hora; Desfazer restaura com os mesmos dados (inclusive comprado); sem desfazer permanece excluído" | integração (`DELETE`/`restore`) |
| AC-12 | sim | `purchase.spec.ts` — "marcar com os 3 campos: item comprado com `line-through` e alvo ≥44px, **continua na lista**" | unit (render) |
| AC-13 | sim | `purchase.spec.ts` — "sem um dos campos obrigatórios: erro no campo e nenhuma requisição de marcação" | unit (form) |
| AC-14 | sim | `purchase.spec.ts` — "quantidade diferente avisa e só marca após confirmar; sem quantidade planejada não avisa" | unit (sheet) |
| AC-15 | sim | `purchase.spec.ts` — "pré-preenche quantidade/unidade planejadas e deixa o preço por unidade vazio" | unit (sheet) |
| AC-16 | sim | `purchase.spec.ts` — "desmarcar volta a pendente e reabrir preserva os digitados; recarregar usa o prefill de AC-15" | unit (store/sheet) |
| AC-17 | sim | `purchase.spec.ts` — "item comprado continua podendo ser editado e excluído" | unit (ações) |
| AC-18 | sim | `load.spec.ts` — "com pendentes e comprados, os pendentes aparecem primeiro" | integração (ordem do serviço) |
| AC-19 | sim | `checkout.spec.ts` — "resumo N saem/M permanecem; confirmar remove só os comprados + toast; cancelar mantém a lista" | unit (store) |
| AC-20 | sim | `checkout.spec.ts` — "concluir sem itens comprados mantém a lista exatamente como estava" | integração (nada gravado) |
| AC-21 | parcial (resumo não pede mercado/data) | `checkout.spec.ts` — "o resumo não pede mercado nem data" | **integração**: nenhuma tabela/rota de histórico (404) e nenhum evento publicado |
| AC-22 | sim | `load.spec.ts` — "falha ao carregar: erro visível na área + Tentar novamente recarrega e exibe a lista" | unit (store) |
| AC-23 | sim | `items.spec.ts` + `purchase.spec.ts` — "falha de rede ao salvar/marcar/concluir: toast persistente, digitado preservado, sem estado fantasma" | unit (store) |
| AC-24 | sim | `checkout.spec.ts` — "adicionar/editar/marcar/excluir e **recarregar a PWA**: estado mantido (GET refeito no serviço; nada em `localStorage`)" | **integração** com Postgres (persistência real) |
| AC-25 | sim | `load.spec.ts` — "viewport 360px e desktop (`--container-max`), tema claro e escuro, uma única primary, alvos ≥44px, `:focus-visible` visível" | checklist de design do `VALIDATION.md` |
| AC-26 | sim | `items.spec.ts` — "duplo toque no Salvar: rótulo `Salvando…`, botão desabilitado e **1** requisição" | unit (single-flight) |

## Riscos e trade-offs

- **E2E hermético (contrato interceptado) × E2E full-stack.** O padrão da feature de
  autenticação é hermético; mantido aqui. Prova a jornada de UI e que a PWA fala com
  `http://localhost:3000/api/shopping-list`, mas **não** prova as regras do serviço —
  essas ficam com a integração real (Postgres). A paridade é ancorada nos tipos
  compartilhados de `libs/contracts` + integração do serviço. Um E2E full-stack
  exigiria Docker + migração + chaves RS256 + seed e um token real (o serviço rejeita
  JWT falso), o que tornaria a suíte dependente do `.env` local — piora a
  reprodutibilidade. Evolução futura possível, registrada como opção.
- **Precisão numérica.** `numeric(12,3)` (quantidades) e `numeric(12,2)` (preços), com
  números em JSON e vírgula/ponto aceitos na entrada da PWA (RN-06). Dinheiro como
  número é simplificação de v1 (o correto a longo prazo seria centavos inteiros ou
  string decimal); o arredondamento é determinístico no banco. Nenhuma operação desta
  rodada soma preços, então o risco de ponto flutuante é mínimo.
- **"Desfazer" precisa de ida à rede.** O `DELETE` é imediato no serviço (a linha sai
  da lista ativa) e o `restore` é uma segunda chamada; se a restauração falhar
  (rede/409 por nome retomado), a PWA mostra toast de erro persistente e recarrega a
  lista (AC-23, sem fantasma). Se o app for fechado dentro dos ≈4s, o item permanece
  excluído — coerente com "excluído imediatamente".
- **Linhas *soft-deleted* não são coletadas.** Itens excluídos com Desfazer ficam com
  `removed_at` (dados planejados, invisíveis na API e liberados para reuso do nome).
  Limpeza/expurgo é tarefa de infra futura; nenhum impacto observável no produto e
  nenhum dado de compra envolvido (a conclusão usa `DELETE` físico).
- **Nomes de variáveis legados.** `API_PORT`/`DATABASE_URL` seguem como estão
  (ADR 0006 §4/ADR 0009 §4) para não quebrar `.env` e compose de quem já desenvolve;
  `SHOPPING_LIST_*` vale para variáveis novas. Dívida registrada, não bloqueante.
- **Shell com ações contribuídas pela rota.** O app bar passa a aceitar título/ações
  da rota ativa (a ação "Concluir compra" pertence à tela Lista, e o "Sair" precisa
  continuar existindo inclusive na rota `**` — regressão barrada pelo E2E do auth).
  Alternativa descartada: mover o app bar para dentro da tela, o que quebraria o
  logout nas rotas autenticadas e o E2E existente. Custo: uma indireção pequena e
  testada.
- **`libs/ui-web` fica intocada.** As primitivas de UI vão para
  `apps/web/src/app/ui/` porque `libs/ui-web` é um scaffold sem target de teste nem
  configuração de Vitest; extrair para lá agora adicionaria infraestrutura de teste
  sem consumidor (a extração é refatoração futura, quando houver segundo consumidor).
  Alternativa registrada se o usuário preferir o caminho inverso.
- **Cadeia sequencial no front.** T-11→T-12→T-13→T-14 tocam
  `features/shopping-list/shopping-list-page.*` (estado e wiring dos sheets): são
  **sequenciais por definição**, não paralelizáveis.
- **Aviso de divergência é da PWA.** AC-14 (aviso antes de confirmar a marcação) é
  comportamento de tela (CD-03); o serviço registra o que recebe. Se no futuro o
  aviso precisar ser regra de servidor (ex.: outro cliente), isso é nova spec.
- **Paralelismo e arquivos compartilhados.** `.env.example`/`README` (T-07) e
  `libs/contracts` (T-02) são pontos únicos de edição; `app.module.ts` do serviço é
  tocado só por T-06. Nenhuma tarefa paralela compartilha arquivo (ver "Ordem e
  paralelismo").
- **Testes de integração dependem do Docker local** (`npm run docker:up` +
  `db:migrate`), mesmo padrão da feature de autenticação; documentado no README (T-07)
  e no comando de T-15.

## Tarefas

Cada tarefa tem um agente, arquivos permitidos, dependências, comando de teste e
evidência esperada. Preferência por tarefas pequenas (um módulo ou responsabilidade
estreita). A ADR 0009 foi redigida nesta fase de plano (arquivo já criado) e T-01
apenas confere consistência com a ADR 0006 e o `.env.example`, versionando a decisão
junto do plano.

| ID | ACs | Agente | Descrição | Arquivos permitidos | Depende de | Testes/comandos | Evidência esperada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | — (arquitetura; habilita os ACs de contrato) | backend-dev | **ADR 0009** (exceção temporária à ADR 0001 para o `shopping-list-service`) + nota de ampliação na ADR 0006 §1/Consequências. Conferir escopo, base URL `http://localhost:3000`, CORS (`SHOPPING_LIST_CORS_ORIGINS`), critérios de saída e dono da migração; conferir com `TEMPLATE-adr.md` e com `.env.example` | `docs/decisions/**` | — | revisão de doc (`git diff docs/decisions`); sem suíte | ADR no formato do template (Status/Data/Contexto/Decisões/Consequências) com escopo, base URL, CORS, critérios de saída e dono; ADR 0006 apontando para a 0009 |
| T-02 | AC-04–AC-24 (base dos contratos) | backend-dev | **Contratos HTTP** em `libs/contracts`: `ITEM_UNITS`/`ItemUnit`, `ShoppingListItem`/`PurchasedDetails`, `ShoppingListResponse`, requests de criar/editar/marcar, `DuplicateItemErrorResponse` (o `UpdateShoppingListItemRequest` **sem** `duplicateResolution`, CD-13); exports em `http/index.ts`; README com rotas, status (200/201/400/401/404/409/500), envelope canônico e o 409 estendido **nos dois casos** (criação com pergunta/soma; edição como conflito terminal sem soma) | `libs/contracts/src/http/shopping-list.ts`, `libs/contracts/src/http/index.ts`, `libs/contracts/README.md` | — | `npx nx build contracts`; `npx nx lint contracts` | build/lint verdes; README documentando cada operação e o 409 com `duplicateOf` **distinguindo criação e edição** |
| T-03 | AC-05, AC-06, AC-07, AC-08, AC-09, AC-11, AC-12, AC-16, AC-18, AC-20, AC-21 (regras no domínio) | backend-dev | **Domínio puro**: entidade `ShoppingListItem`, `normalizeItemName` (trim + remoção de diacríticos + minúsculas), validações (nome obrigatório; quantidade > 0; preços ≥ 0; unidade na lista), soma de quantidade planejada, marcar/desmarcar, ordem pendentes→comprados, seleção do que sai na conclusão + specs | `apps/shopping-list-service/src/domain/**` | T-02 | `npx nx test shopping-list-service -- domain` | specs verdes: `café`=`CAFE`=`cafe ` (RN-02/CD-12) e `cebola branca` ≠ `cebola`; quantidade 0/negativa rejeitada; unidade fora da lista rejeitada; ordem e seleção da conclusão |
| T-04 | AC-09, AC-11, AC-24 | backend-dev | **Persistência**: schema Drizzle `shopping_list_items` + **índice único parcial** (`name_normalized` `where removed_at is null`), migração versionada, port `ShoppingListRepository` e adaptador Drizzle; targets `db:generate`/`db:migrate` no `project.json` | `apps/shopping-list-service/src/infrastructure/persistence/**`, `apps/shopping-list-service/src/application/ports/**`, `apps/shopping-list-service/project.json` | T-03 | `npx nx run shopping-list-service:db:generate`; `npx nx run shopping-list-service:db:migrate` (com `npm run docker:up`) | SQL versionado contendo o índice único parcial; migração aplicada sem erro no banco `shopping_list` |
| T-05 | AC-07, AC-08, AC-09, AC-11, AC-12, AC-16, AC-19, AC-20, AC-21, AC-24 | backend-dev | **Casos de uso** (framework-free) sobre o port: obter lista; criar item com `sum-planned-quantity` (soma ao existente, sem criar segundo item — CD-02); editar (**no conflito com outro item ativo o caso de uso não soma nem aplica**: retorna conflito deixando o item inalterado — CD-13; renomear para o próprio nome normalizado aplica); excluir/restaurar (recusa 409 se o nome estiver tomado); marcar/desmarcar; concluir (remove só comprados; nada gravado/publicado) + specs com repositório fake | `apps/shopping-list-service/src/application/use-cases/**`, `apps/shopping-list-service/src/application/index.ts` | T-03, T-04 | `npx nx test shopping-list-service -- use-cases` | specs verdes por caso de uso (criação soma sem criar segundo item; **edição em conflito não soma e não aplica**, item inalterado; renomear para o próprio nome aplica; restauração com os mesmos dados; conclusão sem comprados) |
| T-06 | AC-02, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09, AC-10, AC-11, AC-12, AC-13, AC-19, AC-20, AC-21, AC-22, AC-23, AC-24 | backend-dev | **Borda HTTP**: controller `shopping-list` com as 8 rotas do contrato, validação defensiva → 400, mapeamento 404/409 (`duplicate-item-name` + `duplicateOf`)/500 canônico, respostas = lista ativa completa; **o 409 do `PATCH` (edição) é conflito terminal — sem `duplicateResolution`/soma (CD-13)**, enquanto o 409 do `POST /items` (criação) aceita `duplicateResolution: "sum-planned-quantity"`; `shopping-list.module.ts`; `configure-app.ts` (prefixo `api` + CORS `SHOPPING_LIST_CORS_ORIGINS`) e `main.ts` usando-o; import no `AppModule` | `apps/shopping-list-service/src/api/http/shopping-list/**`, `apps/shopping-list-service/src/app/app.module.ts`, `apps/shopping-list-service/src/app/configure-app.ts`, `apps/shopping-list-service/src/main.ts` | T-02, T-04, T-05 | `npx nx test shopping-list-service -- http`; `npx nx build shopping-list-service` | integração `inject` com JWT de teste verde: sucesso por rota; 400 (nome vazio, quantidade 0, preço negativo, unidade inválida); 409 da criação com `duplicateOf` e soma via `duplicateResolution`; **409 do `PATCH` sem soma, item inalterado**; 404; 401 sem token; preflight CORS da origem `http://localhost:4200`; rota de histórico inexistente (404) |
| T-07 | — (infra/doc) | backend-dev | **Env e docs**: `SHOPPING_LIST_CORS_ORIGINS` no `.env.example` (comentada, default `http://localhost:4200`) e README com base URL local/ADR 0009, Docker obrigatório e comandos `db:generate`/`db:migrate` | `.env.example`, `README.md` | — | revisão de doc (sem suíte) | `.env.example` com a variável documentada; README com os comandos e a base URL |
| T-08 | AC-25, AC-23, AC-11 (toast com ação) | angular-dev | **Primitivas de UI** em `apps/web/src/app/ui/`: `bottom-sheet` (foco preso, fecha com botão e `Esc`, `--radius-xl`, backdrop `--color-overlay`), `toast` (host + service: auto-dismiss ≈4s nas confirmações, **erro permanece até o descarte**, ação opcional "Desfazer"), ícones inline SVG (sem dependência nova, `currentColor`, `aria-hidden` no SVG + `aria-label` no botão) | `apps/web/src/app/ui/**` | — | `npx nx test web` | specs verdes: auto-dismiss com fake timers; erro não fecha; sheet fecha com `Esc`/botão; nenhuma cor/espaço hardcoded |
| T-09 | AC-01, AC-25 | angular-dev | **Shell autenticado**: `bottom-nav` com as três abas (Lista ativa em `--color-primary-text`; Histórico/Menor preço inativas com "em breve", **sem rota**) + app bar com título `Lista de compras` (`--font-size-h2`) e **ações contribuídas pela rota** via `ShellChromeService` (signals), preservando o botão "Sair" | `apps/web/src/app/layout/**` | T-08 | `npx nx test web`; `npx nx e2e web-e2e` (regressão) | specs de shell/nav verdes (abas desabilitadas não navegam) e **E2E do auth continua verde** |
| T-10 | AC-02, AC-11, AC-19, AC-22, AC-23, AC-24, AC-26 | angular-dev | **Camada de dados da PWA**: `SHOPPING_LIST_API_BASE_URL` (ADR 0009), `ShoppingListApiService` tipado por `@lista/contracts`, store com signals (estados `loading/loaded/error`, itens, operações com *single-flight*, erro que preserva o digitado e não deixa fantasma, timer de undo de 4s, conclusão) | `apps/web/src/app/core/shopping-list/**`, `apps/web/src/app/features/shopping-list/data/**`, `apps/web/src/app/features/shopping-list/state/**` | T-02 | `npx nx test web` | specs verdes: URL/header/payload por operação (incl. `Authorization` na base `localhost:3000`); estado de erro; undo cancela o restore; **1** requisição por envio |
| T-11 | AC-01, AC-02, AC-03, AC-12, AC-18, AC-22, AC-24, AC-25 | angular-dev | **Tela Lista**: rota `''` → `ShoppingListPage` (remover placeholder `features/home`), ação de ícone **Concluir compra** (`aria-label`) na app bar, apoio "N pendentes · M comprados", **skeleton** na primeira carga, **empty state** rico com CTA primary "Adicionar item", lista em coluna única na ordem do serviço, linha com marcar ≥44px + metadados, comprado com `line-through`/`--color-ink-faint`, **erro de carga + "Tentar novamente"**, conteúdo reservando a bottom nav | `apps/web/src/app/features/shopping-list/shopping-list-page.*`, `apps/web/src/app/features/shopping-list/item-row.*`, `apps/web/src/app/app.routes.ts`, `apps/web/src/app/features/home/**` (remoção) | T-08, T-09, T-10 | `npx nx test web`; `npx nx e2e web-e2e` (regressão) | specs dos 4 estados/ordem/alvo ≥44px verdes; E2E do auth sem regressão |
| T-12 | AC-04, AC-05, AC-06, AC-07, AC-08, AC-10, AC-23, AC-25, AC-26 | angular-dev | **Sheet de item (adicionar/editar) + duplicidade**: nome obrigatório, opcionais (quantidade/unidade/preço), unidade em `<select>` com as **7 opções** (sem digitação livre), validação local que **não envia** requisição, `Salvar` com `Salvando…` + disabled; **na criação**, sheet "somar quantidade?" (confirmar = soma via `duplicateResolution`; recusar = nada muda, form aberto com o digitado); **na edição**, o 409 **não** abre sheet de somar: mostra o conflito visível no formulário ("Já existe um item com esse nome"), **não aplica** e **não soma** (item inalterado, corrigir o nome ou cancelar), aplicando normalmente quando o nome é o próprio normalizado (CD-13); erros em campo com `aria-invalid`/`aria-describedby` e toast persistente em falha de rede | `apps/web/src/app/features/shopping-list/item-form-sheet.*`, `apps/web/src/app/features/shopping-list/shopping-list-page.*` (wiring) | T-11 | `npx nx test web` | specs verdes por AC (inclusive "salvar sem nome não faz requisição"; criação trata o 409 como fluxo com pergunta/soma; **edição trata o 409 como conflito no formulário, sem soma e sem aplicar**) |
| T-13 | AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-23, AC-26 | angular-dev | **Sheet de marcar/desmarcar comprado**: três campos obrigatórios, prefill de quantidade/unidade planejadas e **preço por unidade vazio**, validação local sem requisição, **aviso de divergência** antes de confirmar (não avisa sem quantidade planejada), desmarcar devolvendo a pendente e **preservando na tela os digitados**; item comprado segue editável/excluível | `apps/web/src/app/features/shopping-list/purchase-sheet.*`, `apps/web/src/app/features/shopping-list/shopping-list-page.*` (wiring) | T-12 | `npx nx test web` | specs verdes (prefill, divergência, sem divergência, desmarcar preserva digitados, duplo toque = 1 requisição) |
| T-14 | AC-11, AC-17, AC-18, AC-19, AC-20, AC-21 (UI), AC-23 | angular-dev | **Ações do item + excluir/Desfazer + concluir compra**: sheet de ações (Marcar/Desmarcar, Editar, Excluir — ações secundárias fora da linha), excluir imediato com toast **"Desfazer"** (≈4s; desfazer restaura pelo serviço; falha = rollback + toast persistente) e sheet de conclusão com **resumo** (quantos saem/permanecem), confirmar remove só comprados + toast, cancelar não muda nada, **sem campos de mercado/data** | `apps/web/src/app/features/shopping-list/item-actions-sheet.*`, `apps/web/src/app/features/shopping-list/checkout-sheet.*`, `apps/web/src/app/features/shopping-list/shopping-list-page.*` (wiring) | T-13 | `npx nx test web` | specs verdes (undo restaura; falha do delete sem fantasma; resumo 0/N; cancelar mantém) |
| T-15 | AC-09, AC-21, AC-24 + contrato de AC-04–AC-13, AC-19, AC-20 | test-engineer | **Auditoria de testes do backend**: unit (domínio/casos de uso) + integração com **Postgres local** (`inject` + JWT de teste): 409 por chamada HTTP direta sem criar duplicata (`Café`×`cafe`, com espaços), índice único parcial no banco, conclusão **não** grava registro nem publica evento e **não** existe rota de histórico, persistência real entre leituras, status/envelope por rota | `apps/shopping-list-service/**` | T-06 | `npx nx test shopping-list-service` (com `npm run docker:up` + `npx nx run shopping-list-service:db:migrate`) | suíte verde + mapa `AC → teste` no handoff, sem lacuna de contrato |
| T-16 | AC-01–AC-08, AC-10–AC-20, AC-22, AC-23, AC-25, AC-26 (camada unitária) | test-engineer | **Auditoria/completude dos testes unitários da PWA**: tela (4 estados, ordem, alvos), sheets (validações locais sem requisição, prefill, divergência, duplicidade), store (single-flight, undo, erro), toasts, shell/nav — com fake timers onde couber | `apps/web/**` | T-14 | `npx nx test web` | suíte verde + mapa `AC → teste` no handoff |
| T-17 | Todos os ACs observáveis na UI (AC-01–AC-08, AC-10–AC-20, AC-22–AC-26) | test-engineer | **E2E Playwright** em `apps/web-e2e`: helpers (`support/session.ts` — sessão/JWT fake; `support/shopping-list-fake-api.ts` — store em memória **tipado por `@lista/contracts`**, que exige `Authorization` e serve reload) e as 6 jornadas da matriz — em `duplicates.spec.ts` a jornada cobre **criação** (pergunta/soma em `cafe`/`Café`) e **edição** (conflito visível no formulário, **sem** soma e **sem** aplicar; renomear para o próprio nome aplica); afirmar a base `http://localhost:3000/api/shopping-list` em ≥1 jornada; manter `playwright.config.mts` sem novo `webServer` (hermético) | `apps/web-e2e/**` | T-14, T-16 | `npx nx e2e web-e2e` (filtro por jornada: `npx nx e2e web-e2e -- --grep "duplicidade"`) | **suíte verde** com a saída do comando registrada no handoff; matriz AC ↔ E2E coberta |

### Ordem e paralelismo (para o orquestrador)

Máximo de **duas** tarefas simultâneas, sempre com arquivos disjuntos. T-11→T-12→T-13→T-14
são **sequenciais** (compartilham `features/shopping-list/shopping-list-page.*`).

- **Onda 1:** T-01 (docs/decisions) ∥ T-02 (libs/contracts).
- **Onda 2:** T-03 (dep T-02) ∥ T-07 (`.env.example`/README).
- **Onda 3:** T-04 (dep T-03) ∥ T-08 (`apps/web/src/app/ui`).
- **Onda 4:** T-05 (dep T-03/T-04) ∥ T-09 (dep T-08).
- **Onda 5:** T-06 (dep T-02/T-04/T-05) ∥ T-10 (dep T-02).
- **Onda 6:** T-11 (dep T-08/T-09/T-10) ∥ T-15 (dep T-06 — backend × web, disjuntos).
- **Onda 7:** T-12 (dep T-11) — sozinha.
- **Onda 8:** T-13 (dep T-12) — sozinha.
- **Onda 9:** T-14 (dep T-13) — sozinha.
- **Onda 10:** T-16 (dep T-14) — sozinha.
- **Onda 11:** T-17 (dep T-14/T-16) — sozinha.

Após cada T concluída com testes verdes, o orquestrador comita (Conventional
Commits, `T-XX`) antes de delegar a próxima.

## Decisões

- **ADR 0009** (`docs/decisions/0009-excecao-temporaria-ao-gateway-shopping-list-service.md`,
  criada nesta fase): exceção temporária à ADR 0001 para a PWA chamar o
  `shopping-list-service` em `http://localhost:3000`; escopo (só a lista ativa desta
  rodada), CORS local (`SHOPPING_LIST_CORS_ORIGINS`, métodos e headers acima),
  critérios de saída (URL relativa, CORS removido, base deprecada) e dono da migração
  (feature "API Gateway"). A **ADR 0006 §1** ganhou nota apontando para a 0009 (a
  exceção deixou de ser exclusiva do auth-service).
- **CD-13 (decidida com o usuário em 2026-10-13; referencia a decisão da
  `SPEC.md`):** na **edição**, renomear um item para um nome que já existe em **outro**
  item ativo **não aplica** a mudança — o item permanece exatamente como estava (nome e
  demais campos originais), **nada é somado** a nenhum item e **não há** pergunta de
  somar quantidade; o conflito é **visível no formulário** ("Já existe um item com esse
  nome"). Renomear para o **próprio** nome normalizado (`cafe` → `café` do mesmo item)
  não é conflito e a edição é aplicada. A **criação** mantém o comportamento de
  **CD-02/AC-07** (pergunta "somar?" com `duplicateResolution: 'sum-planned-quantity'` e
  soma ao item existente). O 409 do `PATCH` é **terminal e sem soma**.
- **Contrato:** toda mutação devolve a **lista ativa completa** (estado no serviço,
  RN-19/AC-24); 409 de duplicidade traz `error: "duplicate-item-name"` +`duplicateOf`;
  na **criação** é **fluxo** e a resolução é do serviço (`duplicateResolution`, o
  cliente nunca normaliza nomes), na **edição** é **conflito terminal sem soma**
  (CD-13); `PATCH` usa "ausente = manter / `null` = limpar".
- **Dados:** uma tabela (`shopping_list_items`) é a lista ativa; unicidade por
  **índice único parcial** sobre `name_normalized` (`where removed_at is null`); o
  excluir usa *soft delete* (`removed_at`) para o "Desfazer" e a conclusão usa
  `DELETE` **físico** dos comprados (AC-21 — nada de compra armazenado).
- **Eventos:** nenhum nesta rodada (RN-16/AC-21); `messaging` permanece esqueleto; o
  evento de conclusão é contrato da feature de histórico.
- **Autenticação:** inalterada — guard global + validação local do JWT (ADR 0007);
  **novas** variáveis do serviço usam `SHOPPING_LIST_*`, e `API_PORT`/`DATABASE_URL`
  seguem como herança do primeiro serviço (ADR 0009 §4).
- **PWA:** primitivas de UI em `apps/web/src/app/ui/` (não em `libs/ui-web`, scaffold
  sem target de teste); app bar do shell aceita título/ações da rota via
  `ShellChromeService` (preserva o "Sair" e o E2E existente); ícones em SVG inline
  (nenhuma dependência nova).
- **Testes:** E2E hermético (contrato interceptado + store em memória tipado por
  `@lista/contracts`), com o E2E afirmando a chamada direta a `http://localhost:3000`;
  regras de serviço provadas por integração real com Postgres; regressão da suíte
  E2E de autenticação é gate de T-09/T-11.
- **Revisão arquitetural:** não obrigatória nesta rodada (single-service, sem
  contrato entre serviços, sem evento, sem mudança de ownership); opcional e não
  bloqueante, limitada à ADR 0009 e ao contrato PWA↔serviço.

## Gate do plano

- [x] Todas as tarefas referenciam ao menos um `AC-*` ou justificam trabalho técnico
      (T-01 e T-07 são arquitetura/infra, justificadas na própria descrição).
- [x] Tarefas preferem escopo pequeno e cada uma declara comando de teste (T-01/T-07
      são revisão de documentação, sem suíte aplicável — declarado).
- [x] `Superfície de UI: sim` está declarada com justificativa (ADR 0008).
- [x] Matriz AC ↔ E2E completa para todo AC observável na UI e tarefa Playwright
      (T-17) com comando `npx nx e2e web-e2e` (ou filtro) como evidência esperada.
- [x] Dependências, arquivos permitidos, testes e evidências estão explícitos
      (incl. ordem e paralelismo, no máximo duas tarefas simultâneas).
- [x] Contratos e ownership estão definidos (contrato HTTP completo, tipos em
      `libs/contracts`, banco lógico `shopping_list` de dono exclusivo do serviço,
      Eventos: nenhum).
- [x] Revisão arquitetural avaliada: **não obrigatória** nesta rodada, com motivo
      declarado (opcional não bloqueante registrada).
- [x] Não há decisão de comportamento, contrato ou arquitetura em aberto (ADR 0009
      criada; **CD-13** confirmada com o usuário em 2026-10-13 — criação segue em
      CD-02/AC-07).
- [x] Artefato contém a frase canônica `Aprovado pelo usuário em 2026-10-13`
      (registrada em `**Aprovação do usuário:**`; status `Aprovado`).

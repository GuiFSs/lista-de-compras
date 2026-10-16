# contracts

Lib de **contratos de integração** do monorepo: tipos de transporte HTTP e de
eventos, fonte única compartilhada entre microserviços e PWA. Os tipos são
apenas de borda (DTOs) — não contêm regra de negócio nem dependem de
framework, banco ou broker.

## Building

Run `nx build contracts` to build the library.

## Contratos HTTP — auth-service: `POST /api/auth/login`

Endpoint **público** (não exige token) do auth-service, porta
`AUTH_API_PORT=3001`, chamado diretamente pela PWA (exceção temporária à ADR
0001, registrada na ADR 0006). Tipos em `src/http/auth.ts`, re-exportados por
`@lista/contracts`.

### Request (JSON)

```json
{ "username": "string", "password": "string" }
```

Campos obrigatórios (RN1): página não-string, ausente ou vazia → **400**.

### 200 OK — `LoginSuccessResponse`

```json
{
  "accessToken": "<JWT RS256>",
  "tokenType": "Bearer",
  "expiresIn": 86400
}
```

- `accessToken`: JWT assinado em **RS256** com claims `JwtClaims`
  (`sub` uuid · `iss` (`AUTH_JWT_ISSUER`, default `auth-service`) · `iat` ·
  `exp` = `iat + 86400`), válido por **24h** (RN11/AC-13).
- `tokenType`: sempre `"Bearer"` — a PWA envia o token no header
  `Authorization: Bearer <jwt>`.
- `expiresIn`: validade em segundos (**86400**), correspondente ao `exp` do
  JWT.

### Erros — envelope canônico único `ApiErrorResponse` (400/401/429/500)

Todos os erros usam **um único shape**:

```json
{ "statusCode": 400, "message": "string", "error": "string (opcional)" }
```

- `statusCode` e `message` são **garantidos**; `error` é **opcional** (nome
  curto do tipo de erro) e **nunca é dependido pelos clientes** — a PWA
  consome apenas `statusCode` e `message` (decisão 🟠-1).
- `message` é sempre genérica, em PT.
- Nenhum corpo contém a senha (AC-10); o corpo do **500 nunca expõe detalhes
  internos** — detalhes vão apenas para o log do servidor.

| Status | Significado | `message` (PT, genérica) |
| --- | --- | --- |
| 400 | Payload inválido (campos ausentes, não-string ou vazios) | `Nome de usuário e senha são obrigatórios` |
| 401 | Credenciais inválidas (genérico; não distingue usuário inexistente de senha errada) | `Credenciais inválidas` |
| 429 | Limite de tentativas com falha atingido na janela (RN13/AC-14) + header `Retry-After: <segundos>` | `Muitas tentativas de login. Aguarde e tente novamente.` |
| 500 | Erro interno não previsto (ex.: banco indisponível) | `Erro interno` |

> 429 vale **antes** da validação de credenciais: mesmo com credenciais
> corretas, o login é bloqueado até a janela expirar (AC-14).

## Contratos HTTP — shopping-list-service

Operações da **lista de compras ativa** do shopping-list-service, porta
`API_PORT=3000`, prefixo global `api`. A PWA chama o serviço **diretamente** em
`http://localhost:3000` (exceção temporária à ADR 0001, registrada na ADR
0009). Tipos em `src/http/shopping-list.ts`, re-exportados por
`@lista/contracts`.

**Todas** as rotas exigem sessão: o serviço valida o JWT localmente (RS256) e
responde **401 uniforme** `{ "statusCode": 401, "message": "Não autorizado" }`
(ADR 0007) quando o token está ausente ou inválido — CORS não é controle de
segurança.

**Toda mutação responde a lista ativa completa** (`ShoppingListResponse`): o
estado relevante vive no serviço e a PWA não recombina estado no cliente. A
lista vem **pendentes primeiro, comprados depois** (dentro de cada grupo, pela
criação — RN-18).

### Unidades — `ITEM_UNITS` / `ItemUnit`

```ts
['unidade', 'kg', 'g', 'L', 'ml', 'pacote', 'caixa'] as const
```

Lista única compartilhada entre serviço e PWA (RN-05/AC-06): a unidade, quando
informada, é sempre uma dessas sete — nenhum cliente envia valor livre.

### Operações

| Operação | Rota | Request | Sucesso (corpo `ShoppingListResponse`) | Erros |
| --- | --- | --- | --- | --- |
| Obter a lista ativa | `GET /api/shopping-list` | — | **200** | 401, 500 |
| Criar item | `POST /api/shopping-list/items` | `CreateShoppingListItemRequest` | **201** (criado) / **200** quando `duplicateResolution: "sum-planned-quantity"` e o nome já existia (soma aplicada) | 400, 401, **409** |
| Editar item | `PATCH /api/shopping-list/items/{id}` | `UpdateShoppingListItemRequest` | **200** | 400, 401, 404, **409** |
| Excluir item | `DELETE /api/shopping-list/items/{id}` | — | **200** (item fora) — **idempotente** | 401, 500 |
| Restaurar (Desfazer) | `POST /api/shopping-list/items/{id}/restore` | — | **200** (item de volta com os mesmos dados) | 401, **404**, **409** |
| Marcar como comprado | `PUT /api/shopping-list/items/{id}/purchase` | `MarkItemPurchasedRequest` | **200** (item comprado, **presente na lista**) | 400, 401, 404 |
| Desmarcar | `DELETE /api/shopping-list/items/{id}/purchase` | — | **200** (item pendente, dados da compra limpos) — **idempotente** | 401, 404 |
| Concluir a compra (≥1 comprado) | `POST /api/shopping-list/checkout` | `CheckoutShoppingListRequest` `{ market, purchaseDate }` | **200** (somente os não comprados permanecem) | **400**, 401, 500 |
| Concluir a compra (0 comprados) | `POST /api/shopping-list/checkout` | corpo omitido ou `{}` | **200** (lista inalterada) | 401, 500 |

Notas de comportamento:

- **Concluir com ≥1 comprado** exige `market` (trim, não vazio) e
  `purchaseDate` (`YYYY-MM-DD`, ≤ hoje). Faz `DELETE` físico dos comprados e
  grava o outbox do evento na mesma transação; a resposta **200** não depende
  do broker. Mensagens 400: `"Mercado é obrigatório"`,
  `"Data da compra é obrigatória"`, `"Data da compra não pode ser futura"`,
  `"Data da compra inválida"`.
- **Concluir sem comprados:** sem mercado/data; sem outbox/evento; lista igual.
- **`PATCH` usa "ausente = manter / `null` = limpar"** nos campos opcionais
  (RN-03). O request **não** tem `duplicateResolution` (ver 409 de edição).
- **`PUT .../purchase`** exige os três campos (`purchasedQuantity` > 0, `unit`
  válido, `unitPrice` >= 0); `purchased` passa a vir preenchido no item.
  **`DELETE .../purchase`** devolve o item a pendente e limpa os dados da
  compra no serviço.

### Erros — envelope canônico `ApiErrorResponse` (400/401/404/409/500)

Mesmo envelope da feature de auth:

```json
{ "statusCode": 400, "message": "string", "error": "string (opcional)" }
```

- `statusCode` e `message` são **garantidos**; `message` é genérica, em PT, e
  nunca expõe detalhe interno. O corpo do **500** nunca traz stack/detalhe.
- `error` é opcional e **não** deve ser dependido pelos clientes — exceto no 409
  de duplicidade, que usa `error` como discriminante identificável (abaixo).

| Status | Significado | `message` (PT, genérica) |
| --- | --- | --- |
| 400 | Payload inválido (nome ausente/só espaços; quantidade <= 0; preço < 0; unidade fora de `ITEM_UNITS`; checkout com mercado vazio / data ausente, futura ou inválida) | `Nome do item é obrigatório` · `Quantidade deve ser maior que zero` · `Preço não pode ser negativo` · `Unidade inválida` · `Mercado é obrigatório` · `Data da compra é obrigatória` · `Data da compra não pode ser futura` · `Data da compra inválida` |
| 401 | Sessão ausente/inválida (uniforme — ADR 0007) | `Não autorizado` |
| 404 | `id` inexistente ou já removido | `Item não encontrado` |
| 409 | Nome já existente (duplicidade) — ver abaixo | `Já existe um item com esse nome` |
| 500 | Erro interno não previsto | `Erro interno` |

- Corpo **não interpretável como JSON** responde 400 com a mensagem genérica
  `Corpo da requisição inválido` (mesmo padrão do auth-service) — nunca a
  mensagem técnica em inglês do parser do Fastify.

### 409 de duplicidade — `DuplicateItemErrorResponse`

Além do envelope canônico, o 409 de duplicidade traz `error:
"duplicate-item-name"` e `duplicateOf: { id, name }` (o `name` é o canônico do
item existente):

```json
{
  "statusCode": 409,
  "message": "Já existe um item com esse nome",
  "error": "duplicate-item-name",
  "duplicateOf": { "id": "<uuid>", "name": "Café" }
}
```

O mesmo corpo vale nos **dois** contextos, mas com semânticas diferentes:

- **Criação (`POST /api/shopping-list/items`) — fluxo.** É o caminho esperado
  quando o nome já existe: a PWA pergunta "somar quantidade?" usando
  `duplicateOf.name` (sem toast de erro). Confirmando, reenvia o `POST` com
  `duplicateResolution: "sum-planned-quantity"` e o serviço localiza o item
  existente pela normalização do nome e **soma** a quantidade planejada
  informada (sem quantidade informada, o existente fica como está). Recusando,
  nada muda. A normalização do nome é sempre do **serviço** — o cliente nunca
  normaliza nem faz aritmética.
- **Edição (`PATCH /api/shopping-list/items/{id}`) — conflito terminal
  (CD-13).** Renomear para um nome já usado por **outro** item ativo responde
  409 **sem** `duplicateResolution` e **sem somar**: o item permanece
  exatamente como estava e a PWA mostra o conflito **no formulário**, para
  corrigir o nome ou cancelar. Renomear para o **próprio** nome normalizado
  (`cafe` → `café` do mesmo item) **não** é conflito e é aplicado.

## Contratos HTTP — price-history-service

Operações de **histórico de compras** e **menor preço** do
`price-history-service`, porta `PRICE_HISTORY_API_PORT=3002`, prefixo global
`api`. A PWA chama o serviço **diretamente** em `http://localhost:3002`
(exceção temporária à ADR 0001, registrada na ADR 0010). Tipos em
`src/http/price-history.ts`, re-exportados por `@lista/contracts`.

**Todas** as rotas exigem JWT (guard global, ADR 0007) — **401** uniforme
`{ "statusCode": 401, "message": "Não autorizado" }`.

**CORS (ADR 0010):** `@fastify/cors` com `PRICE_HISTORY_CORS_ORIGINS` (default
`http://localhost:4200`), `methods: ['GET','OPTIONS']`,
`allowedHeaders: ['Content-Type','Authorization']`.

### Operações

| Operação | Rota | Request | Sucesso | Erros |
| --- | --- | --- | --- | --- |
| Listar compras | `GET /api/price-history/purchases` | — | **200** `PurchaseListResponse` | 401, 500 |
| Detalhe | `GET /api/price-history/purchases/{id}` | — | **200** `PurchaseDetailResponse` | **404**, 401, 500 |
| Menores preços | `GET /api/price-history/lowest-prices` | query opcional `q` | **200** `LowestPricesResponse` | 401, 500 |

Tipos principais:

- `PurchaseListItem` / `PurchaseListResponse` — lista (mais recente primeiro);
  `id` = `completionId`.
- `PurchaseDetailResponse` / `PurchaseItem` — detalhe com itens (`unit`:
  `ItemUnit`; `unitPrice` em R$).
- `LowestPriceItem` / `LowestPricesResponse` — agregação por
  `nameNormalized`; ordenação estável asc; busca `q` filtra por substring
  normalizada.

Envelope de erro: mesmo `ApiErrorResponse` (`statusCode` + `message` PT).
404 de detalhe: compra inexistente.

## Contratos de eventos

### `shopping-list.purchase-completed` v1

Tipos e constantes em `src/events/shopping-list.ts`, re-exportados por
`@lista/contracts`.

| Campo | Valor |
| --- | --- |
| **Tipo** | `shopping-list.purchase-completed` (`PURCHASE_COMPLETED_EVENT_TYPE`) |
| **Versão** | `1` (`PURCHASE_COMPLETED_EVENT_VERSION`) |
| **Routing key** | `shopping-list.purchase-completed.v1` (`PURCHASE_COMPLETED_ROUTING_KEY`) |
| **Exchange** | `domain.events` (topic, durable) |
| **Fila** | `price-history.shopping-list.purchase-completed` |
| **Produtor** | `shopping-list-service` (outbox → RabbitMQ) |
| **Consumidor** | `price-history-service` (idempotente por `payload.completionId`) |

Envelope `PurchaseCompletedEventV1`:

```ts
{
  eventId: string;       // UUID da mensagem
  eventType: 'shopping-list.purchase-completed';
  eventVersion: 1;
  occurredAt: string;    // ISO-8601
  payload: {
    completionId: string;
    market: string;
    purchaseDate: string; // YYYY-MM-DD
    items: { name, quantity, unit, unitPrice }[];
  };
}
```

**Quando publica:** checkout bem-sucedido com ≥1 comprado (gravação no outbox
na conclusão; publicação assíncrona).
**Quando não publica:** 0 comprados; checkout com 400.
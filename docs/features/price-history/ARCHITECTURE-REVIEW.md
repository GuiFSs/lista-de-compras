# Revisão arquitetural — Histórico de preços

**Plano:** `docs/features/price-history/PLAN.md`  
**Revisor:** architecture-review  
**Data:** 2026-10-16  
**Resultado:** Aprovada com ressalvas

## Limites de serviço

- **`shopping-list-service`** — dono da lista ativa e do *fato* de conclusão:
  valida mercado/data no checkout, remove comprados, grava intenção de
  publicar no **outbox** do próprio banco e publica
  `shopping-list.purchase-completed` v1. Não persiste histórico de preços nem
  lê o banco `price_history`.
- **`price-history-service`** (novo) — dono exclusivo do histórico: consome o
  evento (ingest idempotente), persiste compras/itens e expõe só **leitura**
  HTTP (listar compras, detalhe, menores preços / busca). Não lê o banco
  `shopping_list` (AC-17 / ADR 0001).
- **`web` (PWA)** — UX de checkout (mercado/data), Histórico e Menor preço;
  chama `shopping-list-service` (ADR 0009) e `price-history-service`
  (ADR 0010 / CD-04) **diretamente** enquanto o gateway não existir. Não é
  dona de nenhum banco de domínio.
- **RabbitMQ** — transporte do fato de domínio; não é dono de dados de negócio.
  Já provisionado no compose (estado real confirmado).

Não há serviço novo além do `price-history-service` já previsto na ADR 0001.
Não se introduz gateway, broker alternativo nem agregador HTTP nesta rodada.

## Propriedade dos dados

| Dado | Dono | Observação |
| --- | --- | --- |
| Itens da lista ativa | `shopping-list-service` (`shopping_list`) | DELETE físico dos comprados no checkout (inalterado em espírito) |
| `outbox_messages` | `shopping-list-service` (mesmo DB) | Intenção de publicar; não é histórico |
| Compras / itens de preço | `price-history-service` (`price_history`) | PK da compra = `completionId` |
| Contratos tipados | `libs/contracts` | Só DTOs HTTP + envelope do evento; sem ORM/domínio compartilhado |

Confirmado no desenho: **nenhum** serviço lê ou grava o banco alheio (AC-17).
Escrita do histórico **somente** via consumo do evento; leitura pela PWA só no
`price-history-service`. Alternativa “expor histórico pelo shopping-list” foi
corretamente descartada na ADR 0010.

Estado real alinhado ao plano: `apps/price-history-service` ainda não existe;
mensageria do shopping-list é esqueleto (`export {}`); banco lógico
`price_history` já provisionado no Docker.

## Contratos de integração

### HTTP

- **Checkout (evolução)** — `POST /api/shopping-list/checkout`:
  `{ market, purchaseDate }` obrigatório com ≥1 comprado; corpo omitido/`{}`
  sem comprados; 400 de validação (mercado vazio, data futura/ausente/inválida);
  200 com lista restante **independente** do broker (CD-06). Tipos em
  `libs/contracts` (T-02).
- **Histórico (novo)** — sob `/api/price-history/*`, porta `3002`
  (`PRICE_HISTORY_API_PORT`), JWT local (ADR 0007), CORS só `GET`/`OPTIONS`
  (ADR 0010):
  - `GET /api/price-history/purchases`
  - `GET /api/price-history/purchases/{id}`
  - `GET /api/price-history/lowest-prices?q=`
- **Acesso PWA** — `http://localhost:3002` (ADR 0010, status **Proposta**):
  escopo só consulta; critérios de saída e migração para gateway explícitos;
  espelha o espírito das ADRs 0006/0009. Consistente com CD-04 / AC-21.

### Eventos

| Campo | Valor |
| --- | --- |
| Nome / tipo | `shopping-list.purchase-completed` |
| Versão | `1` (`eventVersion: 1`) |
| Produtor | `shopping-list-service` (outbox → RabbitMQ) |
| Consumidor | `price-history-service` |
| Exchange | `domain.events` (topic, durable) |
| Routing key | `shopping-list.purchase-completed.v1` |
| Fila | `price-history.shopping-list.purchase-completed` (durable) |
| Entrega | **at-least-once** (outbox + retry no produtor; ack após persistência no consumidor) |
| Idempotência | `payload.completionId` (UUID); unique em `purchases.id` |
| Payload (negócio) | `completionId`, `market`, `purchaseDate`, `items[]` (name, quantity, unit, unitPrice) |

Envelope versionável em `libs/contracts/src/events/…` — adequado como fonte
única produtor ↔ consumidor ↔ testes. Publica só com ≥1 comprado e checkout
válido; não publica em 0 comprados / 400 (ADR 0002 / RN-09).

## Riscos operacionais

### Dual-write e outbox (CD-06)

- O risco clássico (lista commitada sem mensagem, ou mensagem sem commit) é
  **mitigado** pelo outbox no **mesmo** banco da lista, desde que a gravação do
  outbox e a remoção dos comprados ocorram na **mesma transação Postgres**.
- O plano já coloca a transação como caminho principal; a formulação
  “ou sequência atômica equivalente” enfraquece a garantia — ver ressalvas.
- Falha do **broker**: HTTP do checkout permanece 200; publisher com retry até
  `published_at` — alinhado a CD-06 / AC-05. Histórico eventualmente
  consistente; UX já especifica atraso possível.

### Ordem de entrega

- At-least-once **não** garante ordem global entre conclusões distintas se
  houver paralelismo no publisher. Na v1 (um login compartilhado, baixa
  concorrência de checkout) o risco é baixo.
- Ordem de negócio da lista de histórico é `purchase_date` (+ `created_at` de
  ingestão). Empate de nome de exibição no menor preço usa “compra mais
  recente” — se dois eventos forem processados fora de ordem, o rótulo de
  empate pode divergir do instante real do checkout; **não** afeta o valor
  mínimo nem a idempotência. Aceitável na v1; documentar como best-effort.

### Consumidor e falhas

- Reentrega do mesmo `completionId` → no máximo um registro (AC-16): desenho
  correto (unique + early-return).
- Plano cobre ack após sucesso; convém explicitar nack/requeue em falha
  transitória (e que poison message na v1 pode ficar em retry + log, sem DLQ
  obrigatória) — ressalva operacional, não mudança de limites.

### Outros

- Fuso “hoje” UTC×BRT perto da meia-noite: já documentado no plano; risco baixo.
- CORS e terceira base URL local: dívida temporária registrada na ADR 0010;
  sai com a feature Gateway.
- Duplicação de `normalizeItemName` entre serviços: correta sob hexagonal;
  paridade via specs (CD-05).

## Decisões e ADRs

- **ADR 0001** — respeitada: serviços separados, RabbitMQ, histórico por evento,
  sem leitura cross-DB.
- **ADR 0002** — mercado/data na conclusão; sem evento se 0 comprados; R$;
  normalização de nomes (acentos reforçados por CD-05 no domínio do histórico).
- **ADR 0006 / 0009** — precedente de exceção ao gateway; ADR 0010 é a terceira
  exceção nominal (T-01 anota §1 da 0006).
- **ADR 0007** — JWT local na borda do `price-history-service`.
- **ADR 0010** (Proposta) — **endossada** arquiteturalmente: porta 3002, CORS
  GET/OPTIONS, escopo só leitura, critérios de saída e prefixo
  `PRICE_HISTORY_*`. Aprovação formal do usuário junto ao `PLAN.md`.

Nenhuma ADR adicional além da 0010 é necessária para esta feature.

## Ressalvas (não bloqueantes; incorporar no PLAN antes de T-11/T-12)

1. **Outbox transacional estrito** — no PLAN, remover “ou sequência atômica
   equivalente”; exigir: `DELETE` dos comprados + `INSERT` em
   `outbox_messages` na **mesma** transação Postgres. Sem isso o dual-write
   volta.
2. **Política do consumidor** — uma frase no PLAN/T-09: ack só após ingest
   bem-sucedida; falha transitória → nack/requeue; reentrega coberta pela
   idempotência por `completionId`. DLQ opcional fora da v1.
3. **Ordem** — documentar que a fila assume consumo single-active / ordem
   FIFO best-effort; ordenação de produto privilegiada por `purchase_date`.
4. **Processo** — o PLAN ainda diz “revisão após aprovação do usuário”; o
   gate SDD exige o parecer **antes/com** a aprovação. Este artefato fecha
   essa pendência: o usuário pode aprovar o plano **já** com o parecer em
   mãos. Ajustar o texto do PLAN/STATUS na aprovação.

## Pendências bloqueantes

- **Nenhuma.** Limites, ownership, contrato do evento v1, outbox/retry,
  idempotência por `completionId`, HTTP e ADR 0010 estão coerentes com a SPEC
  e as ADRs vigentes. As ressalvas acima são esclarecimentos documentais /
  operacionais — não reabrem arquitetura nem CD-01…CD-07.

## Gate

- [x] Ownership de dados está explícito.
- [x] Integrações não acessam banco de outro serviço.
- [x] Contratos estão documentados e versionáveis.
- [x] Falhas e idempotência foram consideradas quando aplicável.
- [x] Não há pendência bloqueante.

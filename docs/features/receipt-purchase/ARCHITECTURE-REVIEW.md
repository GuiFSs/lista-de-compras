# Revisão arquitetural — Importar compra pela foto da nota

**Plano:** `docs/features/receipt-purchase/PLAN.md`  
**Revisor:** architecture-review  
**Data:** 2026-10-29  
**Resultado:** Aprovada

## Limites de serviço

- **`shopping-list-service`** — dono da lista ativa; recebe a imagem;
  reconhece via porta `ReceiptRecognizer` (adaptador Gemini); aplica create/
  update + mark purchased em lote (replace); checkout inalterado publica o
  evento existente.
- **`price-history-service`** — consome `shopping-list.purchase-completed`
  como hoje; **nenhuma** mudança de contrato nesta feature.
- **Gemini (externo)** — só o adaptador do shopping-list-service; a PWA não
  chama Google.
- **Sem** novo microserviço de IA nesta rodada (ADR 0012).

## Propriedade dos dados

- Itens da lista / purchased → `shopping_list` (PostgreSQL do shopping-list).
- Histórico de compras → somente após checkout, via evento → banco do
  price-history.
- Imagem da nota → **não** é dado persistido (processar e descartar).
- Sem leitura cruzada de bancos.

## Contratos de integração

- HTTP novos (versionados em `libs/contracts`):
  - `POST /api/shopping-list/receipts/recognize` (multipart)
  - `POST /api/shopping-list/receipts/apply` (JSON → `ShoppingListResponse`)
- Acesso PWA: ADR **0013** (ampliação da 0009).
- Eventos: **nenhum novo**; reutiliza `shopping-list.purchase-completed` v1.

## Riscos operacionais

- Cota/timeout Gemini → 502/503; lista intacta no recognize; apply não
  depende de Gemini.
- Tamanho de imagem → limite + 413.
- Nomes truncados de cupom → revisão humana obrigatória (SPEC); matching só
  por normalização existente.
- Free tier / política de dados Google → documentado na ADR 0012; troca de
  adaptador se necessário.

## Decisões e ADRs

- ADR **0012** — Gemini Vision + porta hexagonal + segredo em env.
- ADR **0013** — paths `/receipts/*` na exceção gateway.
- ADR 0001/0002/0007/0008/0009 permanecem.

## Pendências bloqueantes

- nenhuma

## Gate

- [x] Ownership de dados está explícito.
- [x] Integrações não acessam banco de outro serviço.
- [x] Contratos estão documentados e versionáveis.
- [x] Falhas e idempotência foram consideradas quando aplicável.
- [x] Não há pendência bloqueante.

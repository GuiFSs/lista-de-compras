# ADR 0013 — Ampliação da exceção ao gateway: receipts no shopping-list-service

**Status:** Aceita
**Data:** 2026-10-29

## Contexto

- A ADR 0009 autoriza a PWA a chamar o `shopping-list-service` diretamente
  em `/api/shopping-list/*` para operações da lista ativa, **enquanto o
  gateway não existir**.
- A ADR 0009 §1 limita o escopo nominal e exige **nova decisão registrada**
  para operação fora desse escopo.
- A feature `receipt-purchase` adiciona `POST .../receipts/recognize` e
  `POST .../receipts/apply` no **mesmo** serviço e prefixo — ainda sem
  gateway.

## Decisões

1. **Ampliar** a exceção da ADR 0009 para incluir explicitamente:
   - `POST /api/shopping-list/receipts/recognize`
   - `POST /api/shopping-list/receipts/apply`
2. Continua a chamada direta `SHOPPING_LIST_API_BASE_URL` (porta 3000), CORS
   e JWT local (ADR 0007) como na 0009.
3. **Critérios de saída** permanecem os da ADR 0009 §3 (feature API Gateway):
   URL relativa via gateway; remoção do CORS; deprecação da base absoluta.
4. Não autoriza chamada da PWA a APIs Google nem a outros serviços além dos
   já cobertos por ADRs 0006/0009/0010/0011.

## Consequências

- Escopo nominal da exceção PWA→shopping-list fica documentado e alinhado à
  SPEC `receipt-purchase`.
- Nenhuma mudança de ownership: recognize/apply pertencem ao dono da lista;
  histórico continua só via checkout + evento.

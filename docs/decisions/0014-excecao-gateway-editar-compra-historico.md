# ADR 0014 — Exceção temporária ao gateway para editar compra no histórico

**Status:** Aceita
**Data:** 2026-11-07

## Contexto

- A ADR 0001 faz do `price-history-service` o dono exclusivo dos registros de
  compra concluída. Depois do checkout, a lista ativa não guarda mais esses
  itens. Corrigir uma compra é, portanto, uma escrita nesse serviço — não no
  `shopping-list-service` e não uma releitura do banco da lista.
- A ADR 0010 autorizou a PWA a chamar o `price-history-service` direto só para
  **consulta**. O texto original diz que a escrita do histórico continua pelo
  evento RabbitMQ. A ADR 0011 acrescentou o drill-down, também de leitura, e
  manteve a regra: operação nova fora desse escopo exige decisão registrada.
- Republicar `shopping-list.purchase-completed` não serve para a correção. O
  consumidor trata o `completionId` como idempotente: o mesmo evento não
  atualiza o registro que já existe.
- O menor preço não é uma coluna. Ele é agregado na leitura
  (`aggregateLowestPrices` / `aggregateLowestPricesByItem`). Gravar a compra
  corrigida faz a consulta seguinte usar os valores novos, sem evento entre
  serviços.
- O gateway continua no backlog. Sem ele, a PWA precisa chamar o PATCH direto,
  na mesma base `http://localhost:3002` das leituras.

## Decisões

- A exceção temporária do `price-history-service` passa a incluir
  `PATCH /api/price-history/purchases/{id}`, com JWT validado na borda
  (ADR 0007), no mesmo host e prefixo `/api` da ADR 0010.
- O CORS do serviço aceita também `PATCH`, além de `GET` e `OPTIONS`. Origem
  e headers continuam os da ADR 0010 (`PRICE_HISTORY_CORS_ORIGINS`,
  `Content-Type` e `Authorization`).
- Não há evento novo. A lista ativa não é atualizada. O `id` da compra
  (o `completionId` original) e `createdAt` não mudam.
- A ADR 0010 não é reescrita. Ela permanece como o registro do que foi
  decidido em 2026-10-16. A §1 dela recebe uma nota de ponte para esta ADR,
  no mesmo molde da ADR 0011.
- Os critérios de saída continuam os da ADR 0010 §3: quando o gateway
  existir, esta rota vai junto com as leituras, e o CORS sai.

## Consequências

- A PWA em `http://localhost:4200` consegue salvar a edição contra
  `http://localhost:3002`. Sem `PATCH` no CORS, o navegador bloquearia a
  chamada mesmo com o JWT válido.
- Qualquer outra escrita direta da PWA nesse serviço (por exemplo, excluir a
  compra) continua exigindo decisão nova.
- A agregação de menor preço não ganha caminho de gravação. Testes do
  serviço provam que, depois do PATCH, a leitura devolve o vencedor novo.

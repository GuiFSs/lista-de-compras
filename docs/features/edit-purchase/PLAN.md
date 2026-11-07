# Plano técnico — Editar compra concluída

**Status:** Aprovado
**Spec:** `docs/features/edit-purchase/SPEC.md`
**Última atualização:** 2026-11-07
**Aprovação do usuário:** Aprovado pelo usuário em 2026-11-07

## Contexto

A pessoa corrige uma compra já gravada no histórico. O `price-history-service`
é o dono do registro. O menor preço continua agregado na leitura; o PATCH só
precisa deixar a compra correta para a consulta seguinte escolher outro
vencedor quando a edição exigir.

## Superfície de UI

- **Superfície de UI:** sim
- **Justificativa:** o detalhe do Histórico ganha a ação Editar e um
  formulário. AC-01 a AC-10 são observáveis na tela (ADR 0008).

## Abordagem

1. Contrato `UpdatePurchaseRequest` e documentação da rota.
2. Validação de domínio que produz a compra atualizada (`id` e `createdAt`
   preservados) e testes da agregação em cima do registro editado.
3. Coluna `position` em `purchase_items`, update em transação e caso de uso.
4. `PATCH` na borda, com CORS aceitando o método (ADR 0014).
5. Sheet no detalhe e jornada Playwright. O fake do E2E aceita o PATCH e, só
   depois de um PATCH aceito, recalcula o menor preço semeado a partir das
   compras — a regra em si permanece provada no serviço.

## Contratos

- HTTP: `PATCH /api/price-history/purchases/{id}` em
  `libs/contracts/src/http/price-history.ts`. Corpo
  `UpdatePurchaseRequest`. 200 `PurchaseDetailResponse`. 400 com envelope
  canônico. 401 e 404 iguais aos das leituras.
- Eventos: nenhum.

## Dados e ownership

- Banco `price_history`, tabelas `purchases` e `purchase_items`. Dono
  inalterado (ADR 0001).
- `purchases.market` e `purchases.purchase_date` são atualizados.
  `created_at` não.
- `purchase_items.position` (inteiro, não nulo) guarda a ordem do formulário.
  Itens já existentes recebem a posição pela ordem atual de `id`, que é a
  ordem em que o detalhe os mostra hoje.
- A substituição das linhas é uma transação: atualiza a compra, apaga os
  itens e reinsere na ordem enviada.

## Revisão arquitetural

- Obrigatória: não. Um serviço, o dono dos dados não muda, não há evento
  nem contrato entre serviços. A exceção de gateway está na ADR 0014.
- Parecer: não aplicável
- Estado: não aplicável

## Estratégia de testes

- Unitários: validação da edição; agregação depois de preço que sobe, preço
  que passa a vencer, linha removida, linha renomeada e linha incluída;
  caso de uso com repositório em memória; formulário e store na PWA.
- Integração: `inject` do PATCH (200, 400, 401, 404) e CORS com `PATCH`.
  Repositório Drizzle quando o Postgres de desenvolvimento estiver no ar.
- E2E Playwright: `apps/web-e2e/src/price-history/edit-purchase.spec.ts`,
  comando `npx nx e2e web-e2e -- --grep "editar compra"`.

### Matriz AC ↔ E2E

| AC | Observável na UI? | Cenário Playwright | Evidência não-E2E |
| --- | --- | --- | --- |
| AC-01 | sim | `edit-purchase.spec.ts` — "editar preço que era o menor e ver o outro mercado em Menor preço" | unit do sheet (prefill) |
| AC-02 | sim | o mesmo cenário (detalhe atualizado, mesmo id na URL) | HTTP 200 |
| AC-03 | sim | "incluir linha e remover outra; zero itens e nome repetido não salvam" | unit do domínio |
| AC-04 | sim | o mesmo cenário | unit do sheet |
| AC-05 | sim | o mesmo cenário | unit do domínio |
| AC-06 | sim | "data futura e mercado vazio não enviam a edição" | unit do domínio e do sheet |
| AC-07 | sim | "editar preço que era o menor…" e abertura do drill-down | agregação no serviço |
| AC-08 | sim | "subir o preço vencedor, renomear e incluir item atualizam Menor preço" | agregação no serviço |
| AC-09 | sim | "mudar só a quantidade de quem não vence deixa Menor preço igual" | agregação no serviço |
| AC-10 | sim | "falha de rede ao salvar preserva o formulário" | — |
| AC-11 | não | — | caso de uso (`createdAt`) e ausência de chamada à lista no E2E |

## Riscos e trade-offs

- O E2E não sobe o `price-history-service`. O fake recalcula só depois do
  PATCH para a tela mostrar o vencedor novo; a cadeia de desempate oficial
  continua nos testes de domínio.
- Itens ingeridos antes da coluna `position` precisam do backfill. Sem ele,
  a ordem do detalhe mudaria no primeiro deploy da migração.
- Última escrita vence. Não há trava de concorrência: o casal usa o mesmo
  login e a spec não pediu versão.

## Tarefas

| ID | ACs | Agente | Descrição | Arquivos permitidos | Depende de | Testes/comandos | Evidência esperada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | — | product-spec | Spec, status, plano, ADR 0014, ponte na ADR 0010 e nota no escopo | `docs/features/edit-purchase/**`, `docs/decisions/0010-*`, `docs/decisions/0014-*`, `docs/product/initial-scope.md` | — | revisão dos gates | frase canônica nos dois artefatos |
| T-02 | AC-02 | backend-dev | Tipo `UpdatePurchaseRequest` e README da rota | `libs/contracts/src/http/price-history.ts`, `libs/contracts/README.md` | T-01 | `npx nx build contracts` e `npx nx lint contracts` | build e lint verdes |
| T-03 | AC-05, AC-06, AC-07, AC-08, AC-09, AC-11 | backend-dev | Validar e aplicar a edição no domínio; provar a agregação nos casos que mudam o vencedor | `apps/price-history-service/src/domain/update-purchase.ts`, `apps/price-history-service/src/domain/update-purchase.spec.ts`, `apps/price-history-service/src/domain/index.ts` | T-02 | `npx nx test price-history-service -- --testPathPattern update-purchase` | specs verdes |
| T-04 | AC-02, AC-03, AC-04, AC-11 | backend-dev | `position`, `update` no port e no Drizzle, caso de uso | `apps/price-history-service/src/infrastructure/persistence/**`, `apps/price-history-service/src/application/**` | T-03 | `npx nx test price-history-service -- --testPathPattern update-purchase.use-case` | caso de uso verde; migração versionada |
| T-05 | AC-02, AC-06, AC-10 | backend-dev | Controller PATCH, mensagens 400 e CORS | `apps/price-history-service/src/api/**`, `apps/price-history-service/src/app/configure-app.ts` | T-04 | `npx nx test price-history-service -- --testPathPattern price-history.controller` | 200/400/401/404 e preflight com PATCH |
| T-06 | AC-01–AC-06, AC-10 | angular-dev | Sheet no detalhe, cliente HTTP e store | `apps/web/src/app/features/price-history/**`, `apps/web/src/app/core/price-history/**` | T-02 | `npx nx test web -- --testPathPattern "edit-purchase-sheet\|history-detail-page\|price-history-store\|price-history-api"` | specs verdes |
| T-07 | AC-01–AC-11 | test-engineer | Jornada Playwright e PATCH no fake | `apps/web-e2e/src/price-history/edit-purchase.spec.ts`, `apps/web-e2e/src/support/price-history-fake-api.ts` | T-06 | `npx nx e2e web-e2e -- --grep "editar compra"` | suíte filtrada verde |

Execução sequencial. Nenhuma dupla tem arquivos disjuntos o bastante para
paralelismo seguro: T-04 e T-05 compartilham o módulo HTTP indiretamente
pelo caso de uso, e a UI depende do contrato.

## Decisões

- ADR 0014. Sem revisão arquitetural entre serviços.

## Gate do plano

- [x] Todas as tarefas referenciam ao menos um `AC-*` ou justificam trabalho técnico.
- [x] Tarefas preferem escopo pequeno e cada uma declara comando de teste.
- [x] `Superfície de UI: sim` está declarada com justificativa.
- [x] Matriz AC ↔ E2E completa e tarefa Playwright com comando `npx nx e2e web-e2e`.
- [x] Dependências, arquivos permitidos, testes e evidências estão explícitos.
- [x] Contratos e ownership estão definidos.
- [x] Revisão arquitetural não é obrigatória e o motivo está registrado.
- [x] Não há decisão de comportamento, contrato ou arquitetura em aberto.
- [x] Artefato contém a frase canônica `Aprovado pelo usuário em 2026-11-07`.

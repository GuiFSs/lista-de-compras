# Revisão arquitetural — Menor preço por mercado

**Plano:** `docs/features/lowest-price-by-market/PLAN.md`
**Spec:** `docs/features/lowest-price-by-market/SPEC.md` (aprovada em 2026-10-19)
**Revisor:** architecture-review
**Data:** 2026-10-19
**Resultado:** Aprovada com ressalvas

> **Escopo desta revisão:** o `PLAN.md` (17 tarefas, 11 ondas), a `SPEC.md` e o
> **estado real do código** da v1 (contratos, serviço, PWA e E2E), conferido
> arquivo por arquivo. A **ADR 0011 ainda não existe** (`docs/decisions/` vai até
> a 0010): esta revisão avalia o **escopo exigido** de T-01 (operação nova na
> exceção ao gateway + ponte na ADR 0010 §1) e as obrigações que dele decorrem —
> o **texto** da ADR é conferido na implementação. Este parecer não cria a ADR.

## Limites de serviço

- **`price-history-service`** — segue **dono exclusivo** do banco lógico
  `price_history` (RN-01/ADR 0001). A feature **acrescenta só leitura**: a
  agregação item × mercado, o agrupamento, a ordenação e o desempate ficam no
  **domínio do serviço** (RN-12), atrás do port `PurchaseRepository`
  (`apps/price-history-service/src/application/ports/purchase-repository.port.ts:20-35`)
  e do adaptador Drizzle
  (`…/infrastructure/persistence/drizzle/repository/purchase.repository.ts`).
  Ingestão, consumidor e persistência **não mudam**.
- **`shopping-list-service`** — **inalterado**. Nenhuma tarefa do plano toca
  `apps/shopping-list-service/**`; a suíte é rodada em T-14 apenas como
  **regressão**. Confirmado que nada do serviço de lista importa os tipos de
  menor preço (grep por `LowestPrice|lowest-prices` não retorna ocorrências em
  `apps/shopping-list-service`).
- **`web` (PWA)** — consome e **renderiza**; não calcula. O plano mantém a PWA
  fora da regra de negócio (T-11/T-12/T-13): o store guarda os **grupos** do
  serviço e a tela exibe a ordem recebida (hoje o store já aplica a resposta sem
  cálculo — `apps/web/src/app/features/price-history/state/price-history-store.ts:143-150`).
- **Sem serviço, broker, banco, índice ou padrão distribuído novo.** A feature
  é consulta/UI sobre dados que a v1 já persiste; alinhado à skill
  `microservice-architecture` ("não introduza novo serviço/broker/banco sem
  necessidade").

## Propriedade dos dados

| Dado | Dono | Observação |
| --- | --- | --- |
| `purchases` / `purchase_items` | `price-history-service` (`price_history`) | mercado, data, quantidade, unidade e preço por unidade **já persistidos** pela v1 |
| Agrupamento item × mercado, ordenação, empate | `price-history-service` (domínio) | RN-12: chega pronto na resposta; a PWA não recalcula nem reordena |
| Contratos tipados | `libs/contracts` | DTOs de borda, sem ORM/domínio; evolui nesta feature (T-04) |
| Evento `shopping-list.purchase-completed` v1 | `shopping-list-service` (produtor) / `price-history-service` (consumidor) | **inalterado** |

- **Nenhum cruzamento de banco.** O adaptador Drizzle acessa somente `purchases`
  e `purchase_items`
  (`…/infrastructure/persistence/drizzle/schema/index.ts:14-48`) — nenhum
  caminho novo para o banco `shopping_list`. A leitura nova
  (`findAllWithItemsByName`) opera na mesma base e na mesma port.
- **Sem segredos novos**: nenhuma variável de ambiente nova; CORS, porta e base
  (`http://localhost:3002`) permanecem como na ADR 0010.

## Domínio, portas e adaptadores (hexagonal)

- **Onde a regra vive (correto):** a escolha do vencedor (`unitPrice` ↑ →
  `purchaseDate` ↓ → `id` ↑), o agrupamento por mercado, a ordenação A→Z e o
  drill-down por mercado ficam em `domain/lowest-prices.ts` (+ novo
  `domain/market-order.ts`) e `domain/lowest-price-by-item.ts` (novos) — **puro**,
  sem Nest/Drizzle/HTTP. Precedente confirmado no código atual: `aggregateLowestPrices`
  é função pura que só importa tipos de contrato e o domínio de compra
  (`…/domain/lowest-prices.ts:1-62`).
- **Porta nova bem posicionada:** `findAllWithItemsByName(nameNormalized)` entra
  na **classe abstrata** do port (mesmo padrão dos outros métodos), e o
  adaptador Drizzle implementa com `inner join` + `where name_normalized = $1`
  devolvendo **apenas** os itens que casam — recorte correto e documentado no
  contrato do port (T-08). O fake in-memory dos specs acompanha, como já acontece
  hoje.
- **Sem vazamento de framework/ORM no domínio:** o plano não move agregação para
  SQL nem para a borda; o controller continua tradutor puro
  (`…/api/http/price-history/price-history.controller.ts:32-63`), e o novo caso
  de uso `GetLowestPricesByItemUseCase` devolve `null` para item inexistente — a
  borda traduz em 404 (mesmo desenho de `GetPurchaseUseCase` → `purchaseNotFound()`).
- **Observação (não bloqueante, sem ação):** o domínio devolve DTOs de
  `@lista/contracts`, como na v1. `libs/contracts` é livre de framework/banco, o
  que preserva a fronteira; não há motivo para introduzir um mapeador novo só
  por purismo.
- **Ordem do pipeline (verificada e correta):** "filtro → agrupamento" (T-09)
  garante **por construção** que nenhum grupo fica vazio (CD-09), sem depender de
  a PWA descartar grupo vazio.

## Contratos de integração

### HTTP — `price-history-service` (prefixo `api`, porta 3002)

| Operação | Rota | Sucesso | Erros | Situação |
| --- | --- | --- | --- | --- |
| Listar compras | `GET /api/price-history/purchases` | 200 `PurchaseListResponse` | 401, 500 | inalterada |
| Detalhe | `GET /api/price-history/purchases/{id}` | 200 `PurchaseDetailResponse` | 404, 401, 500 | inalterada |
| Menores preços (**evoluída**) | `GET /api/price-history/lowest-prices?q=` | 200 `LowestPricesResponse { markets[] }` | 401, 500 | **breaking change** |
| Menores preços do item por mercado (**nova**) | `GET /api/price-history/lowest-prices/{item}` | 200 `LowestPriceByMarketResponse` | **404**, 401, 500 | nova |

- **Coerência do desenho:** o agrupamento explícito (`markets: [{ market, items[] }]`)
  é a escolha certa **porque** CD-04/CD-09 e RN-12 determinam que o agrupamento e
  a ausência de grupo vazio são garantia do **contrato**, não convenção do
  cliente. A alternativa aditiva (manter `items` e somar `markets`) deixaria dois
  shapes válidos no ar — **não deve ser adotada**: o campo `items` sai por
  completo, sem alias de transição.
- **Redundância aceita:** a linha carrega `market` **e** está dentro do grupo do
  mesmo mercado. É redundância útil (a linha exibe `mercado · data · quantidade`
  sem cruzar com o grupo) e consistente por construção (ambos vêm da mesma compra
  vencedora). Ver ressalva R-6 (invariante provada por teste).
- **Compatibilidade:** o único consumidor do tipo é a PWA
  (`apps/web/src/app/core/price-history/price-history-api.service.ts:29-32`) e o
  fake do E2E (`apps/web-e2e/src/support/price-history-fake-api.ts:8-9,256-272`),
  ambos atualizados dentro da feature; **não há consumidor fora do repo**
  (verificado por grep em todo o workspace). Como não há ambiente publicado
  (ADR 0010 §Consequências) e o repo não versiona a API por URL, evoluir a
  operação existente é adequado — desde que a mudança seja **atômica na mesma
  entrega** (ver R-3).
- **Rota nova × rota existente:** `lowest-prices/{item}` é sub-recurso de
  `lowest-prices`; não conflita com `lowest-prices?q=` (rotas de comprimentos
  diferentes). Baixo risco residual: `/lowest-prices/` (barra final) não casa
  rota e cai no 404 do framework, com corpo padrão (sem detalhe interno) — mesmo
  comportamento da v1 em `/purchases/`; nenhum AC depende disso.
- **Erro do drill-down:** 404 canônico pelo mesmo envelope de
  `price-history-errors.ts` (`canonicalError`/`purchaseNotFound`), com mensagem
  PT própria; a mensagem nova deve entrar nesse arquivo (escopo de T-10). O 500
  continua sem detalhe interno (o detalhe vai só para o log —
  `price-history.controller.ts:66-81`). 401 é do guard global (ADR 0007).

### Exceção ao gateway e ADR

- **Regra aplicada corretamente.** A ADR 0010 §1 enumera as operações da exceção
  ("listar compras concluídas, obter detalhe de uma compra, listar menores preços
  e buscar menores preços por nome") e fecha: "qualquer outra chamada direta nova
  (outro serviço, **ou operação fora do escopo acima**) continua exigindo nova
  decisão registrada"
  (`docs/decisions/0010-excecao-temporaria-ao-gateway-price-history-service.md:36-43`).
  O drill-down é operação nova → **nova decisão é obrigatória**; a leitura do
  plano (ADR 0011 + ponte na 0010 §1) está **arquiteturalmente correta** e é a
  forma decidida pelo usuário em 2026-10-19.
- **Escopo de T-01 é suficiente.** Não há obrigação extra: **nenhuma** variável
  nova, CORS inalterado, porta e base inalteradas (`.env.example:60-74` só mudaria
  se houvesse configuração nova), e a ADR 0006 §1 registra exceções **por
  serviço** (com ponte para cada ADR nova) — o `price-history-service` já está
  listado via ADR 0010, então não há ponte pendente lá. A ADR 0001 **não** é
  registro de exceções (nenhuma obrigação de atualizá-la).
- **Follow-up e critérios de saída** devem ser copiados da ADR 0010 (dono =
  feature "API Gateway", migração por feature), como o plano declara em T-01.
- **Pendência documental pequena:** o `libs/contracts/README.md` descreve a base
  direta citando **só** a ADR 0010 (`libs/contracts/README.md:184-197`); ao
  documentar a operação nova (T-04), deve citar também a **ADR 0011** — ver R-6.

### Evento `shopping-list.purchase-completed` (mensageria)

- **Nada muda — confirmado no plano e no código.** T-04 toca apenas
  `libs/contracts/src/http/price-history.ts` (+ README); nenhuma tarefa lista
  `libs/contracts/src/events/**`, o consumidor, o envelope, a routing key, a fila
  ou a ingestão. A idempotência continua pela PK `completionId`
  (`schema/index.ts:15-16`, `purchase.repository.ts:29-57`) e o novo método de
  leitura não participa da escrita. Não há reabertura de at-least-once, ordem ou
  reentrega.

## Dados e performance

- **"Sem migration e sem índice novo" se sustenta.** O índice
  `purchase_items_name_normalized_idx` existe tanto no schema
  (`…/drizzle/schema/index.ts:47`) quanto na migration já versionada
  (`…/drizzle/migrations/0000_milky_silver_fox.sql:19`). O drill-down filtra por
  `name_normalized` (coberto pelo índice) e junta `purchases` pela PK — plano de
  leitura adequado ao volume atual.
- **A consulta nova é mais estreita que a da v1, não mais cara.** A lista
  principal continua agregando **em memória** sobre `findAllWithItems()`
  (`purchase.repository.ts:104-122`), como na v1; o drill-down lê só as compras de
  um item. Não há ganho em mover a agregação para SQL agora (o plano registra o
  trade-off e o gatilho de revisão), e um índice composto não teria uso provado.
- **Sem `LIMIT`:** aceitável — o conjunto é limitado pelo histórico local
  (um login, ADR 0002) e a alternativa (paginação) não é pedida por nenhum AC.
  Se o volume crescer, a evolução é tarefa própria **com** migration, como o
  plano já registra. Não exijo justificativa adicional.
- **Ganho de determinismo real:** ao trocar `createdAt` pelo `id` no desempate, o
  par mercado/data/quantidade deixa de depender da **ordem de ingestão** — que era
  o risco anotado na revisão da v1 (§ Ordem de entrega). A cadeia
  `unitPrice` ↑ → `purchaseDate` ↓ → `id` ↑ é **total** (o `id` é PK da compra) e,
  portanto, determinística entre cargas (AC-04) — fundamentação correta em CD-03.
  Usar `purchase_items.id` não traria ganho (também é surrogado aleatório) e
  exigiria expor coluna no domínio.

## Riscos operacionais

1. **Breaking change em operação já integrada (janela de suíte vermelha).** Entre
   T-04 e T-10/T-11 as suítes listadas em § Impacto nos testes existentes ficam
   vermelhas por consumirem o shape antigo. É mudança prevista e fechada por
   tarefa, mas colide com a regra do `AGENTS.md`/`sdd-workflow` de **nunca**
   avançar com falhas: ver R-3 (ponto de commit).
2. **Paridade fake × serviço (E2E).** O E2E é hermético contra um fake **tipado
   só em compile-time**; se o serviço e o fake divergirem em runtime, o E2E não
   pega. Risco herdado da v1 e já registrado no plano (fake espelha o serviço); a
   mitigação real são os units de domínio + integração Postgres (T-05…T-10), que
   a estratégia de testes já cobre.
3. **Spec de integração mexe no banco de dev.** T-03 passa a truncar
   `purchases`/`purchase_items` do banco `price_history` local a cada caso — o
   banco de dev vira descartável. É o certo para a limpeza determinística, mas
   convém documentar o efeito no cabeçalho do spec e registrar o banco de teste
   dedicado como follow-up: ver R-4.
4. **Estado do store sobrevive ao logout (CD-10).** O logout da PWA é
   `router.navigate` (`apps/web/src/app/core/auth/session.service.ts:95-97`,
   `auth.interceptor.ts:44-54`), **sem** recarregar o app: a busca anterior da
   tela Menor preço reaparece na próxima sessão (o dado é **refeito** na entrada,
   então não é dado velho). Login único local (ADR 0002) → risco baixo; **sem ação
   obrigatória**. Se incomodar, a limpeza do store no logout é decisão à parte
   (acoplaria auth → feature).
5. **`GET` sem cache explícito:** nenhum header de cache; a PWA sempre refaz o
   GET (comportamento desejado — RN-11). Sem risco.

## Decisões e ADRs

- **ADR 0001** — respeitada: nenhum serviço lê/grava o banco alheio; nada de
  integração nova (a feature é leitura no próprio serviço).
- **ADR 0006 / 0009 / 0010** — a regra das exceções temporárias é aplicada
  corretamente: operação nova exige decisão nova; **ADR 0011** (T-01) com ponte
  na 0010 §1, mesma base/CORS e mesmos critérios de saída. A ADR 0006 §1 **não**
  precisa de nova nota (ela registra exceções por **serviço**).
- **ADR 0007** — inalterada: JWT validado localmente na borda; guard global cobre
  as duas rotas.
- **ADR 0008** — atendida: `Superfície de UI: sim` com justificativa, matriz
  AC ↔ E2E 16/16 e T-16 com `npx nx e2e web-e2e`.
- **Nenhuma ADR adicional** é necessária além da 0011 prevista.
- **Decisões do plano endossadas:** contrato agrupado (não lista plana); desempate
  pela cadeia `unitPrice`/`purchaseDate`/`id`; ordenação de mercado por
  normalização com desempate pelo texto cru; CD-10 no store; rework de higiene em
  T-03; E2E hermético. Nenhuma delas introduz padrão novo sem necessidade.

## Ressalvas (não bloqueantes)

Cada uma indica a tarefa que a resolve. Nenhuma reabre a SPEC nem os CDs.

1. **R-1 — Normalizar o parâmetro `{item}` no serviço (T-09/T-10).** O plano
   repassa o parâmetro **cru** ao caso de uso. RN-09 diz que "o parâmetro resolve
   para o item **pela mesma normalização**", e a busca da v1 **normaliza** o termo
   (`domain/lowest-price-search.ts:14`). Consequência do repasse cru: um valor não
   normalizado (URL digitada à mão, link antigo) cai em 404 apesar de o item
   existir. Aplicar `normalizeItemName` ao parâmetro no caso de uso (ou na borda)
   é uma linha, não muda a query nem o índice, e dá paridade com o comportamento
   da busca. Se o time optar por não normalizar, registrar o porquê.
2. **R-2 — Verificar por teste o nome de item com `/` antes de manter a
   "limitação" documentada (T-05/T-10/T-11/T-13; texto do PLAN).** O cenário é
   **alcançável** (nome só precisa ser não vazio —
   `apps/shopping-list-service/src/domain/item-name.ts:20-23`). Mas a premissa do
   plano ("não é representável no caminho → 404") é **provavelmente falsa**:
   `encodeURIComponent` codifica `/` como `%2F`, e tanto o router da PWA quanto o
   do Fastify decodificam **por segmento**, não por caminho. Exigir uma spec de
   round-trip (ex.: `leite/açúcar`) em T-05/T-11 + asserção no E2E (T-16), se o
   round-trip passar, retirar a limitação da § Riscos e da § Perguntas resolvidas
   do PLAN (o orquestrador ajusta o texto — este parecer não edita o PLAN).
3. **R-3 — Ponto de commit da janela de suíte vermelha (orquestrador / T-04).**
   T-04 fecha com `build`/`lint` de contratos verdes, mas deixa as suítes
   consumidoras vermelhas até T-09/T-10/T-11/T-12. O `sdd-workflow` §3 e o
   `AGENTS.md` mandam não avançar com falhas da etapa: ou T-04 é commitada junto
   do primeiro consumidor que restaura o verde do escopo afetado, ou o handoff do
   commit declara explicitamente a dependência (shape novo aguardando T-XX) — a
   decisão é do orquestrador, mas não pode ficar implícita.
4. **R-4 — Documentar que T-03 trunca o banco de dev (T-03; lição T-17).** O
   spec de integração passa a apagar `purchases`/`purchase_items` do banco
   `price_history` local a cada caso. Registrar isso no cabeçalho do spec (para
   não surpreender quem usa o banco de dev) e manter o **banco de teste dedicado**
   como follow-up registrado (o plano já o coloca fora do escopo por exigir
   decisão de configuração própria).
5. **R-5 — Distinguir 404 ("não encontrado") de erro genérico no store (T-11).**
   AC-12 (não encontrado) e AC-14 (erro + Tentar novamente) são estados
   **diferentes** do drill-down. Como a leitura de erro atual é só
   `apiErrorMessage` (`apps/web/src/app/features/shopping-list/data/api-error.ts:17-24`),
   o plano deve explicitar que a seção `itemLowestPrices` mapeia
   `HttpErrorResponse.status === 404` para "não encontrado" e os demais para erro;
   o `status` derivado precisa ficar no store (T-11), não só na tela (T-13).
6. **R-6 — Coerência de contrato/documentação (T-04/T-05/T-10).** (a) o
   `libs/contracts/README.md` deve citar a **ADR 0011** na operação nova (hoje só
   cita a 0010); (b) provar por teste a **invariante** de que
   `item.market === grupo.market` em cada linha da lista principal (evita um shape
   internamente incoerente se a agregação evoluir depois).

## Pendências bloqueantes

- **Nenhuma.** Limites de serviço, ownership, contrato do evento v1,
  idempotência, desenho do contrato agrupado, rota nova com 404 canônico,
  leitura sem migration e exceção ao gateway estão **coerentes** com a SPEC, as
  ADRs vigentes e o código real. As seis ressalvas são ajustes de detalhe
  contratual, de processo ou de documentação — não reabrem arquitetura nem os
  CD-01…CD-10.

## Gate

- [x] Ownership de dados explícito e sem acesso a banco de outro serviço.
- [x] Agregação/ordenação/desempate no dono do dado; PWA só renderiza (RN-12).
- [x] Domínio puro; porta e adaptador respeitam a fronteira hexagonal.
- [x] Contratos documentados e evolutivos (breaking change declarado, sem
      consumidor externo, sem alias de transição).
- [x] Evento e idempotência inalterados.
- [x] Exceção ao gateway tratada por ADR nova (T-01) + ponte na ADR 0010 §1.
- [x] Estratégia de testes cobre as fronteiras (domínio, persistência real com
      Postgres, casos de uso, borda HTTP, PWA e E2E hermético).
- [x] Nenhuma pendência bloqueante; ressalvas não bloqueantes com tarefa dona.

## Conclusão sobre o gate do plano

O plano **pode ser aprovado pelo usuário**: o DoD do plano
(`docs/process/sdd-workflow.md:83`) exige `ARCHITECTURE-REVIEW.md` aprovada
quando aplicável, e este parecer é **Aprovada com ressalvas**, **sem nenhuma
ressalva bloqueante**. As ressalvas R-1…R-6 são incorporáveis nas tarefas já
existentes (T-03, T-04, T-05, T-09, T-10, T-11, T-13, T-16) e devem entrar como
ajuste do `PLAN.md`/texto das tarefas **antes** da implementação correspondente —
não impedem a frase canônica, que é do usuário.

> A frase canônica de aprovação pertence ao `PLAN.md` e é preenchida pelo
> usuário (via orquestrador) após este parecer. Este artefato **não** a contém.

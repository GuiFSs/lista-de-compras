# Especificação — Menor preço por mercado

**Status:** Aprovada
**Última atualização:** 2026-10-19
**Aprovação do usuário:** Aprovado pelo usuário em 2026-10-19

> **Escopo desta evolução (confirmado com o usuário em 2026-10-19 — CD-01…CD-10):**
> a tela **Menor preço** (v1, já integrada) passa a mostrar, em cada item, o
> **mercado**, a **data** e a **quantidade** da compra que ostenta o menor preço,
> e a lista passa a ser **agrupada por mercado**; tocar em um item abre uma
> **tela dedicada** (`/menor-preco/:item`) com **uma linha por mercado** para
> aquele item. A regra de menor preço por unidade e a busca por nome
> **permanecem** como na v1. As decisões D-01…D-04, abertas na primeira versão
> desta spec, foram confirmadas pelo usuário em **2026-10-19** e viraram
> **CD-07…CD-10**.

## Objetivo

Dar **contexto à decisão de compra**: hoje a pessoa autenticada vê apenas
*qual* é o menor preço já pago por cada item, sem saber **onde** e **quando**
esse preço foi praticado nem **em que quantidade** — e sem conseguir comparar o
mesmo item entre mercados. Esta evolução mostra, para cada item, o **mercado**,
a **data** e a **quantidade** da compra que ostenta o menor preço por unidade, e
permite abrir o item para ver o **menor preço daquele item em cada mercado**.

Valor imediato: a tela **Menor preço** deixa de ser uma lista abstrata de
preços e passa a responder “onde comprar mais barato” e “como este mercado se
compara aos outros para este item”.

## Fontes e rastreabilidade

- Escopo: `docs/product/initial-scope.md` — seção **"Histórico de preços"**,
  **atualizada em 2026-10-19 por esta feature** (a v1 `price-history` declarava
  que “evoluções como média, último preço, tendência e **comparação entre
  mercados** ficam fora do escopo inicial”; esta feature **traz a comparação
  entre mercados para o escopo do produto**, com a decisão do usuário de
  2026-10-19 — ver § Contratos afetados).
- v1 desta área: `docs/features/price-history/SPEC.md` — **base preservada**:
  RN-06 (comparação de nomes — case-insensitive e sem acentos), RN-07 (consulta
  de menor preço: listar + buscar), AC-08/AC-09/AC-10 (menor preço, busca,
  “menor e não média”), AC-12/AC-13/AC-14 (empty / skeleton / erro+retry),
  AC-18 (401 → login). Ver também `docs/features/price-history/STATUS.md`.
- ADRs:
  - **0001** — `price-history-service` é o dono exclusivo dos dados de
    histórico; integração entre serviços por contrato/evento (ownership
    inalterado).
  - **0006** / **0009** — regra das exceções temporárias ao API Gateway:
    qualquer chamada direta nova (serviço **ou** operação fora do escopo da
    exceção vigente) exige **nova decisão registrada**.
  - **0007** — validação local do JWT na borda HTTP de cada serviço.
  - **0008** — Playwright obrigatório (esta feature tem superfície de UI =
    **sim**).
  - **0010** — exceção temporária ao gateway para o `price-history-service`
    (porta 3002); enumera as operações de consulta da v1 e exige nova decisão
    para operação nova (ver § Contratos afetados).
- Design: `docs/design/GUIA-DESIGN.md` (§2 tokens, §3 navegação, §4 composição,
  §5 componentes) e skill `ui-design`.
- Contrato atual: `libs/contracts/src/http/price-history.ts`
  (`LowestPriceItem { name, nameNormalized, lowestUnitPrice }` — **sem** mercado,
  data ou quantidade).
- Processo: `docs/process/sdd-workflow.md`.
- Estado: `docs/features/lowest-price-by-market/STATUS.md`.

## Fora de escopo

- **Média, último preço, tendência, séries temporais e gráficos** — permanecem
  fora do escopo (a v1 já os excluía).
- **Comparação por outro critério que não o menor preço por unidade** — ex.:
  menor preço total da compra, custo por embalagem, marca, avaliação, distância.
- **Qualquer mudança na captura** (checkout com mercado/data), no **evento de
  conclusão**, na **persistência** ou no **consumidor** do
  `price-history-service` — o registro já guarda mercado, data, quantidade,
  unidade e preço por unidade (v1, RN-05); esta feature é **só de consulta/UI**.
- **Edição ou exclusão** de compras concluídas (inalterado desde a v1).
- **Filtros adicionais** na lista principal (por mercado, por período) e
  **ordenação escolhida pela pessoa** — não pedidos; a ordenação é fixa
  (mercado A→Z, item A→Z; § RN).
- **Alterar a regra de menor preço por unidade** ou a **normalização de nomes**
  (case-insensitive e sem acentos) — permanecem como na v1 (RN-06/RN-07).
- **API Gateway** — permanece no backlog; o acesso continua pela exceção
  temporária (ADR 0010), com o drill-down a exigir decisão registrada
  (§ Contratos afetados).
- **Autenticação, lista ativa, entrada por voz/código de barras** — inalterados.

## Fluxo principal

### 1) Consultar o menor preço por item, com mercado/data/quantidade e agrupamento por mercado

1. A pessoa toca a aba **Menor preço** na bottom nav (rota real desde a v1).
2. A tela lista **todos** os itens já presentes no histórico. Para cada item,
   além do **nome** e do **menor preço por unidade** em R$ (inalterado), passa a
   mostrar o **mercado**, a **data** e a **quantidade com a unidade** da compra
   que ostenta esse menor preço (a **compra vencedora** — § RN).
3. A lista é **agrupada por mercado em ordem A→Z**; dentro de cada mercado, os
   itens ficam em ordem **A→Z**. Cada item aparece **uma única vez** (no grupo
   do mercado da sua compra vencedora), mesmo que tenha sido comprado em vários
   mercados. Só aparecem grupos de mercado com **ao menos um item** — mercado
   sem item vencedor **não** gera cabeçalho vazio.
4. A pessoa pode **pesquisar por nome** (inalterado — mesma normalização e mesmo
   empty de busca da v1); o resultado filtrado continua agrupado por mercado
   A→Z e item A→Z.
5. Sem histórico → empty state (inalterado); falha de carga → erro com **Tentar
   novamente** (inalterado). Logo após uma conclusão, a tela pode ainda não
   refletir a compra até o consumo do evento (v1, CD-06).

### 2) Ver os menores preços de um item em cada mercado (drill-down)

1. Na lista principal, a pessoa **toca em um item** (ex.: “Batata”).
2. A PWA navega para a **tela dedicada** `/menor-preco/:item` — em que `:item` é
   o **slug do nome normalizado** do item (CD-07) — com **app bar** e ação
   **voltar** (mesmo padrão da tela de detalhe do Histórico da v1).
3. A tela mostra **uma linha por mercado** em que aquele item tem compras, em
   ordem **A→Z**. Cada linha traz o **menor preço por unidade** daquele item
   **naquele mercado** em R$ (por unidade, não pelo total), com a **data** e a
   **quantidade com a unidade** da compra que ostenta esse preço naquele mercado
   (empate → § RN).
4. A ação **voltar** retorna à tela **Menor preço** **preservando o termo de
   busca e a lista filtrada** como estavam (CD-10).
5. Se o item não tiver histórico (rota aberta direta com um valor que não
   resolve para nenhum item) → bloco de **não encontrado** com **voltar**;
   nunca tela em branco.

## Regras de negócio

- **RN-01** — O **`price-history-service` é o dono exclusivo** dos dados usados
  por esta feature; nenhum outro serviço lê ou grava esse banco diretamente
  (ADR 0001 — inalterado).
- **RN-02** — O **"menor preço" continua sendo o menor preço POR UNIDADE** entre
  **todas** as compras do mesmo item (em qualquer mercado), comparando pelo
  **nome normalizado** (sem diferenciar maiúsculas/minúsculas nem acentos —
  v1 RN-06/RN-07). Nada de média, último preço, tendência ou total da compra.
- **RN-03** — Na lista principal, cada item aparece **uma única vez** com o seu
  menor preço por unidade (RN-02). A **compra vencedora** é a compra daquele
  item que ostenta esse menor preço por unidade, e é dela que a linha toma
  **mercado**, **data** e **quantidade com a unidade**.
- **RN-04** — **Empate** (duas ou mais compras do mesmo item com o **mesmo**
  preço por unidade): a compra vencedora é a **mais recente** — maior data da
  compra. Se a data também empatar, o desempate final é **determinístico pelo id
  do registro** (ordem estável), de modo que a mesma entrada produz sempre o
  mesmo par mercado/data/quantidade entre cargas. A regra vale igualmente para
  a lista principal e para cada linha da tela do item (naquele mercado).
- **RN-05** — A lista principal é **agrupada por mercado em ordem A→Z** e, dentro
  do grupo, por **item em ordem A→Z** (ordem determinística pelo nome
  normalizado). Cada item pertence ao grupo do **mercado da sua compra
  vencedora** (RN-03/RN-04). Só aparecem grupos de mercado com **ao menos um
  item** — mercado presente no histórico sem item vencedor **não** gera
  cabeçalho vazio (CD-09).
- **RN-06** — A tela do item (`/menor-preco/:item`) mostra **uma linha por
  mercado** em que aquele item tem pelo menos uma compra, em ordem **A→Z**.
  Cada linha = o **menor preço por unidade daquele item naquele mercado** (entre
  as compras do item **naquele** mercado; empate → RN-04), com a **data** e a
  **quantidade com a unidade** da compra vencedora **naquele mercado**. O preço
  é sempre **por unidade**, em R$ — nunca o total da compra.
- **RN-07** — **Item em um único mercado:** sem tratamento especial — aparece
  normalmente na lista principal (no grupo daquele mercado) e a tela do item
  mostra **uma única linha**. Não vira erro nem estado vazio.
- **RN-08** — **Item sem histórico:** não aparece na lista principal. Abrir
  `/menor-preco/:item` com um valor que **não resolve** para nenhum item do
  histórico mostra **não encontrado** com **voltar** para Menor preço — nunca
  área de conteúdo em branco sem explicação.
- **RN-09** — **Identificação do item na rota:** o parâmetro `:item` de
  `/menor-preco/:item` é o **slug do nome normalizado** do item (RN-02 — sem
  caixa, sem acentos); **não** há id novo de item. O parâmetro resolve para o
  item pela mesma normalização, e o **nome de exibição canônico vem da
  resposta** do serviço (**CD-07**). Um slug que não resolve para nenhum item →
  RN-08.
- **RN-10** — A **busca por nome** permanece como na v1: filtra os itens pela
  mesma normalização (RN-02); **busca sem resultado** mostra o empty próprio da
  busca (distinto do empty de “histórico vazio”), sem fingir lista vazia. O
  resultado filtrado mantém o agrupamento/ordenação de RN-05.
- **RN-11** — Consistência herdada da v1: o histórico é **eventualmente
  consistente** (o `price-history-service` persiste após consumir o evento de
  conclusão). Logo após uma conclusão, a lista principal e a tela do item podem
  **ainda não** refletir a compra até o consumo do evento (v1, CD-06).
- **RN-12** — **A agregação é do `price-history-service`**, não da PWA: qual
  compra é a vencedora, o agrupamento por mercado, a ordenação e o desempate
  (RN-04/RN-05/RN-06) chegam prontos na resposta; a tela apenas exibe (a PWA não
  recalcula menor preço, não reordena e não decide empate).
- **RN-13** — Telas desta feature seguem o `GUIA-DESIGN`: **4 estados**,
  **tokens only**, **uma** ação `primary` por tela (ou no empty state), alvos
  ≥ 44px, tema claro/escuro, coluna única.
- **RN-14** — Operações HTTP de ambas as telas exigem **sessão ativa**; JWT
  validado **localmente** na borda do `price-history-service` (ADR 0007). Sem
  token válido → **401** e retorno ao login (inalterado).
- **RN-15** — Enquanto o API Gateway não existir, a PWA chama o
  **`price-history-service` diretamente** (ADR 0010). A **consulta nova** do
  drill-down (menores preços de um item por mercado) **não** está enumerada no
  escopo da exceção vigente e, pela regra das ADRs 0006/0010, **exige nova
  decisão registrada** — recomenda-se **nova ADR** (ou extensão da ADR 0010) no
  `PLAN.md` (§ Contratos afetados).
- **RN-16** — **Voltar do drill-down:** a ação **voltar** da tela do item
  retorna à tela **Menor preço** **preservando o termo de busca e a lista
  filtrada** como estavam antes de abrir o item (**CD-10**).

## Estados relevantes

### Menor preço (lista principal — evolução)

- **Carregando** — skeleton no formato da lista (não spinner sozinho).
- **Vazio** — empty state rico (inalterado da v1) quando ainda não há itens no
  histórico (inclui o atraso pós-conclusão até o consumo do evento — RN-11).
- **Erro** — mensagem na área de conteúdo + **Tentar novamente** (refaz a mesma
  consulta).
- **Sucesso** — lista agrupada por mercado (A→Z) e item (A→Z); cada linha com
  **nome**, **menor preço por unidade** em R$ e **mercado · data · quantidade com
  a unidade** da compra vencedora; toque na linha abre o drill-down. Busca sem
  resultado → empty de busca (inalterado).

### Menor preço por mercado (tela do item — drill-down)

- **Carregando** — skeleton do conteúdo; ação **voltar** visível.
- **Vazio** — não esperado se a navegação veio de uma linha válida. Se o item
  não tiver histórico (rota direta) → **não encontrado** com **voltar** (RN-08).
- **Erro** — mensagem + **Tentar novamente** (ou voltar); o **voltar** continua
  visível em todos os estados.
- **Sucesso** — uma linha por mercado (A→Z): **mercado**, **menor preço por
  unidade** em R$, **data** e **quantidade com a unidade** da compra vencedora
  naquele mercado.

### Transversal

- **Sessão expirada** — 401 em qualquer uma das consultas → sessão inválida →
  retorno ao login (v1, AC-18) — inalterado.
- **Voltar** — a ação **voltar** da tela do item devolve a tela **Menor preço**
  com o **termo de busca e a lista filtrada preservados** (RN-16 / AC-11).

## Design e UX

- Padrões: `docs/design/GUIA-DESIGN.md` §2–§5; skill `ui-design`.
- **Superfície de UI:** **sim** (ADR 0008) — evidência Playwright obrigatória no
  plano/validação para os ACs observáveis em tela.

### Menor preço (lista / conteúdo, agrupada)

- **Tipo de tela:** lista / conteúdo (evolução da tela da v1).
- **Hierarquia do primeiro viewport:**
  1. App bar — título **Menor preço** (`--font-size-h2`).
  2. Apoio curto opcional (uma linha `caption` / `ink-muted`) e o campo de
     **busca por nome** (rótulo visível; placeholder não substitui rótulo).
  3. **Cabeçalho de grupo por mercado** (nome do mercado em `eyebrow`/`caption`,
     `--color-ink-muted`), separando os grupos por whitespace
     (`--space-lg`/`--space-xl` **entre** grupos; `--space-sm`/`--space-md`
     **dentro**).
  4. **Linha do item:** nome (`body`) + **menor preço** em R$ (`body-sm`, peso
     500) + metadados `mercado · data · quantidade com a unidade` (`caption` /
     `--color-ink-muted`); divisor **hairline**; a linha inteira é o alvo do
     toque (≥ 44px) e navega para o drill-down.
  5. Sem CTA `primary` concorrente na lista cheia; no empty state, um `primary`
     (ex.: “Ir para a lista”), como na v1.
- Bottom nav: aba **Menor preço** ativa (`--color-primary-text`).

### Menor preço por mercado — tela do item (lista / conteúdo, detalhe)

- **Tipo de tela:** lista / conteúdo (detalhe), mesmo padrão da tela de detalhe
  do Histórico da v1.
- **Hierarquia do primeiro viewport:**
  1. App bar — título com o **nome do item** (`--font-size-h2`); ação **voltar**
     com `aria-label` (“Voltar para os menores preços”), visível em todos os
     estados.
  2. Bloco de apoio: nome do item + frase curta (`caption`, `ink-muted`).
  3. Lista de **linhas por mercado** (A→Z), cada uma com o **mercado**
     (`body`/`title`), o **menor preço por unidade** em R$ e `data · quantidade
     com a unidade` (`caption` / `--color-ink-muted`); hairline entre linhas;
     alvo ≥ 44px.
  4. Sem segundo CTA `primary`; o **voltar** é a navegação principal (como no
     detalhe de compra da v1) e devolve a tela Menor preço **preservando o
     termo de busca e a lista filtrada** (CD-10).

### Comportamento mobile (ambas)

- Coluna única; `md+` centraliza em `--container-max`; padding inferior reserva
  bottom nav + safe area; tokens only; alvos ≥ 44px; tema claro/escuro;
  `prefers-reduced-motion` respeitado.

### Checklist de design (preencher na implementação/validação)

- [ ] Tipo de tela identificado e receita do guia §4 aplicada (2 telas:
      lista/conteúdo e detalhe).
- [ ] Hierarquia tipográfica definida no primeiro viewport (app bar → apoio →
      conteúdo → ação).
- [ ] Agrupamento por whitespace: ritmo maior entre mercados, menor dentro do
      grupo; hairline entre linhas (não bordas pesadas).
- [ ] Quatro estados cobertos nas duas telas; **um** CTA `primary` por tela (ou
      no empty state).
- [ ] Tokens only — nenhuma cor/espaço/raio hardcoded; claro e escuro.
- [ ] Alvos ≥ 44px (linha do item, grupos e voltar).
- [ ] Utilizável em ~360px e no desktop (coluna única, `--container-max`).

## Critérios de aceite

- [ ] **AC-01:** Na tela **Menor preço**, com sessão ativa e histórico
      existente, cada item distinto (comparação por nome normalizado — sem
      caixa/acento) mostra o **menor preço por unidade** em R$ (inalterado) e
      passa a mostrar também o **mercado**, a **data** e a **quantidade com a
      unidade** da compra que ostenta esse menor preço.
- [ ] **AC-02:** A lista principal está **agrupada por mercado em ordem A→Z**;
      dentro de cada mercado os itens aparecem em ordem **A→Z**; um item
      comprado em **vários** mercados aparece **uma única vez**, no grupo do
      mercado da sua compra vencedora; **nenhum** grupo de mercado sem ao menos
      um item é exibido (sem cabeçalho vazio).
- [ ] **AC-03:** Dois registros do mesmo item com preços por unidade diferentes
      e mercados/datas distintos (ex.: R$ 10,00 e R$ 7,50) fazem a linha exibir
      **R$ 7,50** e creditar o **mercado/data/quantidade do registro de
      R$ 7,50** — sem média, último preço ou tendência.
- [ ] **AC-04:** Dois registros do mesmo item com o **mesmo** preço por unidade
      em datas distintas fazem a linha creditar a **compra mais recente** (maior
      data da compra); quando a data também empatar, o desempate é
      **determinístico pelo id do registro** e a mesma saída (mesmo grupo e
      mesmos mercado/data/quantidade) se repete em novas cargas.
- [ ] **AC-05:** Tocar em uma linha de item na lista principal navega para a
      tela dedicada **`/menor-preco/:item`**, em que `:item` é o **slug do nome
      normalizado** do item; a tela resolve para o item correto (mesmo com
      diferença de caixa/acento no nome de exibição) e mostra app bar e ação
      **voltar** visível em todos os estados.
- [ ] **AC-06:** Na tela do item, um item com compras em **N mercados distintos**
      mostra **N linhas**, uma por mercado, em ordem **A→Z**; cada linha traz o
      **menor preço por unidade** daquele item **naquele mercado** em R$ e a
      **data** e a **quantidade com a unidade** da compra que ostenta esse preço
      **naquele mercado**.
- [ ] **AC-07:** Na tela do item, se o mesmo item tem mais de uma compra **no
      mesmo mercado** com preços por unidade diferentes (ex.: R$ 6,00 e
      R$ 9,00), a linha daquele mercado mostra **R$ 6,00** (o menor naquele
      mercado) e a data/quantidade da compra de R$ 6,00 — não a última compra.
- [ ] **AC-08:** Item presente em **um único** mercado aparece normalmente na
      lista principal (no grupo daquele mercado, com mercado/data/quantidade com
      a unidade) e a tela do item mostra **uma** linha — sem erro nem estado
      vazio.
- [ ] **AC-09:** A **busca por nome** permanece: pesquisar filtra os itens pela
      mesma normalização (busca por `cafe` encontra o item registrado como
      `café`); o resultado filtrado continua agrupado por mercado A→Z e item
      A→Z; busca **sem** resultado mostra o empty de busca (não uma lista em
      branco sem explicação).
- [ ] **AC-10:** Sem nenhum item no histórico, a tela **Menor preço** mostra o
      empty state rico (inalterado) — nunca área de conteúdo em branco.
- [ ] **AC-11:** A ação **voltar** na tela do item retorna à tela **Menor
      preço** **preservando** o termo de busca e a lista filtrada como estavam
      antes de abrir o item.
- [ ] **AC-12:** Abrir `/menor-preco/:item` com um valor que **não** resolve
      para nenhum item do histórico mostra o bloco de **não encontrado** com
      **voltar** para Menor preço — nunca tela em branco.
- [ ] **AC-13:** Na primeira carga da lista principal **e** da tela do item, a
      tela exibe **skeleton** no formato do conteúdo (não spinner centralizado
      sozinho).
- [ ] **AC-14:** Em falha de carga da lista principal ou da tela do item, a área
      de conteúdo exibe erro visível com **Tentar novamente**; a nova tentativa
      refaz a **mesma** consulta.
- [ ] **AC-15:** Chamadas HTTP das duas telas **sem** JWT válido recebem **401**;
      a PWA trata como sessão inválida (retorno ao login).
- [ ] **AC-16:** As telas **Menor preço** (agrupada) e **Menor preço por
      mercado** atendem ao `GUIA-DESIGN`: 4 estados, uma `primary` por tela (ou
      no empty state), tokens only (nenhuma cor hardcoded), alvos ≥ 44px, layout
      utilizável em ~360px e no desktop em coluna única, tema claro/escuro.

## Contratos afetados

### HTTP — `price-history-service` (evolução do contrato de menor preço)

No **nível de produto**, as operações de consulta desta feature passam a
devolver / a incluir:

- **Lista principal de Menor preço (evolução da consulta existente):** para cada
  item, além de **nome** e **menor preço por unidade**, o retorno passa a
  carregar **mercado**, **data** e **quantidade com a unidade** da compra
  vencedora (RN-03/RN-04). A **ordenação** deixa de ser apenas por nome: passa a
  ser **mercado A→Z** e, dentro do mercado, **item A→Z** (RN-05). A **busca por
  nome** (query de filtro) permanece (RN-10).
- **Drill-down do item (consulta nova):** identificado pelo **slug do nome
  normalizado** do item (`:item` — RN-09/CD-07); devolve os **menores preços
  daquele item, por mercado** — uma entrada por mercado com o **preço por
  unidade**, a **data** e a **quantidade com a unidade** da compra vencedora
  naquele mercado (RN-06), em ordem A→Z.
- **Autenticação:** JWT no header; 401 sem token válido (ADR 0007) — AC-15.
- **Erro de item inexistente no drill-down:** resposta de **não encontrado** que
  a PWA exibe como bloco de erro + voltar (RN-08 / AC-12).
- **Caminhos, verbos, nomes de campos JSON, parâmetros de query e status HTTP
  exatos ficam para o `PLAN.md`** — não são inventados nesta spec.

### Contratos compartilhados

- `libs/contracts/src/http/price-history.ts` — o tipo atual
  `LowestPriceItem { name, nameNormalized, lowestUnitPrice }` **passa a carregar
  mercado/data/quantidade (com a unidade)** (RN-03); o drill-down exige **tipo
  novo** para a resposta “por mercado”. Shape exato: `PLAN.md` (não inventado
  aqui).

### Acesso da PWA (exceção ao gateway)

- A PWA continua chamando o **`price-history-service` diretamente** (porta 3002,
  sob `/api/price-history/*`), com JWT no header — **ADR 0010** / RN-15.
- **Atenção (nova decisão exigida):** a ADR 0010 enumera o escopo da exceção
  como “listar compras concluídas, obter detalhe de uma compra, listar menores
  preços e buscar menores preços por nome”. A **consulta nova do drill-down**
  cai em “operação fora do escopo acima”, que pela regra das ADRs 0006/0010
  **exige nova decisão registrada**. Recomenda-se que o `PLAN.md` crie uma
  **nova ADR** (ou estenda a ADR 0010) cobrindo a operação nova, com os mesmos
  critérios de saída e migração para o gateway. *(A criação da ADR não é feita
  nesta spec — os limites do `product-spec` entregam só o `SPEC.md`.)*
- CORS e validação local do JWT permanecem como na ADR 0010 (sem mudança).

### Evento de conclusão (mensageria)

- **Inalterado.** O evento e a persistência da v1 já carregam mercado, data,
  quantidade, unidade e preço por unidade; esta feature **não** altera produtor,
  consumidor, envelope ou idempotência (v1 RN-02/RN-11).

### Escopo de produto (`docs/product/initial-scope.md`)

- A v1 declarou **“comparação entre mercados” fora do escopo inicial**
  (`docs/features/price-history/SPEC.md` § Fora de escopo;
  `docs/product/initial-scope.md` § Histórico de preços). Esta feature **traz o
  tema para o escopo do produto**.
- **Feito em 2026-10-19:** `docs/product/initial-scope.md` (§ Histórico de
  preços) foi **atualizado por esta feature**, com autorização do usuário, para
  registrar que a consulta passa a mostrar mercado/data/quantidade e que a
  comparação do menor preço **entre mercados** entra no escopo (a v1 a declarava
  fora); média/último preço/tendência continuam fora.

## Decisões confirmadas com o usuário (2026-10-19)

| ID | Decisão |
| --- | --- |
| CD-01 | **Drill-down:** nova rota **`/menor-preco/:item`** — tela dedicada, com app bar e voltar (padrão da tela de detalhe do Histórico da v1). |
| CD-02 | **Visão do item por mercado:** **uma linha por mercado** — o menor preço por unidade daquele item **naquele** mercado, com a **data** e a **quantidade** da compra que ostenta esse preço. |
| CD-03 | **Empate:** a compra que empresta mercado/data/quantidade é a **mais recente**; desempate final **determinístico pelo id do registro**. |
| CD-04 | **Lista principal:** agrupada por **mercado A→Z** e, dentro do mercado, **item A→Z**. |
| CD-05 | **Regra de menor preço inalterada:** menor preço **por unidade** entre as compras do mesmo item, por nome normalizado (v1 RN-06/RN-07). |
| CD-06 | **Busca inalterada:** por nome, com empty próprio distinto do empty de histórico vazio (v1 AC-09). |
| CD-07 | **Identificação do item na rota (D-01, 2026-10-19):** `:item` é o **slug do nome normalizado**; sem id novo de item; o nome de exibição canônico vem na resposta. |
| CD-08 | **Quantidade com unidade (D-02, 2026-10-19):** a quantidade exibida vem **com a unidade** (ex.: “2 kg”, “3 unidade”). |
| CD-09 | **Sem grupos vazios (D-03, 2026-10-19):** a lista principal mostra só cabeçalhos de mercado com **ao menos um item**. |
| CD-10 | **Voltar preserva busca (D-04, 2026-10-19):** voltar do drill-down devolve a tela Menor preço com **termo de busca e lista filtrada preservados**. |

## Decisões em aberto (resolvidas em 2026-10-19)

| ID | Questão | Tipo | Decisão do usuário (2026-10-19) | Estado |
| --- | --- | --- | --- | --- |
| D-01 | Como o item é identificado no parâmetro da rota `/menor-preco/:item` — **slug do nome normalizado** ou um **id estável**? | bloqueante | **Slug do nome normalizado** (URL legível; sem id novo de item; nome de exibição canônico vem da resposta) → **CD-07** | **resolvida** |
| D-02 | A **quantidade** exibida (lista principal e tela do item) deve vir **com a unidade** (ex.: “2 kg”, “3 unidade”)? | não bloqueante | **Sim** — quantidade **com a unidade** → **CD-08** | **resolvida** |
| D-03 | A lista principal deve exibir **cabeçalho de mercado vazio** (mercado presente no histórico que não ostenta nenhum item vencedor)? | não bloqueante | **Não** — só grupos com ao menos um item → **CD-09** | **resolvida** |
| D-04 | Ao **voltar** do drill-down, a tela Menor preço deve **preservar o termo de busca e a lista filtrada** anteriores? | não bloqueante | **Sim** — preservar termo de busca e lista filtrada → **CD-10** | **resolvida** |

> **Nenhuma decisão aberta.** O usuário respondeu D-01…D-04 em **2026-10-19**
> (nas recomendações propostas) e elas viraram **CD-07…CD-10**. CD-01…CD-06
> seguem como confirmadas. **Não há decisão bloqueante aberta**: a spec fecha o
> gate e segue para o plano.

## Gate da spec

- [x] Objetivo, fluxo, regras e fora de escopo estão claros.
- [x] Critérios `AC-*` são verificáveis e não prescrevem implementação.
- [x] Contratos afetados estão identificados (HTTP + contrato compartilhado +
      exceção ao gateway; **sem** mudança de mensageria).
- [x] Não há decisão bloqueante aberta. *(D-01…D-04 resolvidas em 2026-10-19 →
      CD-07…CD-10.)*
- [x] Artefato contém a frase canônica `Aprovado pelo usuário em YYYY-MM-DD`.

**Aprovado pelo usuário em 2026-10-19**

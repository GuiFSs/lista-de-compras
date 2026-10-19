# Especificação — Histórico de preços

**Status:** Aprovada
**Última atualização:** 2026-10-16
**Aprovação do usuário:** Aprovado pelo usuário em 2026-10-16

> **Escopo da 1ª rodada (confirmado com o usuário em 2026-10-16 — CD-01…CD-07):**
> rodada **completa (A)** — captura (mercado/data no checkout + evento +
> `price-history-service`) **e** UI de menor preço **e** UI de compras
> concluídas; bottom nav **Histórico** passa a navegar de verdade; pasta/feature
> `price-history`. Esta feature **substitui** o comportamento provisório da lista
> ativa em que concluir **não** pedia mercado/data nem publicava evento
> (`shopping-list` RN-16 / AC-21).

## Objetivo

Permitir que a pessoa autenticada (o casal, no mesmo login — escopo inicial)
**guarde o registro de cada compra concluída** e **consulte o menor preço já
pago** por item, além de **rever compras passadas** (data, mercado e itens).

Valor imediato: ao sair do mercado, a conclusão da compra deixa de ser só
“limpar a lista” — passa a registrar onde e quando se comprou, e a PWA ganha as
abas **Histórico** e **Menor preço** utilizáveis, em vez de “em breve”.

## Fontes e rastreabilidade

- Escopo: `docs/product/initial-scope.md` — seções **"Histórico de preços"** e
  regras de **"Lista de compras"** sobre conclusão (só comprados vão ao
  histórico; conclusão sem comprados não envia registro; itens não comprados
  permanecem).
- ADRs:
  - **0001** — `price-history-service` no primeiro conjunto de serviços;
    atualização do histórico após conclusão **por evento**, sem leitura
    direta do banco da lista.
  - **0002** — mercado obrigatório ao concluir; data inicia com a atual e é
    editável; moeda exclusivamente R$; normalização de nome (case-insensitive;
    sinônimos distintos); conclusão sem itens comprados não gera evento.
  - **0005** — linguagem de design mobile-first (bottom nav Lista / Histórico /
    Menor preço).
  - **0006** / **0009** — exceções temporárias ao API Gateway (auth e
    shopping-list); **qualquer outra chamada direta da PWA a um microserviço
    exige nova decisão registrada** — nesta feature: **CD-04** (PWA →
    `price-history-service`; ADR de exceção a criar no `PLAN.md`).
  - **0007** — validação local do JWT na borda HTTP de cada serviço.
  - **0008** — Playwright obrigatório (esta feature tem superfície de UI).
- Design: `docs/design/GUIA-DESIGN.md` (§2 tokens, §3 navegação, §4 composição,
  §5 componentes) e skill `ui-design`.
- Feature relacionada: `docs/features/shopping-list/SPEC.md` — fluxo de marcar
  comprado e concluir; RN-16/AC-21 e CD-05/CD-06 **deixam de valer** para o
  comportamento desta rodada (substituídos pelas RN/AC abaixo).
- Processo: `docs/process/sdd-workflow.md`.
- Estado: `docs/features/price-history/STATUS.md`.

## Fora de escopo

- **Média, último preço, tendência e comparação entre mercados** — explicitamente
  fora do escopo inicial do produto.
- **Edição ou exclusão** de uma compra já concluída (ou de itens dela).
- **Múltiplas listas ativas**, colaboração em tempo real e operação offline com
  fila (permanecem como na lista ativa).
- **Entrada por voz / código de barras**.
- **API Gateway** — permanece no backlog; esta rodada **não** o implementa. O
  acesso ao `price-history-service` usa a **exceção temporária** confirmada em
  **CD-04** (ADR correspondente no `PLAN.md`).
- **Cadastro, login e sessão** — feature de autenticação já entregue.
- **Mudança do fluxo de marcar como comprado** (quantidade/unidade/preço por
  unidade, aviso de divergência, máscara BRL) — permanece como em
  `shopping-list`; esta feature só altera a **conclusão** e as telas de
  histórico / menor preço.

## Fluxo principal

### 1) Concluir compra com mercado e data → lista + evento + histórico

1. Na aba **Lista**, com um ou mais itens marcados como comprados, a pessoa
   aciona **Concluir compra** (resumo já existente: quantos saem / quantos
   permanecem).
2. O fluxo de conclusão **passa a pedir mercado (obrigatório) e data da compra**
   (pré-preenchida com a data atual, editável; **não** pode ser futura —
   RN-04 / CD-07).
3. Confirmando com mercado e data válidos:
   - **somente** os itens marcados como comprados saem da lista ativa; os não
     comprados permanecem (comportamento já da lista);
   - a conclusão da lista **segue** mesmo que o broker esteja indisponível; o
     produtor garante entrega eventual do evento (outbox + retry — CD-06);
   - o `shopping-list-service` **publica o evento de conclusão** (produtor) com
     os dados necessários para o histórico (ver Contratos);
   - o `price-history-service` **consome** o evento (consumidor **idempotente**)
     e **persiste** o registro da compra (mercado, data, itens comprados com
     quantidade, unidade e preço por unidade).
4. Um toast de **sucesso** confirma a conclusão (“Compra concluída” ou
   equivalente). Histórico / Menor preço refletem o estado **após o consumo**
   do evento e **podem atrasar** se o broker estiver fora (CD-06).
5. **Concluir sem nenhum item comprado** continua permitido: a lista permanece
   igual, **não** se pede mercado/data e **não** se publica evento (ADR 0002).

### 2) Consultar menor preço (busca + listar todos)

1. A pessoa toca a aba **Menor preço** na bottom nav (passa a navegar de verdade).
2. A tela lista **todos** os itens já compreendidos no histórico, cada um com o
   **menor preço por unidade** já pago (R$), usando a comparação de nomes do
   RN-06 (case-insensitive **e** sem acentos — CD-05).
3. A pessoa pode **pesquisar por nome**; a lista filtra os itens cujo nome
   corresponde à busca (RN-07), com a mesma normalização.
4. Sem histórico ainda → empty state; falha de carga → erro com nova tentativa.
   Logo após uma conclusão, a tela pode ainda não refletir a compra até o
   consumo do evento (CD-06).

### 3) Rever compra concluída (Histórico)

1. A pessoa toca a aba **Histórico** na bottom nav (passa a navegar de verdade —
   CD-02).
2. A tela lista as **compras concluídas** (cada entrada com data e mercado),
   ordenadas da **mais recente para a mais antiga** (por data da compra; empate
   por ordem de registro).
3. Ao abrir uma compra, vê o **detalhe**: data, mercado e a lista dos itens
   comprados (nome, quantidade, unidade, preço por unidade em R$).
4. Sem compras → empty state; falha → erro com nova tentativa. Atraso possível
   após conclusão recente (CD-06).

## Regras de negócio

- **RN-01** — O **`price-history-service` é dono exclusivo** dos dados de
  histórico de preços (banco lógico próprio). Nenhum outro serviço lê ou grava
  esse banco diretamente. A lista ativa continua exclusiva do
  `shopping-list-service` (ADR 0001).
- **RN-02** — A atualização do histórico após uma conclusão com itens comprados
  ocorre **por evento** (produtor: `shopping-list-service`; consumidor:
  `price-history-service`), **não** por leitura do banco da lista (ADR 0001).
- **RN-03** — Ao concluir uma compra **com pelo menos um item comprado**,
  **mercado** (texto livre) e **data da compra** são **obrigatórios**. Mercado
  só com espaços não é válido.
- **RN-04** — A **data** da compra inicia com a **data atual** (calendário local
  da pessoa) e **pode ser editada** antes de confirmar (ADR 0002). **Não
  permite data futura**; o **passado é livre** (sem limite) — **CD-07**.
- **RN-05** — Um **registro de compra** no histórico contém: mercado, data, e
  para cada item comprado: nome, quantidade efetivamente comprada, unidade e
  preço por unidade. Moeda **exclusivamente R$** (ADR 0002). Só entram itens
  que estavam marcados como comprados na conclusão.
- **RN-06** — A **comparação de nomes no histórico** (agrupar o mesmo item para
  menor preço / busca) **não diferencia maiúsculas de minúsculas** e **ignora
  acentos/diacríticos** (ex.: `café` e `cafe` são o **mesmo** item — **CD-05**,
  alinhado à lista ativa). Nomes diferentes (ex.: `cebola` × `cebola branca`)
  são itens distintos; **sinônimos não** são unificados (escopo + ADR 0002).
- **RN-07** — A consulta de **menor preço** permite: (a) **listar todos** os
  itens já presentes no histórico com o **menor preço por unidade** de cada um;
  (b) **pesquisar por nome**. Nesta rodada a consulta mostra **somente** o menor
  preço (não média, último, tendência nem comparação entre mercados).
- **RN-08** — O **Histórico** lista compras concluídas (mais recente primeiro)
  e permite **abrir o detalhe** de cada uma (data, mercado, itens comprados).
- **RN-09** — Conclusão **sem** itens comprados: **não** pede mercado/data,
  **não** publica evento, **não** cria registro no histórico; a lista ativa
  permanece como estava (ADR 0002; alinhado a `shopping-list` RN-15/AC-20).
- **RN-10** — Conclusão **com** itens comprados: após confirmação válida, os
  comprados **saem** da lista ativa e a conclusão **segue** na lista. O
  histórico fica **eventualmente consistente**: o produtor usa **outbox +
  retry**; o consumidor é **idempotente**. UX: toast de **sucesso** na
  conclusão; Histórico / Menor preço refletem o estado **após o consumo** e
  **podem atrasar** se o broker estiver fora (**CD-06**).
- **RN-11** — O **mesmo evento de conclusão** não deve gerar **dois** registros
  de compra no histórico (**idempotência** no consumidor). Mecanismo técnico
  (chave/versionamento) fica para o `PLAN.md`; o comportamento observável é: no
  máximo um registro por conclusão bem-sucedida consumida.
- **RN-12** — Bottom nav: abas **Lista**, **Histórico** e **Menor preço** —
  **Histórico** e **Menor preço** ficam **habilitadas e com rota** (substitui
  CD-05 / “em breve” da lista em `shopping-list`). **Lista** permanece a aba da
  lista ativa.
- **RN-13** — Toda falha (rede, serviço, validação) é **visível na tela**
  (campo, área de conteúdo ou toast — nunca só no console); o que a pessoa
  digitou é preservado quando aplicável; nova tentativa é possível.
- **RN-14** — Telas desta feature seguem o `GUIA-DESIGN`: **4 estados**, tokens
  only, **uma** ação `primary` por tela, alvos ≥ 44px, tema claro/escuro.
- **RN-15** — Operações HTTP do histórico / menor preço exigem **sessão ativa**;
  JWT validado **localmente** na borda do `price-history-service` (ADR 0007).
  Sem token válido → 401 e retorno ao login (feature auth).
- **RN-16** — Enquanto o API Gateway não existir, a PWA chama o
  **`price-history-service` diretamente** (exceção temporária no espírito das
  ADRs 0006/0009 — **CD-04**). O `PLAN.md` cria a **ADR** que registra essa
  exceção, critérios de saída e migração futura para o gateway.

## Estados relevantes

### Checkout (sheet de conclusão — evolução da Lista)

- **Carregando** — ao confirmar: botão com rótulo de progresso (`Salvando…` /
  `Concluindo…`) e desabilitado; sem envio duplicado.
- **Vazio** — não se aplica ao formulário em si; conclusão sem comprados não
  mostra campos de mercado/data (RN-09).
- **Erro** — validação no campo: mercado vazio; data ausente; **data futura**
  (RN-04 / CD-07); falha de rede/serviço do **checkout da lista** no toast que
  permanece até o descarte, sheet aberto com o digitado preservado. A
  indisponibilidade do **broker** **não** impede o sucesso da conclusão da
  lista (CD-06).
- **Sucesso** — toast de conclusão; lista atualizada (comprados removidos). O
  registro pode **ainda não** aparecer imediatamente em Histórico / Menor preço
  até o consumo do evento (CD-06).

### Menor preço

- **Carregando** — skeleton no formato da lista (não spinner sozinho).
- **Vazio** — empty state rico (sticker + título + frase + CTA opcional para
  ir à Lista, se fizer sentido na composição) quando ainda não há itens no
  histórico (inclui o caso de atraso pós-conclusão enquanto o evento não foi
  consumido — CD-06).
- **Erro** — mensagem na área de conteúdo + **Tentar novamente**.
- **Sucesso** — lista (filtrada ou completa) com nome + menor preço em R$; busca
  sem resultado → empty de busca (frase curta, sem fingir lista).

### Histórico (lista de compras concluídas)

- **Carregando** — skeleton de linhas.
- **Vazio** — empty state rico quando não há compras concluídas (mesmo se uma
  conclusão recente ainda não foi consumida — CD-06).
- **Erro** — mensagem + **Tentar novamente**.
- **Sucesso** — lista de compras (data + mercado), mais recente primeiro; toque
  abre o detalhe.

### Detalhe de compra

- **Carregando** — skeleton do detalhe.
- **Vazio** — não esperado se a navegação veio de uma linha válida; se o
  registro não existir mais, erro/não encontrado com volta ao Histórico.
- **Erro** — mensagem + **Tentar novamente** (ou voltar).
- **Sucesso** — data, mercado e itens (nome, quantidade, unidade, preço/un. em
  R$).

## Design e UX

- Padrões: `docs/design/GUIA-DESIGN.md` §2–§5; skill `ui-design`.
- **Superfície de UI:** sim (ADR 0008) — evidência Playwright obrigatória no
  plano/validação.

### Checkout (evolução — formulário de app em bottom sheet)

- **Tipo de tela:** formulário de app em **bottom sheet** (sobre a Lista),
  estendendo o resumo de conclusão já existente.
- **Hierarquia do primeiro viewport do sheet:**
  1. Título do sheet (ex.: “Concluir compra”) em `--font-size-title` / `h2`.
  2. Apoio: resumo quantos saem / quantos permanecem (`caption` / `ink-muted`).
  3. Campos agrupados por whitespace: **Mercado \*** (texto) e **Data \***
     (controle de data; valor inicial = hoje; **sem** datas futuras — CD-07).
  4. CTA `primary` no terço inferior do sheet (“Confirmar”); cancelar/fechar
     visível (não só backdrop).
- Com **zero** itens comprados: mantém o resumo atual **sem** campos
  mercado/data; CTA confirma sem gravar histórico.

### Menor preço (lista / conteúdo)

- **Tipo de tela:** lista / conteúdo.
- **Hierarquia do primeiro viewport:**
  1. App bar — título **Menor preço** (`--font-size-h2`).
  2. Apoio curto opcional (uma linha `caption` / `ink-muted`), se ajudar.
  3. Campo de **busca por nome** (rótulo visível; placeholder não substitui
     rótulo) + lista: cada linha com **nome** (`body`) e **menor preço** em R$
     (`caption` / `ink-muted`); hairline entre linhas.
  4. Sem CTA `primary` concorrente na lista cheia (a busca é o controle
     principal); no empty state, um `primary` (ex.: “Ir para a Lista”) se a
     composição do empty state exigir ação.
- Bottom nav: aba **Menor preço** ativa (`--color-primary-text`).

### Histórico (lista / conteúdo)

- **Tipo de tela:** lista / conteúdo.
- **Hierarquia do primeiro viewport:**
  1. App bar — título **Histórico** (`--font-size-h2`).
  2. Apoio curto opcional (ex.: quantidade de compras), se houver itens.
  3. Lista de compras: cada linha com **data** e **mercado**; alvo ≥ 44px;
     hairline; **mais recente primeiro**.
  4. Empty state com `primary` sugerindo concluir uma compra / ir à Lista.
- Bottom nav: aba **Histórico** ativa.

### Detalhe de compra (lista / conteúdo)

- **Tipo de tela:** lista / conteúdo (detalhe).
- **Hierarquia do primeiro viewport:**
  1. App bar — título da compra ou “Compra” + ação **voltar** (`aria-label`).
  2. Bloco de apoio: **data** e **mercado** (`body` / `caption`).
  3. Lista de itens comprados: nome, quantidade + unidade, preço por unidade em
     R$.
  4. Sem segundo CTA primary; voltar é a navegação principal.

### Comportamento mobile (todas)

- Coluna única; `md+` centraliza em `--container-max`; padding inferior reserva
  bottom nav + safe area; toasts acima da bottom nav; tokens only; alvos ≥ 44px.

## Critérios de aceite

- [ ] **AC-01:** Com sessão ativa, tocar **Histórico** na bottom nav **navega**
  para a tela de histórico (rota real); a aba fica ativa em
  `--color-primary-text` e **não** exibe mais “em breve” desabilitado.
- [ ] **AC-02:** Com sessão ativa, tocar **Menor preço** na bottom nav **navega**
  para a tela de menor preço (rota real); a aba fica ativa e **não** exibe mais
  “em breve” desabilitado.
- [ ] **AC-03:** Com pelo menos um item marcado como comprado, ao abrir
  **Concluir compra**, a pessoa vê o resumo **e** os campos **Mercado**
  (obrigatório) e **Data** (pré-preenchida com a data de hoje, editável; sem
  permitir data futura).
- [ ] **AC-04:** Tentando confirmar a conclusão com itens comprados **sem
  mercado** (vazio ou só espaços) **ou com data futura**, a tela exibe erro no
  campo correspondente, **nenhum** item sai da lista, **nenhum** evento é
  publicado e **nenhum** registro de histórico é criado.
- [ ] **AC-05:** Confirmando a conclusão com mercado e data válidos (hoje ou
  passado) e N≥1 itens comprados: **somente** os comprados saem da lista ativa;
  os não comprados permanecem; um toast de **sucesso** confirma — **mesmo que**
  o broker esteja indisponível no momento (a lista não fica bloqueada —
  CD-06).
- [ ] **AC-06:** Após o **consumo** do evento de uma conclusão com itens
  comprados, a compra aparece no **Histórico** com a **mesma data** e o
  **mesmo mercado** informados, e o detalhe lista **todos** os itens que
  estavam comprados (nome, quantidade, unidade, preço por unidade). Até o
  consumo, Histórico / Menor preço podem ainda não refletir a compra (CD-06).
- [ ] **AC-07:** Concluindo **sem** nenhum item comprado: a lista permanece
  igual, **não** são exibidos campos de mercado/data (ou não são exigidos),
  **não** há novo registro no histórico e **não** há evento de conclusão.
- [ ] **AC-08:** Na tela **Menor preço**, com histórico existente, a lista
  mostra cada item distinto (comparação RN-06 — case-insensitive e sem acentos)
  com o **menor** preço por unidade já pago, formatado em R$. Itens
  registrados como `café` e `cafe` aparecem como **um** único item.
- [ ] **AC-09:** Pesquisando por nome na tela **Menor preço**, a lista passa a
  mostrar apenas itens cujo nome corresponde à busca (mesma normalização de
  RN-06); busca por `cafe` encontra o item registrado como `café`; busca sem
  resultado mostra empty de busca (não lista em branco sem explicação).
- [ ] **AC-10:** Dois registros do mesmo item com preços diferentes (ex.: R$
  10,00 e R$ 7,50) fazem a tela **Menor preço** exibir **R$ 7,50** (o menor)
  para esse item — sem média, último preço ou tendência.
- [ ] **AC-11:** Abrindo uma compra na lista do **Histórico**, o detalhe mostra
  data, mercado e os itens comprados daquela conclusão.
- [ ] **AC-12:** Sem compras no histórico, a tela **Histórico** mostra empty
  state rico (ilustração/sticker + título + frase); sem itens de preço, **Menor
  preço** mostra empty state rico — nunca área de conteúdo em branco.
- [ ] **AC-13:** Na primeira carga de Histórico / Menor preço / detalhe, a tela
  exibe **skeleton** no formato do conteúdo (não spinner centralizado sozinho).
- [ ] **AC-14:** Em falha ao carregar Histórico, Menor preço ou detalhe, a área
  de conteúdo exibe erro visível com **Tentar novamente**; nova tentativa
  refetcha.
- [ ] **AC-15:** Em falha ao concluir a **lista** (rede/serviço do
  shopping-list) com mercado/data já preenchidos, o erro é visível, o digitado
  permanece, a lista **não** remove itens “no fantasma” e nova tentativa é
  possível. (Indisponibilidade do broker **não** é tratada como falha desta
  conclusão — AC-05 / CD-06.)
- [ ] **AC-16:** Reprocessar / reentregar o **mesmo** evento de uma conclusão
  já consumida **não** cria um segundo registro de compra no histórico
  (idempotência observável — RN-11 / CD-06).
- [ ] **AC-17:** O `price-history-service` **não** lê o banco do
  `shopping-list-service`; a persistência do histórico após conclusão depende
  do **evento** (verificável por ausência de acesso cross-DB e pela existência
  do fluxo evento → persistência, com outbox + retry no produtor — CD-06).
- [ ] **AC-18:** Chamadas HTTP de histórico / menor preço **sem** JWT válido
  recebem 401; a PWA trata como sessão inválida (retorno ao login).
- [ ] **AC-19:** As telas Histórico, Menor preço e o sheet de checkout com
  mercado/data atendem ao GUIA-DESIGN: 4 estados, uma primary por tela (ou
  empty state), tokens only, alvos ≥ 44px, layout utilizável em ~360px e
  desktop em coluna única, tema claro/escuro.
- [ ] **AC-20:** Durante a confirmação do checkout, o botão fica desabilitado com
  rótulo de progresso; toques repetidos não geram segunda conclusão.
- [ ] **AC-21:** A PWA obtém Histórico / Menor preço chamando o
  **`price-history-service` diretamente** (exceção temporária CD-04), com JWT
  no header; o detalhe da ADR fica para o `PLAN.md`.

## Contratos afetados

### Acesso da PWA

- Enquanto o API Gateway não existir, a PWA chama o **`price-history-service`
  diretamente** para Menor preço e Histórico (**CD-04** / RN-16). O `PLAN.md`
  cria a **ADR** de exceção temporária (espírito das ADRs 0006/0009: escopo,
  base URL local, CORS se necessário, critérios de saída e migração futura).
- Chamadas ao `shopping-list-service` (checkout) e ao `auth-service` permanecem
  nas exceções já registradas; validação JWT local em cada serviço (ADR 0007).

### HTTP — `shopping-list-service` (evolução)

- **Concluir compra** passa a aceitar / exigir, no nível de produto, **mercado**
  e **data** quando houver itens comprados; validação de negócio rejeita
  conclusão com comprados sem esses dados ou com **data futura** (AC-04,
  CD-07).
- A conclusão bem-sucedida da lista **não** depende da disponibilidade
  imediata do broker: o produtor persiste a intenção de publicar (outbox) e
  faz **retry** até a entrega (CD-06). Detalhe técnico no `PLAN.md`.
- Caminhos, verbos, nomes de campos JSON e status HTTP exatos ficam para o
  `PLAN.md` (sem inventar schema aqui).
- Conclusão sem comprados: comportamento de lista inalterado; sem evento
  (AC-07).

### HTTP — `price-history-service` (novo; dono do histórico)

Operações de produto necessárias (paths/payloads técnicos no `PLAN.md`):

- **listar compras concluídas** — AC-01, AC-06, AC-12;
- **obter detalhe de uma compra** (data, mercado, itens) — AC-11;
- **listar menores preços** (todos os itens) — AC-08, AC-10;
- **buscar menores preços por nome** — AC-09;
- **Autenticação:** JWT no header; 401 sem token válido — AC-18;
- **Acesso:** chamada direta da PWA enquanto não houver gateway — AC-21 / CD-04.

### Evento de conclusão (mensageria)

- **Produtor:** `shopping-list-service` (outbox + retry — CD-06)
- **Consumidor:** `price-history-service` (idempotente — RN-11 / CD-06)
- **Quando publica:** após conclusão **bem-sucedida** da lista com **≥1** item
  comprado (e mercado/data válidos). A publicação pode ser **assíncrona** em
  relação ao toast de sucesso da lista.
- **Quando não publica:** conclusão sem itens comprados (RN-09).
- **Conteúdo no nível de produto** (sem inventar nomes de campos):
  identificação da conclusão (para **idempotência** — RN-11 / AC-16);
  mercado; data da compra; lista dos itens comprados com nome, quantidade
  efetivamente comprada, unidade e preço por unidade.
- **Nome do evento, versão, envelope e schema JSON** — detalhe técnico do
  `PLAN.md` / revisão arquitetural; não inventados nesta spec.
- **Falha / atraso:** conclusão da lista **segue**; histórico **eventualmente
  consistente**; UX = toast de sucesso na conclusão; telas de histórico
  refletem após o consumo e podem atrasar se o broker estiver fora (CD-06).

### Contratos compartilhados

- Tipos das operações HTTP do histórico e do evento, quando definidos, são
  candidatos a `libs/contracts`, sem compartilhar bancos entre serviços.

## Decisões confirmadas com o usuário (2026-10-16)

| ID | Decisão |
| --- | --- |
| CD-01 | Rodada **completa (A):** captura (mercado/data no checkout + evento + `price-history-service`) **e** UI de menor preço **e** UI de compras concluídas. |
| CD-02 | Bottom nav **Histórico** passa a navegar de verdade (deixa de estar desabilitada / “em breve”). |
| CD-03 | Nome da feature/pasta: **`price-history`**. |
| CD-04 | Enquanto o gateway não existir, a PWA chama o **`price-history-service` diretamente** (exceção temporária no espírito das ADRs 0006/0009). O **`PLAN.md` cria a ADR** correspondente. Resolve **D-01**. |
| CD-05 | Comparação de nomes no histórico / menor preço **ignora acentos/diacríticos** além de maiúsculas/minúsculas (`café` = `cafe`), como a lista ativa. Resolve **D-02**. |
| CD-06 | Conclusão da lista **segue**; histórico **eventualmente consistente** (outbox + retry no produtor; consumidor idempotente). UX: toast de sucesso na conclusão; Histórico/Menor preço refletem após o consumo e podem atrasar se o broker estiver fora. Resolve **D-03**. |
| CD-07 | Data da compra: **não** permite data **futura**; **passado livre** (sem limite). Resolve **D-04**. |

> **Menor preço na bottom nav:** habilitação e rota fazem parte da rodada
> completa (A) / CD-01 (UI de menor preço), em paralelo ao CD-02.

## Decisões em aberto

**Nenhuma.** D-01…D-04 foram resolvidas pelo usuário em 2026-10-16 e viraram
CD-04…CD-07.

> Não há decisão bloqueante aberta: a spec pode fechar o gate e seguir para o
> plano.

## Gate da spec

- [x] Objetivo, fluxo, regras e fora de escopo estão claros.
- [x] Critérios `AC-*` são verificáveis e não prescrevem implementação.
- [x] Contratos afetados estão identificados (HTTP + evento no nível de produto).
- [x] Não há decisão bloqueante aberta.
- [x] Artefato contém a frase canônica `Aprovado pelo usuário em YYYY-MM-DD`.

**Aprovado pelo usuário em 2026-10-16**

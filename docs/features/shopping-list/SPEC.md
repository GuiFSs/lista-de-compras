# Especificação — Lista de compras ativa

**Status:** Aprovada (Rodada 1 — 2026-10-13) · **Rodada 2 em rascunho, aguardando aprovação**
**Última atualização:** 2026-10-14
**Aprovação do usuário:** Aprovado pelo usuário em 2026-10-13 (Rodada 1) — **Rodada 2: pendente**

> **Ajuste pós-aprovação (2026-10-13, mesma sessão de aprovação):** por decisão
> explícita do usuário (**CD-13**), **RN-04** e **AC-08** foram ajustados para
> distinguir **edição** de nome em conflito (não aplica a mudança e não soma)
> da **criação** (pergunta se quer somar — CD-02). A frase canônica de
> aprovação permanece válida; não houve reabertura pós-validação (a validação
> ainda não começou).

## Rodada 2 — formatação de preço em BRL (2026-10-14)

**Status da Rodada 2:** Rascunho — aguardando aprovação
**Aprovação da Rodada 2:** pendente (a frase canônica será registrada em
"Gate da Rodada 2" quando o usuário aprovar o ajuste abaixo)

> **Ajuste de comportamento de UI pedido pelo usuário em 2026-10-14** (Rodada 2
> desta mesma feature; a **Rodada 1** — objetivo, fluxo, RN-01…RN-20,
> AC-01…AC-26 e a aprovação de 2026-10-13 — permanece válida e **não** é
> reaberta). O que muda: os **dois campos de preço** passam a formatar
> automaticamente em **BRL (R$)** enquanto a pessoa digita, com **máscara de
> centavos** (dígitos entram pela direita): digitar `3` → `R$ 0,03`; `30` →
> `R$ 0,30`; `3015` → `R$ 30,15`.
>
> - **Campos alcançados (decisão do usuário em 2026-10-14):** "Preço (R$)" do
>   sheet de adicionar/editar item (`item-form-sheet` — preço **planejado**) e
>   "Preço por unidade (R$)" do sheet de marcar como comprado (`purchase-sheet`).
> - **Fora do ajuste:** a **quantidade** continua com digitação livre de decimal
>   (vírgula ou ponto, RN-06); o **contrato HTTP não muda** (o payload segue
>   **número** JSON); o **backend não é tocado**; a **exibição da linha da lista**
>   (`item-row`, que já mostra `R$ 30,15`) permanece como está.
> - **Rastreabilidade:** decisão **CD-14**; regra **RN-21**; critério **AC-27**;
>   ajustes de texto em RN-06/CD-08, em AC-04/AC-10/AC-15/AC-25 e em
>   "Design e UX".
> - **Arquitetura:** **nenhuma** alteração de contrato, dados, ownership ou
>   integração entre serviços ⇒ **nenhuma ADR nova** é necessária (a máscara é
>   formatação de entrada na PWA; o serviço continua recebendo número).
> - **Superfície de UI:** **sim** (ADR 0008) ⇒ o `PLAN.md` da Rodada 2 precisa de
>   cenário Playwright para o **AC-27** — tratado na fase de plano, não aqui.
> - **Aprovação:** o gate da spec da Rodada 2 **só fecha** com a frase canônica
>   em "Gate da Rodada 2"; o que o usuário deve aprovar está listado no bloco de
>   handoff em `docs/features/shopping-list/STATUS.md`.

## Objetivo

Entregar a **lista de compras ativa** — a tela principal da PWA para quem faz a
compra no mercado: adicionar, editar e excluir itens, marcar itens como
comprados durante a compra e concluir a compra. É a primeira feature de produto
depois do login: a pessoa autenticada (o casal, no mesmo login — escopo inicial,
"Pessoas usuárias") passa a ter uma lista única e compartilhada para levar ao
mercado e usar com o polegar, no celular.

O valor imediato é substituir a lista de papel: registrar o que falta, ir
riscando o que já foi comprado e, no fim da compra, deixar na lista apenas o que
ainda falta para a próxima ida ao mercado. O histórico de preços, o menor preço
e a comparação são features futuras e **não** fazem parte desta rodada
(`docs/features/shopping-list/STATUS.md`, escopo confirmado em 2026-10-13).

## Fontes e rastreabilidade

- Escopo: `docs/product/initial-scope.md` — seções **"Lista de compras"** e
  **"Pessoas usuárias"**. Desta spec também valem regras herdadas da seção
  "Histórico de preços" que se referem ao ato de comprar: mercado/data só na
  conclusão (fora desta rodada) e unidade padronizada.
- ADRs:
  - **0001** — base técnica, microserviços e consequência "a atualização do
    histórico após a conclusão de uma compra ocorrerá por evento, e não por
    leitura direta do banco da lista" (fora desta rodada; registrado aqui para
    rastreabilidade da feature de histórico).
  - **0002** — dados de compra e acesso inicial (unicidade de nome
    case-insensitive — **ampliada nesta spec para também ignorar acentos**, CD-12
    —, unidade padronizada, quantidade planejada × comprada, aviso de
    divergência, itens editáveis/excluíveis, conclusão sem itens comprados).
  - **0005** — linguagem de design mobile-first (app bar + bottom nav
    Lista/Histórico/Menor preço, tokens).
  - **0006** — exceção temporária ao API Gateway (o gateway ainda não existe; a
    exceção registrada lá é limitada ao auth-service e "qualquer outra chamada
    direta da PWA a um microserviço exige nova decisão registrada").
  - **0007** — validação local do JWT na borda HTTP de cada serviço.
  - **0008** — Playwright como evidência obrigatória de UI no SDD (esta feature
    tem superfície de UI).
- Design: `docs/design/GUIA-DESIGN.md` (§2 tokens, §3 navegação, §4 composição,
  §5 componentes) e skill `ui-design`.
- Processo: `docs/process/sdd-workflow.md`.
- Formato e nível de detalhe: `docs/features/auth/SPEC.md`.

## Fora de escopo

- **Histórico de preços**: registro da compra concluída, mercado, data, tela de
  histórico e listagem. Nesta rodada concluir a compra **não grava** nada
  (RN-16) e não pede mercado/data.
- **Envio ao histórico e evento de conclusão** — serão especificados na feature
  do histórico (a ADR 0001 prevê evento para esse envio).
- **Menor preço e comparação** entre mercados/itens; média, último preço,
  tendência, busca por item.
- **Múltiplas listas ativas** ou listas por pessoa: existe uma única lista
  ativa compartilhada pela conta única (RN-01).
- **Colaboração em tempo real** entre dispositivos: a tela reflete o estado
  salvo no serviço quando carrega (RN-19); edições simultâneas do casal usam o
  último estado salvo (last write wins), sem aviso de conflito.
- **Operação offline** com fila e sincronização posterior: falha de rede é
  tratada como erro visível com nova tentativa (RN-17).
- **Entrada por voz e código de barras** (escopo inicial: voz vem depois da
  base).
- **Cadastro, login e sessão** — feature de autenticação já entregue.
- **Aviso de divergência de preço** (planejado × pago): o escopo inicial exige
  aviso apenas para **quantidade** (RN-10).

## Fluxo principal

1. A pessoa autenticada abre a PWA e chega à aba **Lista** (app bar com título,
   conteúdo em coluna única e bottom nav — RN-20).
2. A tela carrega a lista ativa do serviço, exibindo **skeleton** no formato do
   conteúdo (AC-02). Lista sem itens → empty state rico com o CTA "Adicionar
   item" (AC-03).
3. **Adicionar item**: a pessoa abre o formulário (bottom sheet), informa o
   **nome** (obrigatório) e, se quiser, quantidade planejada, unidade
   (lista padronizada) e preço planejado; salva e o item aparece na lista como
   pendente (AC-04, AC-05, AC-06).
   - Se já existir item com o mesmo nome (mesma comparação do RN-02 — ignorando
     maiúsculas/minúsculas, acentos/diacríticos e espaços nas extremidades), o
     sistema **pergunta se quer somar a quantidade** ao item existente: somando,
     nenhum item novo é criado; recusando, nada é adicionado e o formulário
     permanece aberto (AC-07).
4. **Editar item**: abrindo as ações da linha e escolhendo Editar, o mesmo
   formulário abre preenchido; salvar atualiza a linha (AC-10). Se o novo nome
   já existir em outro item (comparação do RN-02, incluindo acentos), a edição
   **não é aplicada** — o item permanece exatamente como estava, nada é somado a
   nenhum item e o formulário mostra o conflito ("Já existe um item com esse
   nome"), permitindo corrigir o nome ou cancelar (RN-04, AC-08). Renomear um
   item para o próprio nome normalizado (`cafe` → `café` do mesmo item) não é
   conflito.
5. **Excluir item**: escolhendo Excluir, a linha sai imediatamente e um toast
   oferece **"Desfazer"**; desfazer antes do descarte restaura o item (AC-11).
6. **Marcar como comprado** (durante a compra): as ações da linha oferecem
   marcar; o formulário pede **quantidade efetivamente comprada**, **unidade** e
   **preço por unidade** — todos obrigatórios — com quantidade e unidade
   pré-preenchidas a partir do que foi planejado (AC-12, AC-13, AC-15).
   - Se a quantidade comprada **diferir** da planejada, o sistema **avisa e pede
     confirmação** antes de marcar (AC-14).
   - Marcado, o item passa ao estado **comprado** e **permanece na lista**
     (AC-12, AC-18).
   - **Desmarcar** volta o item a pendente antes de concluir, preservando na
     tela os valores digitados para remarcar sem redigitar (AC-16).
7. **Concluir a compra**: o botão abre um resumo com quantos itens comprados
   sairão da lista e quantos permanecem; confirmando, **somente os itens
   marcados como comprados saem** da lista ativa, os não comprados permanecem e
   um toast confirma (AC-19). Nada é gravado ou enviado ao histórico (AC-21).
   - É permitido concluir sem nenhum item comprado; nesse caso a lista fica como
     está (AC-20).
8. Qualquer falha (carregar, salvar, excluir, marcar, concluir) é **visível na
   tela**, com nova tentativa possível e sem perder o que foi digitado
   (AC-22, AC-23).
9. Sessão expirada (24h) ou logout levam à tela de login (feature de
   autenticação; nada muda aqui).

## Regras de negócio

- **RN-01** — Existe **uma única lista de compras ativa** por vez, compartilhada
  pela conta única do casal (escopo inicial).
- **RN-02** — O **nome é obrigatório** e é o identificador do item: a comparação
  de nomes **não diferencia maiúsculas de minúsculas**, **ignora acentos/
  diacríticos** (normalização de acentos: `café` e `cafe` são o **mesmo item**;
  `Café` e `CAFE` também) e ignora espaços no início e no fim. Nomes diferentes
  permanecem itens distintos — sinônimos não são tratados como iguais (ex.:
  `cebola branca` ≠ `cebola`) (ADR 0002; decisão do usuário em 2026-10-13,
  CD-12).
- **RN-03** — Quantidade planejada, unidade e preço planejado são **opcionais**
  ao adicionar ou editar um item; só o nome é obrigatório.
- **RN-04** — **Nome já existente — criação e edição têm comportamentos
  diferentes.**
  - **Criação**: adicionar um nome já existente na comparação do RN-02
    (maiúsculas/minúsculas, acentos/diacríticos e espaços nas extremidades
    indiferentes) não cria um segundo item. O sistema **pergunta se a pessoa
    quer somar a quantidade** ao item existente:
    - confirmando, a quantidade informada é somada à do item existente (se a
      nova entrada não tiver quantidade, o item existente permanece como estava);
    - recusando, **nada é adicionado** e a pessoa permanece no formulário com o
      que digitou.
  - **Edição**: editar o nome de um item para um nome que já existe em **outro**
    item (mesma comparação do RN-02) **não aplica a mudança** — o item
    permanece exatamente como estava (nome e demais campos originais) e **nada é
    somado a nenhum item**. Nesse caso **não há pergunta de somar quantidade**: a
    pessoa vê o **conflito visível no formulário** ("Já existe um item com esse
    nome") e pode corrigir o nome ou cancelar. Renomear um item para o **próprio**
    nome normalizado (`cafe` → `café` do mesmo item) **não é conflito** e a edição
    é aplicada normalmente. (Decisão do usuário em 2026-10-13, CD-13.)
- **RN-05** — A **unidade** vem sempre de uma lista padronizada na interface —
  `unidade`, `kg`, `g`, `L`, `ml`, `pacote`, `caixa` — sem digitação livre, tanto
  no item quanto ao marcar como comprado (escopo inicial, ADR 0002).
- **RN-06** — Valores numéricos: a **quantidade** (planejada e efetivamente
  comprada) deve ser **maior que zero** quando informada e aceita **digitação
  livre de decimal com vírgula ou ponto**; **preço planejado e preço por unidade
  não podem ser negativos** — regra **defensiva** mantida no serviço/UI, que
  **na Rodada 2 fica inalcançável pela digitação**: nos campos de preço a
  digitação passa a ser pela **máscara de centavos em BRL** (**RN-21**, CD-14 —
  só dígitos, sem vírgula, ponto, sinal ou letras). (Decisão do usuário em
  2026-10-13, ajustada na Rodada 2 em 2026-10-14.)
- **RN-07** — Todo item ainda presente na lista ativa pode ser **editado ou
  excluído**, inclusive depois de marcado como comprado (escopo inicial,
  ADR 0002).
- **RN-08** — **Excluir** remove o item imediatamente e oferece **Desfazer** por
  um toast de curta duração (≈4s, guia §5). Desfazer restaura o item com os
  mesmos dados; expirado o toast, a exclusão é definitiva (decisão do usuário em
  2026-10-13).
- **RN-09** — **Marcar como comprado** exige, na mesma confirmação:
  **quantidade efetivamente comprada**, **unidade** e **preço por unidade** —
  todos obrigatórios (escopo inicial, ADR 0002).
- **RN-10** — **Divergência de quantidade**: quando a quantidade efetivamente
  comprada difere da quantidade planejada, o sistema **avisa antes de confirmar
  a marcação**, que só acontece após a confirmação da pessoa. Item **sem
  quantidade planejada** não gera aviso (escopo inicial; momento do aviso
  decidido pelo usuário em 2026-10-13).
- **RN-11** — Marcar como comprado **não remove** o item: ele passa ao estado
  comprado e permanece na lista ativa até a conclusão da compra.
- **RN-12** — **Desmarcar** (antes de concluir) devolve o item ao estado
  pendente e **preserva na tela** os valores já digitados (quantidade comprada,
  unidade, preço por unidade), que reaparecem se a pessoa abrir o formulário de
  marcar novamente. Se a PWA for recarregada, vale o pré-preenchimento do
  RN-13 (decisão do usuário em 2026-10-13).
- **RN-13** — Ao abrir o formulário de marcar como comprado, a **quantidade
  comprada** vem preenchida com a quantidade planejada e a **unidade** com a
  unidade planejada (quando existirem); o **preço por unidade começa vazio** — o
  preço planejado é referência, não o preço pago (decisão do usuário em
  2026-10-13).
- **RN-14** — **Concluir a compra** pede confirmação com **resumo** (quantos
  itens comprados saem e quantos permanecem). Confirmado, **somente os itens
  marcados como comprados saem** da lista ativa; os não comprados permanecem
  com seus dados para a próxima compra (escopo inicial).
- **RN-15** — É permitido **concluir uma compra sem nenhum item comprado**: nada
  sai da lista e nada é registrado.
- **RN-16** — Nesta rodada, concluir **não grava registro de compra**, **não
  pede mercado nem data** e **não publica evento**; o envio ao histórico fica
  para a feature do histórico (escopo confirmado com o usuário em 2026-10-13).
- **RN-17** — Toda falha (rede, serviço ou validação) é **visível na tela**
  (campo ou toast, nunca só no console); a pessoa pode tentar de novo e o que
  digitou é preservado (guia §5).
- **RN-18** — A lista mostra **primeiro os itens pendentes e depois os
  comprados** (guia §5).
- **RN-19** — O estado da lista vive no serviço dono dos dados: ao recarregar ou
  reabrir a PWA, o que foi salvo continua lá — inclusive os itens comprados,
  até uma conclusão (AC-24).
- **RN-20** — A tela segue o `GUIA-DESIGN`: os **4 estados** (carregando, vazio,
  erro, sucesso), tokens (nenhuma cor/espaço hardcoded), **uma única ação
  primary** na tela, alvos de toque ≥ 44px, tema claro e escuro — e a **bottom
  nav com as três abas** (`Lista`, `Histórico`, `Menor preço`), com **Lista
  ativa** e **Histórico/Menor preço visíveis porém desabilitadas** com indicação
  "em breve", sem rota (decisão do usuário em 2026-10-13).
- **RN-21** — **Máscara de centavos em BRL nos dois campos de preço** (Rodada 2,
  decisão do usuário em 2026-10-14 — **CD-14**): no **preço planejado** ("Preço
  (R$)" do sheet de adicionar/editar item) e no **preço por unidade** ("Preço por
  unidade (R$)" do sheet de marcar como comprado):
  - a digitação aceita **apenas dígitos** (sem vírgula, ponto, sinal ou letras);
  - cada dígito entra **pela direita** e é interpretado como **centavos**:
    digitar `3` → `R$ 0,03`; `30` → `R$ 0,30`; `3015` → `R$ 30,15`;
  - a **exibição** é o valor em BRL, com o prefixo `R$ ` e **duas casas decimais
    separadas por vírgula** (`R$ 0,00`, `R$ 0,03`, `R$ 30,15`), no campo e na
    linha da lista (`item-row`, que já exibe assim);
  - o **valor enviado ao serviço** é o **número** correspondente, **sem** prefixo
    ou vírgula (digitar `3015` envia `30.15` no payload): o **contrato HTTP não
    muda** (preço continua número JSON) e o **backend não é tocado**;
  - **sem nenhum dígito** o campo **não tem valor** — é ausência (`null`), **não**
    `0`: no item o preço planejado continua **opcional** (RN-03, AC-04) e na
    compra o preço por unidade continua **obrigatório** (RN-09, AC-13);
  - o **prefill** aplica a mesma máscara: abrir a edição de um item com preço
    planejado `12,50` (número `12.5`) mostra `R$ 12,50`; no sheet de marcar, o
    preço por unidade **começa vazio** (**RN-13 mantida**) e, quando existem
    valores preservados pelo desmarcar (RN-12), reaparece na máscara
    (`12.5` → `R$ 12,50`);
  - vale **apenas para os campos de preço**: a **quantidade** mantém a digitação
    livre de decimal (vírgula ou ponto, RN-06) e segue **maior que zero** quando
    informada.

## Estados relevantes

- **Carregando** — primeira carga da lista: **skeleton** no formato do conteúdo
  (linhas da lista), nunca spinner centralizado sozinho (guia §5 → AC-02).
  Ações locais mostram rótulo de progresso no botão (`Salvando…`) e botão
  desabilitado, sem envio duplicado (→ AC-26).
- **Vazio** — lista ativa sem itens: empty state rico (ilustração/emoji da
  paleta sticker + título + frase curta + CTA primary "Adicionar item"), nunca
  área de conteúdo em branco; a mesma composição cobre a lista esvaziada após
  concluir uma compra em que tudo foi comprado (→ AC-03).
- **Erro** — falha ao carregar (mensagem visível na área de conteúdo +
  "Tentar novamente", → AC-22); falha ao salvar/editar/excluir/marcar/desmarcar/
  concluir (toast de erro que **permanece até o descarte**, com o que foi
  digitado preservado e nova tentativa possível, → AC-23); erro de validação de
  campo (borda `--color-danger` + mensagem ligada por `aria-describedby` +
  `aria-invalid`, → AC-05, AC-13, AC-27); **conflito de nome na edição** (mensagem
  visível no formulário "Já existe um item com esse nome", sem aplicar a edição,
  → AC-08).
- **Sucesso** — lista renderizada (pendentes → comprados) e confirmações por
  toast de auto-dismiss ≈4s: "Item adicionado", "Item atualizado", "Item
  excluído" (com **Desfazer**), "Item marcado como comprado", "Item desmarcado",
  "Compra concluída" (→ AC-04, AC-07, AC-10, AC-11, AC-12, AC-16, AC-19).

## Design e UX

- Padrões: `docs/design/GUIA-DESIGN.md` §2 (tokens), §3 (navegação), §4
  (composição — obrigatória) e §5 (componentes); skill `ui-design`.
- **Tipo de tela**: **lista/conteúdo** (a tela Lista), com **empty state** como
  variação do estado vazio e **formulários de app em bottom sheet** (adicionar/
  editar item, marcar como comprado) e **sheets de confirmação** (duplicidade,
  divergência de quantidade, concluir compra).
- **Hierarquia do primeiro viewport** (na ordem):
  1. **App bar** — título `Lista de compras` em `--font-size-h2` (superfície +
     hairline abaixo, sem azul) e, à direita, a ação de ícone de **Concluir
     compra** (com `aria-label`).
  2. **Apoio curto** — uma linha em `--font-size-caption`/`--color-ink-muted`
     com o estado da lista (ex.: "3 itens pendentes · 2 comprados"), desde que
     exista pelo menos um item.
  3. **Conteúdo interativo** — a lista em coluna única: pendentes primeiro,
     comprados depois; cada linha com o **marcar** no lado do polegar
     (checkbox/alvo ≥ 44px), nome em `--font-size-body` e metadados
     (quantidade, unidade, preço) em `--font-size-caption`/`--color-ink-muted`;
     divisor hairline, sem sombra; item comprado com `line-through` +
     `--color-ink-faint` **sem** reduzir o alvo de toque. `role="list"`/
     semântica de lista, com estado do item exposto a leitores de tela.
  4. **Ação primária** — **"Adicionar item"** como única ação `primary` da
     tela, fixa no **terço inferior** acima da bottom nav (área do polegar);
     no estado vazio, a primary é a do bloco do empty state (não duplicar).
  5. **Bottom nav** — abas **Lista** (ativa, `--color-primary-text`),
     **Histórico** e **Menor preço** (inativas, `--color-ink-muted`, com
     indicação "em breve", desabilitadas e sem rota).
- **Componentes/tokens usados**:
  - App bar e bottom nav conforme §3, com `padding-bottom:
    var(--safe-bottom)` na barra e o conteúdo reservando
    `calc(var(--bottom-nav-height) + var(--safe-bottom) + var(--space-md))`.
  - Botões: `primary` (pill, ≥44px) para "Adicionar item" e para o salvar dos
    formulários; `secondary`/`ghost` para ações de apoio; `icon` (com
    `aria-label`) na app bar; `danger` (texto `--color-danger`, fundo
    `--color-danger-soft`) para **Excluir** e **Desmarcar**.
  - Toasts (`--z-toast`, acima da bottom nav): confirmações com auto-dismiss
    ≈4s; erros permanecem até o descarte; o toast de exclusão carrega a ação
    **Desfazer**.
  - Sheets (mobile): bottom sheet com `--radius-xl`, `--z-overlay`, foco preso,
    fecha com botão visível e `Esc`; um sheet de **ações do item** concentra
    Marcar/Desmarcar como comprado, Editar e Excluir — ações secundárias **não**
    ficam sempre visíveis na linha (guia §5).
  - Campos: superfície + 1px hairline + `--radius-xs`, **rótulo visível** acima
    (`--font-size-caption`/`--color-ink-secondary`), obrigatório com `*` e texto
    acessível "obrigatório", foco `--color-primary-text` + `--shadow-1`, erro
    `--color-danger` + `aria-describedby`/`aria-invalid`.
  - **Unidade**: `<select>`/sheet com as sete opções do RN-05 — nunca campo de
    texto livre; **preço** formatado em R$ (moeda única, ADR 0002). **Rodada 2
    (2026-10-14, CD-14):** nos **dois** campos de preço — "Preço (R$)" do item
    (planejado) e "Preço por unidade (R$)" da compra — a digitação usa a
    **máscara de centavos em BRL** (RN-21/AC-27): só dígitos, entrando pela
    direita, com exibição `R$ 0,03` … `R$ 30,15`; o **campo de quantidade** não
    muda (digitação livre de decimal).
  - Empty state e skeleton conforme §5; paleta sticker apenas decorativa (nunca
    em CTA ou estrutura).
- **Comportamento mobile**: uma coluna sempre; `md+` centraliza em
  `--container-max` sem sidebar; ações frequentes no terço inferior e ações
  destrutivas **fora** do lado direto da principal; teclado virtual não cobre o
  campo focado (rolar até ele); alvos ≥44×44px e `touch-action: manipulation`;
  `:focus-visible` com contorno `--color-primary-text`; contraste garantido
  pelos tokens; zoom 200% sem quebra; tema claro/escuro só por tokens.

## Critérios de aceite

- [ ] **AC-01:** Com sessão ativa, ao abrir a PWA a pessoa encontra a tela
  **Lista de compras** (app bar com título, conteúdo em coluna única e bottom
  nav com **Lista ativa** e **Histórico**/**Menor preço** visíveis, desabilitadas
  e com indicação "em breve"); tocar nas abas desabilitadas não navega para
  nenhuma rota.
- [ ] **AC-02:** Na primeira carga, enquanto a lista é buscada, a tela exibe
  **skeleton** no formato do conteúdo (linhas) e não um spinner centralizado;
  após a resposta, a tela mostra a lista ou o estado vazio correspondente.
- [ ] **AC-03:** Com a lista ativa sem itens, a tela mostra **empty state** com
  ilustração/emoji da paleta sticker, título, frase curta e o CTA primary
  **"Adicionar item"** — nunca uma área de conteúdo em branco.
- [ ] **AC-04:** Adicionando um item informando **apenas o nome** e salvando, o
  item aparece na lista como pendente com os campos opcionais
  (quantidade/unidade/preço planejado) vazios; a ausência deles não impede a
  criação. (Rodada 2: o preço planejado **vazio** permanece **sem valor** — a
  máscara de AC-27 só cria valor a partir do primeiro dígito.)
- [ ] **AC-05:** Tentando salvar um item **sem nome** (ou só com espaços), a tela
  exibe erro visível no campo, nenhum item é criado e nenhuma requisição de
  criação é enviada.
- [ ] **AC-06:** O campo de **unidade** oferece exatamente as opções `unidade`,
  `kg`, `g`, `L`, `ml`, `pacote` e `caixa`, e não aceita digitação livre — tanto
  ao adicionar/editar item quanto ao marcar como comprado.
- [ ] **AC-07:** Adicionando um nome já existente pela comparação do RN-02
  (diferença apenas de maiúsculas/minúsculas **ou de acentos** — ex.: `cafe` e
  `café`, `CAFE` e `Café`), nenhum segundo item é criado e o sistema **pergunta
  se a pessoa quer somar a quantidade**: confirmando, o item existente passa a
  ter a quantidade somada (quando a nova entrada tem quantidade) e a lista
  continua com um único item; recusando, a lista permanece igual e o formulário
  segue aberto com o que foi digitado.
- [ ] **AC-08:** Editando o nome de um item para um nome já existente em outro
  item (mesma comparação do RN-02, incluindo `cafe` → `café`), a edição **não é
  aplicada**: o item permanece exatamente como estava (nome e demais campos
  originais), **nada é somado** a nenhum item e nenhuma pergunta de somar
  quantidade é feita; o conflito fica **visível no formulário** ("Já existe um
  item com esse nome") e a pessoa pode corrigir o nome ou cancelar. A lista
  continua com um único item por nome (comparação sem diferenciar maiúsculas/
  minúsculas nem acentos). Renomear um item para o próprio nome normalizado
  (`cafe` → `café` do mesmo item) aplica a edição normalmente, sem conflito.
- [ ] **AC-09:** A lista ativa nunca contém dois itens com o mesmo nome
  (comparação sem diferenciar maiúsculas/minúsculas **nem acentos/diacríticos**,
  ex.: `Café` e `cafe` são o mesmo item; `Cebola` e `cebola` também), inclusive
  quando a tentativa de duplicar vem de requisição direta ao serviço —
  verificável por chamada HTTP direta que responde conflito/erro de negócio sem
  criar o segundo item.
- [ ] **AC-10:** Editando nome, quantidade planejada, unidade e/ou preço
  planejado de um item pendente e salvando, a linha da lista passa a exibir os
  novos valores. (Rodada 2: o **preço planejado** é digitado pela máscara de
  centavos de AC-27 — exibido em R$ e enviado ao serviço como **número** — e a
  linha continua exibindo o formato `R$ 30,15`.)
- [ ] **AC-11:** Excluindo um item, a linha sai da lista imediatamente e um toast
  oferece **"Desfazer"**; acionando "Desfazer" antes do descarte automático, o
  item volta à lista com os mesmos dados (nome, quantidade, unidade, preço
  planejado e, se havia, estado comprado); sem desfazer, a lista permanece sem o
  item.
- [ ] **AC-12:** Marcando um item como comprado com **quantidade efetivamente
  comprada**, **unidade** e **preço por unidade** informados, o item passa ao
  estado comprado (nome com `line-through` e cor atenuada, mantendo alvo de
  toque ≥44px) e **continua na lista ativa**.
- [ ] **AC-13:** Tentando confirmar a marcação sem um dos três campos
  obrigatórios, a tela exibe erro visível no campo correspondente, o item **não**
  é marcado e nenhuma requisição de marcação é enviada.
- [ ] **AC-14:** Quando a quantidade comprada informada **difere** da quantidade
  planejada, a confirmação mostra o aviso da diferença e o item só é marcado se
  a pessoa confirmar; quando o item **não tem quantidade planejada**, nenhum
  aviso é exibido e a marcação segue o fluxo normal.
- [ ] **AC-15:** Abrindo o formulário de marcar como comprado de um item com
  quantidade e unidade planejadas, a quantidade comprada vem **pré-preenchida**
  com a quantidade planejada, a unidade com a unidade planejada e o **preço por
  unidade começa vazio**. (Rodada 2: o preço por unidade **continua começando
  vazio** — RN-13 preservada — e, ao ser digitado, segue a máscara de AC-27;
  quando há valores preservados por um desmarcar, o preço reaparece na máscara —
  RN-12.)
- [ ] **AC-16:** Desmarcando um item comprado antes de concluir, ele volta ao
  estado pendente e, reabrindo o formulário de marcar na mesma sessão da tela,
  os valores digitados (quantidade comprada, unidade, preço por unidade)
  reaparecem; recarregando a PWA, vale o pré-preenchimento do AC-15.
- [ ] **AC-17:** Um item já marcado como comprado continua podendo ser editado e
  excluído enquanto estiver na lista ativa (a edição e a exclusão produzem o
  mesmo resultado observável de AC-10/AC-11, mantendo ou descartando o estado
  comprado conforme o caso).
- [ ] **AC-18:** Com itens pendentes e comprados na lista, os **pendentes
  aparecem primeiro** e os comprados depois.
- [ ] **AC-19:** Acionando **"Concluir compra"**, a pessoa vê um **resumo** com a
  quantidade de itens comprados que sairão da lista e a de itens que permanecem;
  confirmando, **somente os itens comprados saem** da lista ativa, os não
  comprados permanecem com seus dados e um toast confirma a conclusão;
  cancelando o resumo, nenhum item sai da lista.
- [ ] **AC-20:** É possível concluir uma compra **sem nenhum item comprado**: a
  lista permanece exatamente como estava (nenhum item sai) e nada é registrado.
- [ ] **AC-21:** Concluir uma compra nesta rodada **não grava registro de
  compra** (nenhum dado de mercado, data ou preço fica consultável), **não pede
  mercado/data** e **não publica evento**; a entrega não expõe rota/endpoint de
  histórico.
- [ ] **AC-22:** Em falha ao carregar a lista, a área de conteúdo exibe erro
  visível com a ação **"Tentar novamente"**; acionando-a, a carga é refeita e a
  lista é exibida quando a resposta chega.
- [ ] **AC-23:** Em falha ao adicionar/editar/excluir/marcar/desmarcar/concluir,
  a tela exibe erro visível (toast que permanece até o descarte), o que a pessoa
  digitou é preservado, uma nova tentativa é possível e a lista não fica com
  estado "fantasma" que não foi salvo.
- [ ] **AC-24:** Adicionar, editar, marcar e excluir itens e **recarregar a PWA**
  mantém o estado salvo: os itens continuam na lista (inclusive comprados) até
  uma conclusão — nenhum estado relevante vive só na memória do navegador.
- [ ] **AC-25:** A tela atende ao GUIA-DESIGN: uma única ação primary visível,
  nenhuma cor/espaçamento/raio hardcoded (só tokens), os **4 estados**
  implementados (AC-02, AC-03, AC-22/AC-23, AC-04/AC-12), alvos de toque
  ≥44px, layout utilizável em viewport de 360px e no desktop (coluna única
  centralizada em `--container-max`), tema claro e escuro funcionais e
  `:focus-visible` visível. (Rodada 2: o campo de preço com a máscara de AC-27
  mantém rótulo, mensagem de erro, `aria-invalid`/`aria-describedby` e foco pelos
  mesmos tokens — nada hardcoded.)
- [ ] **AC-26:** Durante o envio de qualquer formulário, o botão mostra rótulo de
  progresso (`Salvando…`) e fica desabilitado; toques repetidos não geram uma
  segunda requisição (verificável na aba de rede do navegador).
- [ ] **AC-27** (Rodada 2 — CD-14/RN-21): nos **dois campos de preço** — "Preço
  (R$)" do sheet de adicionar/editar item (planejado) e "Preço por unidade (R$)"
  do sheet de marcar como comprado — a digitação aceita **apenas dígitos** e o
  valor é interpretado como **centavos entrando pela direita**, exibido em BRL:
  digitar `3` mostra `R$ 0,03`; `30` mostra `R$ 0,30`; `3015` mostra `R$ 30,15`.
  O valor **enviado ao serviço é o número** correspondente — digitar `3015` envia
  `30.15` no payload (sem `R$`, sem vírgula), sem mudança de contrato HTTP.
  Abrindo a **edição** de um item com preço planejado `12,50`, o campo mostra
  `R$ 12,50`. Sem nenhum dígito o campo **não tem valor** (não é `0`): no item o
  preço planejado permanece **opcional** (salvar só com o nome cria o item —
  AC-04) e na compra o preço por unidade permanece **obrigatório** (confirmar sem
  ele mostra erro no campo e **não** envia requisição de marcação — AC-13). A
  digitação não aceita vírgula, ponto nem sinal — logo **não é possível digitar
  preço negativo** (a regra defensiva "preços ≥ 0" de RN-06/CD-08 permanece, sem
  caminho de entrada pela UI). A **quantidade** não é afetada e continua com
  digitação livre de decimal. (Verificável por interação nos dois sheets e pela
  requisição enviada.)

## Contratos afetados

- **Acesso da PWA (decisão confirmada em 2026-10-13):** enquanto o API Gateway
  não existir, a PWA chama o **shopping-list-service diretamente**, como
  **exceção temporária à ADR 0001** — o mesmo padrão já registrado para o login
  na ADR 0006, que hoje limita a exceção ao auth-service e exige nova decisão
  registrada para qualquer outra chamada direta. A decisão exige **nova ADR**
  (numeração seguinte a 0008) registrando escopo da exceção, base URL local,
  critérios de saída e migração futura para o gateway; **a ADR é criada como
  tarefa do `PLAN.md`** (não foi criada nesta spec). A chamada direta ao
  auth-service e a validação local do JWT em cada serviço permanecem como estão
  (ADR 0006, ADR 0007).
- **HTTP — shopping-list-service** (dono exclusivo dos dados da lista; ADR 0001 e
  o banco lógico do serviço da ADR 0004). Operações de produto necessárias para
  cumprir esta spec (caminhos, verbos, payloads, status e envelope de erro ficam
  para o `PLAN.md`, em nível técnico):
  - **Rodada 2 (2026-10-14) — o contrato não muda:** a máscara de centavos
    (RN-21/AC-27) é **formatação de entrada da PWA**; o preço continua viajando
    como **número JSON** (ex.: digitar `3015` envia `30.15` em `plannedPrice` /
    `unitPrice`). Nenhuma rota, campo, status ou evento é afetado e o backend não
    é tocado.
  - **obter a lista ativa** (itens com nome, quantidade/unidade/preço planejados
    e estado pendente/comprado + dados da compra quando houver) — AC-02, AC-24;
  - **criar item** (nome obrigatório; quantidade planejada, unidade e preço
    planejado opcionais) — AC-04, AC-05, AC-06;
  - **editar item** (nome, quantidade planejada, unidade, preço planejado) —
    AC-10;
  - **excluir item** — AC-11;
  - **marcar item como comprado** (quantidade comprada, unidade e preço por
    unidade obrigatórios) e **desmarcar** — AC-12, AC-13, AC-15, AC-16;
  - **concluir a compra** (remove da lista ativa os itens comprados; não grava
    registro e não publica evento nesta rodada) — AC-19, AC-20, AC-21.
  - **Regra de unicidade no serviço**: o nome é único na lista ativa
    (comparação sem diferenciar maiúsculas/minúsculas **nem acentos/diacríticos**,
    conforme RN-02). Na **criação**, a tentativa de usar um nome existente
    responde erro de negócio em vez de criar duplicata e a PWA pergunta se quer
    somar a quantidade (AC-07). Na **edição**, a tentativa de renomear para um
    nome existente em outro item **não é aplicada** pelo serviço/interface — o
    item permanece como estava e nada é somado (AC-08). Em nenhum caminho a
    lista fica com dois itens de mesmo nome — AC-07, AC-08, AC-09.
  - **Autenticação**: todas as operações exigem sessão ativa; o JWT viaja no
    header e é validado localmente na borda do serviço (ADR 0007). Sem token
    válido → 401, e a PWA volta ao login (feature de autenticação).
  - **Erro de rede/serviço**: a PWA exibe erro visível e permite nova tentativa
    — AC-22, AC-23.
- **Eventos: nenhum nesta rodada.** A conclusão da compra **não** publica evento
  (RN-16, AC-21). O envio ao histórico por evento, previsto na ADR 0001 para o
  futuro, é contrato da feature de histórico — se o `PLAN.md` de lá decidir pelo
  evento (ex.: `compra.concluida` com versão, payload e idempotência), ele será
  registrado naquela feature; proposta anotada no handoff desta spec, **sem**
  ADR criada aqui.
- **Contratos compartilhados**: os tipos das operações da lista, quando
  definidos, são candidatos a `libs/contracts` (como já ocorre com o contrato de
  login), compartilhados entre PWA e serviço sem compartilhar dados.

## Decisões confirmadas com o usuário (Rodada 1: 2026-10-13 · Rodada 2: 2026-10-14)

Registradas para rastreabilidade; **não** são decisões em aberto.

| ID | Decisão |
| --- | --- |
| CD-01 | Acesso: exceção temporária à ADR 0001 estendida ao shopping-list-service (PWA chama direto até o gateway existir), com nova ADR a criar no plano. |
| CD-02 | Duplicidade: pergunta e **soma** a quantidade ao item existente; recusar **cancela** a adição. |
| CD-03 | Aviso de divergência de quantidade acontece **ao marcar o item como comprado** (antes de confirmar), não na conclusão. |
| CD-04 | Desmarcar volta o item a pendente e **preserva os valores digitados** (na tela; recarregar volta ao pré-preenchimento). |
| CD-05 | Bottom nav com as **três abas**; Histórico e Menor preço desabilitadas com "em breve" e sem rota. |
| CD-06 | Concluir **não grava nada** nesta rodada (sem mercado/data, sem registro, sem evento). |
| CD-07 | Exclusão é **imediata com Desfazer** por toast (sem sheet de confirmação). |
| CD-08 | Validação numérica: quantidade **> 0** quando informada; preços **≥ 0**; decimais com vírgula ou ponto. **Nota da Rodada 2 (2026-10-14, CD-14):** nos **campos de preço** a digitação passa a ser pela **máscara de centavos em BRL** (só dígitos — RN-21), permanecendo a regra defensiva "preços ≥ 0" (inalcançável pela UI); a **quantidade** mantém a digitação livre com vírgula ou ponto. |
| CD-09 | Concluir mostra **resumo** (quantos saem / quantos permanecem) antes de remover. |
| CD-10 | Formulário de marcar pré-preenche **quantidade e unidade** planejadas; preço por unidade começa vazio. |
| CD-11 | Escopo da rodada: somente a lista ativa; histórico, menor preço e comparação ficam para feature(s) futura(s) (STATUS.md, 2026-10-13). |
| CD-12 | **Unicidade do nome ignora acentos/diacríticos** além de maiúsculas/minúsculas (`café` e `cafe` são o mesmo item); sinônimos continuam distintos (`cebola branca` ≠ `cebola`) — resolve a antiga D-01. |
| CD-13 | **Nome já existente na edição ≠ na criação**: editar o nome para um nome já existente em outro item **não aplica** a edição (item permanece como estava) e **não soma** nada, com o conflito visível no formulário; a criação mantém a pergunta de somar quantidade (CD-02). Referência canônica desta decisão: **CD-13** (RN-04, AC-08). |
| CD-14 | **Máscara de centavos em BRL nos dois campos de preço** (Rodada 2, 2026-10-14): "Preço (R$)" do sheet de adicionar/editar item (planejado) e "Preço por unidade (R$)" do sheet de marcar como comprado passam a formatar automaticamente em **R$** enquanto a pessoa digita, com **máscara de centavos** — só dígitos, entrando pela direita (`3` → `R$ 0,03`; `30` → `R$ 0,30`; `3015` → `R$ 30,15`). O serviço recebe o **número** (`30.15`): **contrato HTTP inalterado** e **backend não tocado**. A **quantidade** continua com digitação livre de decimal; a exibição da linha da lista permanece. Refina CD-08/RN-06 para os campos de preço; regra **RN-21**, critério **AC-27**. |

## Decisões em aberto

**Rodada 1: nenhuma.** A única decisão aberta (D-01, não bloqueante) foi
**resolvida pelo usuário em 2026-10-13** e virou a decisão confirmada **CD-12**
(unicidade do nome ignorando acentos/diacríticos), já refletida em RN-02, RN-04 e
nos AC-07/AC-08/AC-09.

> Não há decisão aberta (bloqueante ou não) na Rodada 1: as 13 decisões de
> produto e arquitetura foram confirmadas com o usuário em 2026-10-13.

**Rodada 2:**

| ID | Questão | Tipo | Responsável | Estado |
| --- | --- | --- | --- | --- |
| D-02 | Detalhes de exibição da máscara de centavos **não cobertos pelos exemplos confirmados** (nenhum deles decide): (a) uso de **separador de milhar** em valores ≥ `R$ 1.000,00` (`R$ 1.234,56` × `R$ 1234,56`); (b) aparência do campo **sem nenhum dígito** (campo vazio × `R$ 0,00` como texto de apoio); (c) comportamento ao **apagar** (remove o último dígito) e ao **colar** texto, e eventual **limite de dígitos** aceitos. | não bloqueante (não altera contrato, dados nem arquitetura — `AC-27` é satisfeito pelos exemplos confirmados) | usuário | aberta |

> Uma decisão **bloqueante** aberta impediria a aprovação. D-02 é **não
> bloqueante** e está listada explicitamente no handoff do `STATUS.md` para o
> usuário confirmar (ou corrigir) junto da aprovação da Rodada 2.

## Gate da spec (Rodada 1 — 2026-10-13)

- [x] Objetivo, fluxo, regras e fora de escopo estão claros.
- [x] Critérios `AC-*` são verificáveis e não prescrevem implementação.
- [x] Contratos afetados estão identificados (incl. o acesso direto da PWA, que
      exige nova ADR a criar no plano).
- [x] Não há decisão bloqueante aberta (e, no estado final, nenhuma decisão
      aberta — D-01 resolvida em CD-12).
- [x] Artefato contém a frase canônica `Aprovado pelo usuário em 2026-10-13`.

## Gate da Rodada 2 (2026-10-14)

> Esta seção vale **somente** para o ajuste da Rodada 2 (máscara de centavos em
> BRL nos dois campos de preço — CD-14/RN-21/AC-27). A Rodada 1 permanece
> aprovada e **não** é reaberta.

- [x] O ajuste está delimitado: dois campos de preço, formato, o que **não** muda
      (quantidade, contrato HTTP, backend, exibição da linha) e quem é a pessoa
      usuária (RN-21, AC-27).
- [x] O critério novo (**AC-27**) é verificável, cobre os **dois campos**, o
      formato exibido, os exemplos confirmados (`3` → `R$ 0,03`; `3015` →
      `R$ 30,15`), o **valor enviado ao serviço** (`30.15`, número) e a
      preservação de AC-04/AC-13/AC-15.
- [x] Contratos afetados conferidos: **nenhuma mudança** de contrato HTTP, evento,
      dados ou ownership ⇒ **nenhuma ADR nova** necessária.
- [x] `Superfície de UI: sim` (ADR 0008) registrada; o cenário Playwright do
      AC-27 fica como tarefa do `PLAN.md` da Rodada 2 (fase seguinte).
- [x] Não há decisão **bloqueante** aberta (D-02, não bloqueante, está registrada
      com as perguntas pendentes de confirmação do usuário).
- [ ] **Aprovação da Rodada 2:** aguardando a frase canônica — **pendente**.
      Quando o usuário aprovar, registrar aqui:
      `Aprovado pelo usuário em AAAA-MM-DD` (frase canônica da Rodada 2; a frase
      de 2026-10-13 acima continua valendo apenas para a Rodada 1).

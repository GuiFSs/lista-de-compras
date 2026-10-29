# Especificação — Importar compra pela foto da nota

**Status:** Aprovada
**Última atualização:** 2026-10-29
**Aprovação do usuário:** Aprovado pelo usuário em 2026-10-29

## Objetivo

Permitir que a pessoa autenticada (o casal, no mesmo login) **fotografe ou
envie a imagem da nota/cupom do mercado** e que a aplicação **reconheça
produtos, quantidades, unidades e preços**, apresente uma **revisão editável**
do que faltou e, ao confirmar, **registre a compra na lista ativa** (itens
marcados como comprados) para em seguida **concluir** com mercado/data e
enviar ao **histórico de preços** já existente.

Valor imediato: ao sair do mercado, em vez de marcar item a item, a nota vira
atalho para preencher a compra; o histórico continua sendo gravado só no
checkout (fluxo já entregue em `price-history`).

## Fontes e rastreabilidade

- Escopo: `docs/product/initial-scope.md` — regras de **"Lista de compras"**
  (marcar comprado, conclusão, unidade padronizada, normalização de nome) e
  **"Histórico de preços"** (mercado, data, preço por unidade em R$). A entrada
  por imagem **não** estava no escopo inicial (só voz/Gemini “depois da base”);
  esta feature **amplia** o produto com o mesmo provedor Gemini, na modalidade
  visão, para a nota.
- Decisões confirmadas com o usuário (2026-10-29):
  - **CD-01** — fluxo **B**: a nota registra a compra (marcar comprados →
    revisar → concluir → histórico), não só a lista planejada.
  - **CD-02** — provedor **Gemini** (tier Free da Developer API, modelo Flash
    com visão); chave só no backend; se o free tier deixar de existir, troca-se
    o adaptador sem mudar o domínio.
  - **CD-03** — item já na lista (mesmo nome normalizado): **substitui**
    quantidade/unidade/preço comprados pelo da nota (não soma).
  - **CD-04** — informações faltantes são completadas **manualmente** na
    revisão antes de aplicar.
- ADRs:
  - **0001** — microserviços, hexagonal, histórico por evento.
  - **0002** — unidade padronizada, preço por unidade, mercado/data no
    checkout, normalização de nome.
  - **0005** / **0008** — design mobile-first; Playwright obrigatório (UI).
  - **0007** — JWT local na borda.
  - **0009** — PWA → shopping-list-service direto (esta feature **amplia** o
    escopo da exceção com novos paths `/receipts/*` — ADR nova no plano).
  - **Nova (plano)** — Gemini Vision no shopping-list-service (porta
    hexagonal, segredo em env).
- Features relacionadas:
  - `docs/features/shopping-list/SPEC.md` — marcar comprado, lista única,
    normalização RN-02, unidades.
  - `docs/features/price-history/SPEC.md` — checkout com mercado/data + evento.
- Design: `docs/design/GUIA-DESIGN.md` (§2–§5) e skill `ui-design`.
- Processo: `docs/process/sdd-workflow.md`.

## Fora de escopo

- **Entrada por voz** e **código de barras** (permanecem backlog; voz poderá
  reutilizar a porta Gemini depois).
- **Múltiplas fotos** da mesma nota / juntar páginas / PDF multipágina.
- **Persistir a imagem** da nota (processar e descartar; sem galeria no
  servidor).
- **Edição ou exclusão** de compra já concluída no histórico.
- **Novo microserviço só de IA** nesta rodada (reconhecimento vive no
  `shopping-list-service` via adaptador).
- **API Gateway** — permanece no backlog; paths novos usam a exceção
  temporária ampliada (ADR no plano).
- **Alterar** o contrato do evento `shopping-list.purchase-completed` ou o
  ingest do `price-history-service` (reutiliza o checkout existente).
- **Matching fuzzy** além da normalização já usada na lista (case + acentos);
  nomes truncados da nota são corrigidos na revisão humana.
- **Offline** com fila de upload.

## Fluxo principal

1. Na aba **Lista**, a pessoa autenticada aciona **Importar nota** (câmera ou
   galeria — um único seletor de imagem).
2. A PWA envia a imagem ao `shopping-list-service` (**recognize**). Enquanto
   processa, a UI mostra estado de **carregando** (rótulo de progresso; sem
   spinner solto no void).
3. O serviço chama o **reconhecedor** (Gemini Vision, CD-02), obtém mercado,
   data (se legíveis) e linhas de item `{ name, quantity, unit, unitPrice }`,
   e devolve o resultado à PWA. A imagem **não** é gravada em disco/banco.
4. A PWA abre a **revisão** (sheet/tela de formulário de app): lista editável
   das linhas; campos faltantes ou inválidos ficam evidentes; a pessoa
   completa, corrige, desmarca linhas que não quer importar, ou cancela.
5. **Confirmar importação** (**apply**):
   - só linhas **completas e selecionadas** entram;
   - nome já na lista (normalização da shopping-list RN-02) → **substitui**
     os dados de compra e **marca como comprado** com qtd/unidade/preço da
     nota (CD-03);
   - nome novo → **cria** o item e marca como comprado;
   - itens da lista **fora** das linhas aplicadas **permanecem** como estavam
     (pendentes ou comprados anteriores não tocados).
6. Após apply com sucesso, a UI abre o **checkout** já existente com
   **mercado** e **data** pré-preenchidos quando a nota trouxe esses dados
   (editáveis; regras de `price-history` valem). Só ao confirmar o checkout
   os comprados saem da lista e o evento vai ao histórico.
7. Falhas (rede, Gemini, imagem ilegível, validação) são **visíveis** na UI;
   o que a pessoa já editou na revisão é preservado quando aplicável.

## Regras de negócio

- **RN-01** — Somente pessoa **autenticada** (JWT) importa nota; mesma conta
  única da lista ativa.
- **RN-02** — A importação opera sobre a **única lista ativa** existente.
- **RN-03** — Entrada é **uma imagem** por vez (JPEG/PNG/WebP); tamanho máximo
  e tipos aceitos são definidos no plano (defesa no serviço).
- **RN-04** — O reconhecimento extrai, quando possível: **mercado**, **data
  da compra** e **linhas** com nome, quantidade, unidade e **preço por
  unidade** em R$. Se a nota mostrar só total da linha e quantidade, o
  reconhecedor (ou a revisão) deriva `unitPrice = totalLinha / quantity`.
- **RN-05** — Unidade de cada linha deve ser uma das padronizadas:
  `unidade`, `kg`, `g`, `L`, `ml`, `pacote`, `caixa`. Unidade não mapeável
  chega vazia na revisão para preenchimento manual (CD-04).
- **RN-06** — Na **revisão**, para uma linha ser **aplicável** exige:
  nome não vazio, quantidade > 0, unidade válida e preço por unidade ≥ 0
  (obrigatório informar preço). Linhas incompletas **não** entram no apply
  (permanecem desmarcadas ou bloqueadas até completar).
- **RN-07** — **Substituição (CD-03):** ao aplicar, se já existir item com o
  mesmo nome normalizado (case + acentos + trim, igual shopping-list RN-02),
  **não** se soma quantidade planejada nem se cria segundo item: o item
  existente é **atualizado** e marcado como comprado com os valores da linha
  (quantity, unit, unitPrice). Não há diálogo “somar?” neste fluxo.
- **RN-08** — Itens da lista sem correspondente nas linhas aplicadas **não**
  são removidos nem desmarcados automaticamente.
- **RN-09** — Após apply bem-sucedido, a pessoa é levada ao **checkout** com
  mercado/data pré-preenchidos quando disponíveis; mercado continua
  **obrigatório** e data **não futura** (regras de `price-history`). Sem
  mercado na nota, o campo fica vazio para preenchimento.
- **RN-10** — A gravação no **histórico** ocorre **somente** no checkout
  confirmado (evento existente). Cancelar o checkout após apply **mantém**
  os itens marcados como comprados na lista.
- **RN-11** — A imagem **não** é persistida após o recognize (CD / privacidade).
- **RN-12** — Chave Gemini e demais segredos **nunca** vão à PWA nem ao git;
  só variáveis de ambiente no serviço.
- **RN-13** — Falha do reconhecedor (quota, timeout, imagem ilegível) → erro
  visível; nenhuma alteração na lista. A pessoa pode tentar outra foto ou
  seguir o fluxo manual.
- **RN-14** — Na revisão, máscara BRL de centavos (shopping-list RN-21) nos
  campos de preço por unidade; quantidade com decimal livre (vírgula/ponto).
- **RN-15** — Divergência quantidade planejada × comprada: no apply em lote
  **não** se exige o diálogo item a item da shopping-list RN-10 (a nota é a
  fonte da compra); a revisão humana substitui esse aviso.

## Estados relevantes

- **Carregando** — envio/recognize em andamento (“Lendo a nota…”); botão
  desabilitado. Apply: “Importando…”.
- **Vazio** — revisão sem nenhuma linha reconhecida: empty state com título,
  frase curta e ações (nova foto / cancelar), nunca área em branco.
- **Erro** — falha de rede/serviço/Gemini/validação/imagem: mensagem visível
  (toast ou faixa); o que foi digitado na revisão permanece quando o erro for
  do apply.
- **Sucesso** — revisão preenchida após recognize; toast após apply; checkout
  aberto; conclusão da compra como hoje (“Compra concluída”).

## Design e UX

- Padrões: `docs/design/GUIA-DESIGN.md` (§2 tokens, §3 nav, §4 composição,
  §5 sheets/campos/toasts) · skill `ui-design`.
- **Tipo de tela:**
  - Lista: permanece **lista/conteúdo**; a ação “Importar nota” é secundária
    ao FAB/primary “Adicionar item” (um `primary` por tela — importar é
    `secondary`/`ghost`/menu na app bar ou ação no terço inferior sem
    competir com o FAB primary).
  - Revisão: **formulário de app** (bottom sheet alto ou tela full no fluxo).
- **Hierarquia do primeiro viewport da revisão:**
  1. Título (`h1`/`h2`): “Revisar nota”
  2. Apoio curto (`body`, `ink-muted`): “Confira os itens antes de marcar
     como comprados”
  3. Conteúdo: lista de linhas editáveis (nome, qtd, unidade, preço) +
     opcional mercado/data no topo do formulário
  4. CTA primary no terço inferior: “Confirmar importação” (desabilitado se
     nenhuma linha aplicável)
- Componentes: bottom sheet / formulário com labels visíveis, `<select>` de
  unidade, máscara BRL, checkbox “incluir linha”, toasts, skeleton/progresso
  no recognize.
- Mobile: alvos ≥44px; fecha sheet com botão visível; tokens only; tema
  claro/escuro.

## Critérios de aceite

- [ ] **AC-01:** Dado pessoa autenticada na Lista, quando aciona Importar nota
  e escolhe uma imagem válida, então a PWA envia ao serviço e exibe estado de
  carregamento até a resposta.
- [ ] **AC-02:** Dado recognize bem-sucedido com linhas, quando a resposta
  chega, então a revisão lista cada linha editável (nome, quantidade,
  unidade, preço por unidade) e, se presentes, mercado e data.
- [ ] **AC-03:** Dado recognize que devolve linha com campo faltando, quando a
  pessoa vê a revisão, então essa linha **não** está pronta para apply até
  completar os obrigatórios (RN-06); feedback de campo inválido é visível.
- [ ] **AC-04:** Dado revisão com ao menos uma linha completa selecionada e
  item **já existente** na lista com o mesmo nome normalizado, quando
  confirma importação, então o item existente é marcado como comprado com
  quantity/unit/unitPrice da linha (**substitui**, não soma) e não há segundo
  item com o mesmo nome.
- [ ] **AC-05:** Dado revisão com linha completa de nome **novo**, quando
  confirma, então o item é **criado** na lista já marcado como comprado com
  esses valores.
- [ ] **AC-06:** Dado lista com itens que **não** aparecem nas linhas
  aplicadas, quando confirma importação, então esses itens permanecem
  inalterados (não removidos / não desmarcados automaticamente).
- [ ] **AC-07:** Dado apply bem-sucedido com mercado e/ou data reconhecidos,
  quando a UI segue, então o checkout abre com esses campos pré-preenchidos
  e editáveis; mercado vazio se a nota não trouxe.
- [ ] **AC-08:** Dado apply ok e checkout confirmado com mercado/data
  válidos, quando conclui, então os comprados saem da lista e o registro
  aparece no histórico (mesmo contrato/evento já existente).
- [ ] **AC-09:** Dado apply ok e pessoa **cancela** o checkout, quando volta à
  Lista, então os itens importados continuam marcados como comprados.
- [ ] **AC-10:** Dado imagem ilegível / falha Gemini / rede no recognize,
  quando falha, então erro é visível e a lista **não** muda.
- [ ] **AC-11:** Dado falha no apply após edição na revisão, quando o erro
  aparece, então os valores digitados na revisão são preservados para nova
  tentativa.
- [ ] **AC-12:** Dado fluxo completo, quando inspecionado o backend, então a
  imagem da nota **não** permanece armazenada após o recognize.
- [ ] **AC-13:** Dado ambiente sem `GEMINI_API_KEY` na PWA/build front, quando
  se inspeciona o bundle/cliente, então **nenhuma** chave Gemini está
  embutida (chamadas só ao shopping-list-service).
- [ ] **AC-14:** Dado revisão, quando edita preço por unidade, então a máscara
  BRL de centavos (shopping-list RN-21) se aplica.
- [ ] **AC-15:** Dado empty de linhas após recognize, quando a revisão abre,
  então empty state rico + ações (nova foto / fechar), sem tela em branco.

## Contratos afetados

- HTTP (novos; detalhe no `PLAN.md` / `libs/contracts`):
  - `POST /api/shopping-list/receipts/recognize` — multipart imagem →
    `{ market, purchaseDate, lines[] }` (+ metadados de confiança opcionais).
  - `POST /api/shopping-list/receipts/apply` — `{ market?, purchaseDate?,
    lines: [{ name, quantity, unit, unitPrice, include }] }` →
    `ShoppingListResponse` (lista completa, como demais mutações).
  - Erros: 400 validação/imagem; 401 JWT; 502/503 reconhecedor indisponível;
    413 imagem grande demais (limites no plano).
- Eventos: **nenhum novo** — reutiliza `shopping-list.purchase-completed` no
  checkout existente.
- Checkout HTTP existente: inalterado; apenas pré-fill na UI.

## Decisões em aberto

| ID | Questão | Tipo | Responsável | Estado |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

Todas as decisões bloqueantes (CD-01…CD-04) foram fechadas com o usuário em
2026-10-29.

## Gate da spec

- [x] Objetivo, fluxo, regras e fora de escopo estão claros.
- [x] Critérios `AC-*` são verificáveis e não prescrevem implementação.
- [x] Contratos afetados estão identificados.
- [x] Não há decisão bloqueante aberta.
- [x] Artefato contém a frase canônica `Aprovado pelo usuário em YYYY-MM-DD`.

Aprovado pelo usuário em 2026-10-29

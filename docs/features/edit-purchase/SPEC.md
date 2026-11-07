# Especificação — Editar compra concluída

**Status:** Aprovada
**Última atualização:** 2026-11-07
**Aprovação do usuário:** Aprovado pelo usuário em 2026-11-07

## Objetivo

Permitir que a pessoa autenticada corrija uma compra já concluída — mercado,
data e itens, inclusive incluir ou remover linhas — e que a consulta de menor
preço passe a refletir essa correção quando ela mudar o preço, o mercado, a
data, a quantidade ou a unidade da compra vencedora, ou quando outra compra
passar a ser a mais barata.

## Fontes e rastreabilidade

- Escopo: `docs/product/initial-scope.md` — seção **Histórico de preços**,
  atualizada por esta feature (a v1 de `price-history` e a evolução
  `lowest-price-by-market` declaravam edição de compra concluída fora de
  escopo).
- Decisão confirmada com o usuário (2026-11-07): a edição altera mercado, data
  e cada item (nome, quantidade, unidade, preço por unidade) e também permite
  incluir ou remover itens da compra.
- ADRs: **0001** (o `price-history-service` continua dono exclusivo do
  histórico), **0002** (preço por unidade, data não futura, unidades
  padronizadas), **0007** (JWT na borda), **0008** (Playwright), **0010** /
  **0011** (exceção de leitura direta). A escrita nova fica na **ADR 0014**.
- Features relacionadas: `docs/features/price-history/SPEC.md` (registro e
  consulta), `docs/features/lowest-price-by-market/SPEC.md` (vencedor, empate,
  drill-down). A regra de menor preço por unidade **não muda**.
- Design: `docs/design/GUIA-DESIGN.md` (§4 e §5) e skill `ui-design`.
- Processo: `docs/process/sdd-workflow.md`.

## Fora de escopo

- Excluir a compra inteira.
- Devolver a correção para a lista ativa (os itens já saíram no checkout).
- Republicar `shopping-list.purchase-completed` ou criar evento novo.
- Média, último preço, tendência ou qualquer critério que não seja o menor
  preço por unidade.
- API Gateway.
- Edição offline.

## Fluxo principal

1. Na aba **Histórico**, a pessoa abre o detalhe de uma compra concluída.
2. Aciona **Editar**. O formulário abre preenchido com mercado, data e as
   linhas atuais (nome, quantidade, unidade, preço por unidade), na ordem
   gravada.
3. Ela altera campos, inclui linha ou remove linha, e confirma com **Salvar**.
4. O `price-history-service` substitui mercado, data e a lista de itens daquela
   compra. `id` e `createdAt` permanecem.
5. O detalhe mostra a compra atualizada. A lista do Histórico, na próxima
   abertura, mostra mercado, data e quantidade de itens novos.
6. Na próxima abertura de **Menor preço** ou do drill-down do item, a
   agregação já existente relê os registros e mostra o vencedor atual.

## Regras de negócio

- **RN-01** — Só pessoa autenticada edita. Sem JWT válido, 401 e volta ao
  login, como nas demais rotas do histórico.
- **RN-02** — A edição vale só para uma compra que já está no histórico. Id
  inexistente responde 404 e nada é criado.
- **RN-03** — Mercado é obrigatório (texto livre, não só espaços). Data é
  `YYYY-MM-DD` real, não futura; o passado é livre (mesma regra do checkout).
- **RN-04** — Cada linha exige nome não vazio, quantidade > 0, unidade entre
  `unidade`, `kg`, `g`, `L`, `ml`, `pacote` e `caixa`, e preço por unidade
  ≥ 0 em R$.
- **RN-05** — Na mesma compra, dois nomes iguais depois da normalização
  (caixa e acentos) não salvam. A compra permanece como estava e o conflito
  aparece no formulário.
- **RN-06** — A compra continua com pelo menos um item. Sem linhas, **Salvar**
  fica desabilitado e nenhuma requisição é enviada. O serviço também recusa
  lista vazia.
- **RN-07** — A lista enviada substitui as linhas da compra, na ordem
  enviada. Incluir acrescenta; remover tira. `id` e `createdAt` não mudam.
- **RN-08** — O menor preço continua sendo o menor preço **por unidade** do
  nome normalizado, com o desempate já definido (data mais recente e, depois,
  o menor id). Não há campo gravado de menor preço: a próxima consulta
  recalcula a partir dos registros, inclusive desta compra editada.
- **RN-09** — Se a edição fizer esta compra ostentar o menor preço daquele
  nome, a linha de Menor preço passa a mostrar esse preço e o mercado, a
  data, a quantidade e a unidade desta compra. O mesmo vale para a linha
  daquele mercado no drill-down.
- **RN-10** — Se o preço que era o menor subir, a linha vencedora for
  removida ou o item for renomeado, outra compra (ou outra linha) assume.
  Se nenhum registro restar com aquele nome, o item sai de Menor preço e o
  drill-down deixa de encontrá-lo. O nome novo, se houver, entra na
  agregação dele.
- **RN-11** — Edição que não muda preço, mercado, data, quantidade nem
  unidade do vencedor deixa Menor preço e o drill-down iguais.
- **RN-12** — Falha de rede ou validação é visível. O que foi digitado
  permanece para corrigir. A lista ativa não é alterada.

## Estados relevantes

- **Carregando** — detalhe em skeleton, como hoje; durante o salvamento o
  botão mostra `Salvando…` e fica desabilitado.
- **Vazio** — formulário sem nenhuma linha: frase curta de que a compra
  precisa de um item e **Salvar** desabilitado. Não é empty da tela de
  histórico.
- **Erro** — campo inválido ou nome repetido no formulário; falha de rede ou
  400 do serviço em faixa/toast, com os valores digitados preservados.
- **Sucesso** — detalhe atualizado e confirmação visível. Menor preço reflete
  a mudança na próxima abertura daquela tela.

## Design e UX

- Padrões: `docs/design/GUIA-DESIGN.md` (§2 tokens, §4 composição, §5 sheets,
  campos e toasts) · skill `ui-design`.
- **Tipo de tela:** o detalhe permanece **lista/conteúdo**. A edição é
  **formulário de app** (bottom sheet).
- **Hierarquia do primeiro viewport do formulário:**
  1. Título: “Editar compra”
  2. Apoio: mercado e data
  3. Conteúdo: linhas (nome, quantidade, unidade, preço) com remover em cada
     uma e ação de incluir linha
  4. CTA primary no terço inferior: “Salvar”
- Um primary por superfície: no sheet, só **Salvar**. **Cancelar** e
  **Incluir item** são secundários. Remover linha é ação de perigo, não o
  primary. No detalhe, **Editar** é secundário para a tela continuar sendo
  de leitura.
- Máscara BRL de centavos no preço. Unidade em `<select>`, sem digitação
  livre. Alvos ≥ 44px. Só tokens. Tema claro e escuro.

## Critérios de aceite

- [ ] **AC-01:** Dado o detalhe de uma compra carregado, quando a pessoa
  aciona Editar, então o formulário abre preenchido com mercado, data e cada
  item (nome, quantidade, unidade e preço por unidade).
- [ ] **AC-02:** Dado um formulário válido com mercado, data ou campos de
  item alterados, quando salva, então o detalhe mostra os novos valores e o
  id da compra é o mesmo.
- [ ] **AC-03:** Dado uma linha nova completa, quando salva, então o detalhe
  inclui essa linha na ordem enviada.
- [ ] **AC-04:** Dado a remoção de uma linha ainda restando outra, quando
  salva, então o detalhe não mostra a linha removida. Sem nenhuma linha,
  Salvar fica desabilitado e nenhuma alteração é enviada.
- [ ] **AC-05:** Dado dois itens da mesma compra com o mesmo nome
  normalizado, quando tenta salvar, então a compra não muda e o conflito
  fica visível no formulário.
- [ ] **AC-06:** Dado mercado vazio, data futura ou linha com nome,
  quantidade, unidade ou preço inválidos, quando tenta salvar, então o erro
  fica visível no campo e a compra não muda.
- [ ] **AC-07:** Dado uma edição cujo preço por unidade passa a ser o menor
  daquele nome, quando a pessoa abre Menor preço, então a linha mostra esse
  preço com o mercado, a data, a quantidade e a unidade desta compra. O
  drill-down do item mostra a linha atualizada daquele mercado.
- [ ] **AC-08:** Dado o preço vencedor que sobe, a linha vencedora removida
  ou o item renomeado, quando a pessoa abre Menor preço, então o nome
  anterior mostra a compra que passou a vencer, ou some se não restar
  registro. O nome novo, quando houver, aparece com o menor preço dele.
- [ ] **AC-09:** Dado uma edição que não altera preço, mercado, data,
  quantidade nem unidade do vencedor, quando a pessoa abre Menor preço,
  então a linha daquele item permanece igual.
- [ ] **AC-10:** Dado falha de rede ao salvar, quando a resposta não chega,
  então a mensagem fica visível e o que foi digitado permanece no
  formulário.
- [ ] **AC-11:** Dado uma edição aceita, quando o registro é lido de novo,
  então `createdAt` é o original. A lista ativa não é modificada por esta
  operação.

## Contratos afetados

- HTTP: `PATCH /api/price-history/purchases/{id}`
  - Request: `{ market, purchaseDate, items: [{ name, quantity, unit, unitPrice }] }`
  - 200: `PurchaseDetailResponse` (mesmo shape do GET)
  - 400: validação (mercado, data, item, lista vazia, nome repetido na compra)
  - 401: sem sessão
  - 404: id inexistente
- Eventos: nenhum.

## Decisões em aberto

| ID | Questão | Tipo | Responsável | Estado |
| --- | --- | --- | --- | --- |
| — | Nenhuma. A extensão da exceção de gateway está na ADR 0014. | — | — | resolvida |

## Gate da spec

- [x] Objetivo, fluxo, regras e fora de escopo estão claros.
- [x] Critérios `AC-*` são verificáveis e não prescrevem implementação.
- [x] Contratos afetados estão identificados.
- [x] Não há decisão bloqueante aberta.
- [x] Artefato contém a frase canônica `Aprovado pelo usuário em 2026-11-07`.

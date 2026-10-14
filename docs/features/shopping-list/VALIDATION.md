# Validação — Lista de compras ativa

**Spec:** `docs/features/shopping-list/SPEC.md` (aprovada em 2026-10-13 — 26 ACs)
**Plano:** `docs/features/shopping-list/PLAN.md` (aprovado em 2026-10-13 — matriz AC ↔ E2E §3)
**Data:** 2026-10-14
**Resultado:** Aprovada
**Superfície de UI (do plano):** sim

DoR da validação (§4 do `docs/process/sdd-workflow.md`): implementação e testes
concluídos (T-01…T-19), nenhuma tarefa pendente/reaberta no `STATUS.md`, e o
handoff do `test-engineer` (T-17) **registra a corrida Playwright**
(`npx nx e2e web-e2e` → 32 passed). Gate da ADR 0008 satisfeito.

## Evidências por critério

Legenda: **Comando E2E** = `npx nx e2e web-e2e` (ou filtro `-- --grep`), corrida
real registrada na seção "Comandos executados". **Unit web** = `npx nx test web`;
**Integração/unit backend** = `npx nx test shopping-list-service`.

| AC | Estado | Evidência automatizada | Playwright (se AC de UI) | Evidência contrato/ops | Observação |
| --- | --- | --- | --- | --- | --- |
| AC-01 | aprovado | Unit web: `bottom-nav.spec.ts` "marca a aba Lista como ativa na rota da lista (AC-01)", "Histórico e Menor preço ficam desabilitadas, com 'em breve' e sem rota (AC-01)", "tocar nas abas desabilitadas não navega (AC-01)"; `authenticated-shell.spec.ts` "mostra o título padrão, a bottom nav e o 'Sair' (AC-01)" | `load.spec.ts` "abre na Lista: app bar com título, coluna única e bottom nav com Lista ativa e Histórico/Menor preço desabilitadas que não navegam" | — | — |
| AC-02 | aprovado | Unit web: `shopping-list-page.spec.ts` "busca a lista ao entrar e mostra o skeleton na primeira carga (AC-02)"; `shopping-list-store.spec.ts` "começa em loading e, após a resposta, aplica a ordem recebida do serviço (AC-02/RN-18)" | `load.spec.ts` "primeira carga mostra skeleton na forma da lista (sem spinner) e depois a lista" | — | Skeleton por `role=status`/`aria-busy`; `.spinner` inexistente |
| AC-03 | aprovado | Unit web: `shopping-list-page.spec.ts` "com a lista vazia, mostra o empty state com um único CTA primary (AC-03)" e "concluir com tudo comprado cai no estado vazio, nunca numa área em branco (AC-03)" | `load.spec.ts` "lista vazia mostra empty state com CTA primary Adicionar item" | — | Empty state com sticker + título + frase + CTA primary |
| AC-04 | aprovado | Unit web: `item-form-sheet.spec.ts` "adiciona só com o nome, com os opcionais vazios (AC-04)"; `shopping-list-store.spec.ts` "cria item e aplica a lista ativa completa devolvida (AC-04)"; `item-row.spec.ts` "mostra nome e metadados planejados do item pendente (AC-04/AC-10)" | `items.spec.ts` "adiciona item só com o nome: aparece pendente com opcionais vazios" | Contrato: `POST /api/shopping-list/items` → 201, corpo `{plannedQuantity:null,unit:null,plannedPrice:null}` (`libs/contracts/README.md`) | — |
| AC-05 | aprovado | Unit web: `item-form-sheet.spec.ts` "salvar sem nome (ou só com espaços) mostra erro no campo e não faz requisição (AC-05)" | `items.spec.ts` "salvar sem nome/só com espaços: erro no campo e nenhuma requisição" | — | Assere 0 requisições de criação e `aria-invalid` |
| AC-06 | aprovado | Unit web: `item-form-sheet.spec.ts` e `purchase-sheet.spec.ts` "oferece unidade em select com exatamente as 7 opções, sem digitação livre (AC-06)"; contrato `ITEM_UNITS` em `libs/contracts/src/http/shopping-list.ts` | `items.spec.ts` "unidade oferece exatamente as 7 opções, sem digitação livre (item e compra)" | Contrato: `unit` fora de `ITEM_UNITS` → 400 (`libs/contracts/README.md`) | E2E compara as opções com `ITEM_UNITS` importado |
| AC-07 | aprovado | Unit web: `item-form-sheet.spec.ts` "na criação, o 409 abre a pergunta de soma e confirmar reenvia a resolução (AC-07/CD-02)" e "na criação, recusar a soma não muda o digitado e não faz nova requisição (AC-07)"; `shopping-list-store.spec.ts` "409 na criação é duplicidade de fluxo: sem erro visível e sem estado aplicado (AC-07)" e "confirmar a soma reenvia a criação com duplicateResolution (CD-02)"; Integração backend: `shopping-list-postgres.spec.ts` "chamada HTTP direta com nome equivalente responde 409 e não cria segundo item" | `duplicates.spec.ts` "`cafe`/`Café`: pergunta somar; confirmar soma e mantém um item; recusar mantém o form com o digitado" | Contrato: 409 `duplicate-item-name` + `duplicateOf`; `duplicateResolution: "sum-planned-quantity"` → 200 (`libs/contracts/README.md`) | Normalização sem acento/caixa: `item-name.spec.ts` (backend) |
| AC-08 | aprovado | Unit web: `item-form-sheet.spec.ts` "na edição, o 409 é conflito no formulário: não aplica e não soma (AC-08/CD-13)" e "renomear para o próprio nome normalizado aplica a edição (AC-08)"; `shopping-list-store.spec.ts` "409 na edição é conflito de formulário: não aplica, não soma e não gera erro visível (AC-08/CD-13)"; Integração backend: `shopping-list-postgres.spec.ts` "erros de contrato no banco real: 400/404/409/401…" (PATCH 409 terminal, item inalterado; renomear para o próprio nome → 200) | `duplicates.spec.ts` "editar para um nome existente: conflito visível no formulário, a edição **não** é aplicada e **nada** é somado; renomear para o próprio nome aplica" | Contrato: `PATCH /items/{id}` → 409 sem soma; `error: duplicate-item-name` | — |
| AC-09 | aprovado | **Backend-only (não observável na UI).** Integração com Postgres real: `shopping-list-postgres.spec.ts` (describe "AC-09 — a unicidade do nome é garantida pelo banco"): "chamada HTTP direta com nome equivalente responde 409 e não cria segundo item" (`CAFE`/`Cafe`/`café`/`  cafe ` → 409 + `duplicateOf`), "o índice único parcial barra a duplicata inserida direto no banco" (`23505`), "o índice é parcial (`removed_at is null`): nome de item removido fica livre", "excluir via HTTP libera o nome e recriar o item é permitido (AC-09 + AC-11)"; corrida (T-18): "sem resolução: corrida reconhecida → 409 canônico, sem 500 e sem duplicata" e "dois POSTs concorrentes com o mesmo nome: nenhum 500, uma linha, sem duplicata" | **N/A — AC não observável na UI** (matriz do `PLAN.md` §3) | Comando: `npx nx test shopping-list-service` → **162 passed / 14 arquivos** (Postgres do Docker no ar) | Duplicata por chamada HTTP direta + índice único parcial provados com banco real |
| AC-10 | aprovado | Unit web: `item-form-sheet.spec.ts` "prefill da edição e limpar um opcional envia null (RN-03/AC-10)"; `shopping-list-store.spec.ts` "edita item e aplica a lista devolvida (AC-10)"; `shopping-list-page.spec.ts` "salvar a edição atualiza a linha e confirma com toast (AC-10)" e "a ação da linha abre o sheet de ações e Editar preenche o formulário (AC-10)" | `items.spec.ts` "editar planejados e salvar atualiza a linha" | Contrato: `PATCH /items/{id}` → 200 | — |
| AC-11 | aprovado | Unit web: `shopping-list-page.spec.ts` "excluir sai na hora e o toast oferece 'Desfazer' (AC-11)", "'Desfazer' restaura o item com os mesmos dados, inclusive comprado (AC-11)", "sem desfazer, o item permanece excluído e nada é restaurado (AC-11)"; `shopping-list-store.spec.ts` ("exclui na hora e, sem desfazer, a janela expira sem restaurar nada", "'Desfazer' cancela a janela e restaura o item com os mesmos dados"); `toast.spec.ts`/`toast-host.spec.ts` (ação Desfazer); Integração backend: `shopping-list-postgres.spec.ts` (DELETE + restore) | `delete-undo.spec.ts` "excluir sai na hora; Desfazer restaura com os mesmos dados (inclusive comprado); sem desfazer permanece excluído" | Contrato: `DELETE /items/{id}` (idempotente) e `POST /items/{id}/restore` | — |
| AC-12 | aprovado | Unit web: `item-row.spec.ts` "comprado fica riscado e atenuado, com os dados da compra (AC-12)" e "mantém o alvo de marcar ≥44px em ambos os estados (AC-12/AC-25)"; `shopping-list-store.spec.ts` "marca como comprado com o payload do contrato e aplica a lista (AC-12)" | `purchase.spec.ts` "marcar com os 3 campos: item comprado com `line-through` e alvo ≥44px, **continua na lista**" | Contrato: `PUT /items/{id}/purchase` → 200 (item permanece na lista) | — |
| AC-13 | aprovado | Unit web: `purchase-sheet.spec.ts` "os três campos são obrigatórios: erro em cada campo e nenhuma requisição (AC-13)" e "valida quantidade > 0 e preço >= 0 sem enviar a marcação (RN-06/AC-13)" | `purchase.spec.ts` "sem um dos campos obrigatórios: erro no campo e nenhuma requisição de marcação" | — | Erro ligado por `#purchase-quantity-error` + `aria-invalid` |
| AC-14 | aprovado | Unit web: `purchase-sheet.spec.ts` "quantidade diferente da planejada avisa e só marca após confirmar (AC-14)", "'Voltar' do aviso mantém o digitado e não marca (AC-14)", "quantidade igual à planejada não avisa e marca direto (AC-14)", "sem quantidade planejada, não avisa mesmo com quantidade diferente (AC-14)" | `purchase.spec.ts` "quantidade diferente avisa e só marca após confirmar; sem quantidade planejada não avisa" | — | Aviso = 2º sheet `closeOnBackdrop=false` |
| AC-15 | aprovado | Unit web: `purchase-sheet.spec.ts` "pré-preenche quantidade e unidade planejadas e deixa o preço por unidade vazio (AC-15)" e "sem planejados, os três campos começam vazios e a unidade não inventa a primeira opção (AC-15)"; `shopping-list-page.spec.ts` "o alvo de um item pendente abre o sheet com o prefill planejado; marcar confirma com toast (AC-12/AC-15)" | `purchase.spec.ts` "pré-preenche quantidade/unidade planejadas e deixa o preço por unidade vazio" | — | RN-13: planejado é referência, não o pago |
| AC-16 | aprovado | Unit web: `purchase-sheet.spec.ts` "usa os valores preservados quando existem, no lugar do prefill do planejado (AC-16)"; `shopping-list-store.spec.ts` "desmarca com DELETE .../purchase e aplica a lista devolvida (AC-16)"; `shopping-list-page.spec.ts` "desmarcar devolve o item a pendente e reabrir o sheet preserva os digitados (AC-16)" | `purchase.spec.ts` "desmarcar volta a pendente e reabrir preserva os digitados; recarregar usa o prefill de AC-15" | Contrato: `DELETE /items/{id}/purchase` → 200 | Cobre também o reload (AC-15) |
| AC-17 | aprovado | Unit web: `item-actions-sheet.spec.ts` "item comprado continua editável e excluível, e a ação vira desmarcar (AC-17)"; `shopping-list-page.spec.ts` "item comprado continua editável: o sheet de ações leva ao formulário preenchido (AC-17)" | `purchase.spec.ts` "item comprado continua podendo ser editado e excluído" | — | Efeitos observáveis de AC-10/AC-11 mantendo/descartando comprado |
| AC-18 | aprovado | Unit web: `shopping-list-page.spec.ts` "renderiza a lista em coluna única com o apoio do topo (AC-18)" e "não reordena no cliente — a ordem é sempre a do serviço (RN-18/RN-19)"; Integração backend: ordem pendentes→comprados nos contratos por rota (`shopping-list-postgres.spec.ts`) | `load.spec.ts` "com pendentes e comprados, os pendentes aparecem primeiro" | — | Pendentes primeiro; resumo "1 pendente · 1 comprado" |
| AC-19 | aprovado | Unit web: `checkout-sheet.spec.ts` "é um sheet de confirmação com o resumo de quantos saem e quantos permanecem (AC-19)", "confirmar envia a conclusão ao serviço e emite `confirmed` (AC-19)", "cancelar não muda nada: fecha sem chamar o serviço (AC-19)"; `shopping-list-store.spec.ts` "conclui a compra sem corpo e aplica só o que permanece (AC-19/AC-20)"; `shopping-list-page.spec.ts` "a app bar abre o resumo; confirmar remove só os comprados e confirma com toast (AC-19)" e "cancelar o resumo não muda nada (AC-19)" | `checkout.spec.ts` "resumo N saem/M permanecem; confirmar remove só os comprados + toast; cancelar mantém a lista" | Contrato: `POST /checkout` → 200 (só não comprados permanecem) | — |
| AC-20 | aprovado | Unit web: `checkout-sheet.spec.ts` "sem nenhum comprado, o resumo mostra 0/N e avisa que a lista continua como está (AC-20)" e "sem nenhum comprado, confirmar mantém a lista exatamente como estava (AC-20)"; `shopping-list-page.spec.ts` "concluir sem itens comprados mantém a lista exatamente como estava (AC-20)"; Integração backend: `shopping-list-postgres.spec.ts` "concluir sem comprados não remove nada (AC-20 com banco real)" | `checkout.spec.ts` "concluir sem itens comprados mantém a lista exatamente como estava" | — | — |
| AC-21 | aprovado | Unit web: `checkout-sheet.spec.ts` "não pede mercado nem data: nenhum campo no sheet (AC-21)"; `shopping-list-page.spec.ts` "o resumo da conclusão não pede mercado nem data (AC-21)"; Integração backend: `shopping-list-postgres.spec.ts` (describe "AC-21 — concluir não grava registro nem publica evento"): hard delete dos comprados e nada de dado de compra consultável, `publicTables` = `['shopping_list_items']` (sem tabela de histórico), "não existe rota de histórico nesta rodada (404)", "não há publicador de evento…" | `checkout.spec.ts` "o resumo não pede mercado nem data" | Ausência estrutural: sem tabela de compra, sem rota `/history` (404), mensageria esqueleto (`export {}`) | AC parcial na UI (só o resumo); o resto é backend (matriz §3) |
| AC-22 | aprovado | Unit web: `shopping-list-page.spec.ts` "em falha de carga, mostra o erro na área de conteúdo e refaz a carga (AC-22)"; `shopping-list-store.spec.ts` "falha ao carregar: erro visível com a mensagem do envelope e nova tentativa (AC-22)" e "erro de rede na carga usa mensagem própria (sem detalhe interno)" | `load.spec.ts` "falha ao carregar: erro visível na área + Tentar novamente recarrega e exibe a lista" | — | — |
| AC-23 | aprovado | Unit web: `shopping-list-store.spec.ts` "falha de mutação: erro visível, releitura para não deixar fantasma (AC-23)", "descarta a mensagem de erro de mutação (toast persistente até o descarte — AC-23)", "falha ao restaurar: erro visível e releitura do serviço (AC-23, sem fantasma)"; `toast.spec.ts` "mantém o erro na tela até o descarte (AC-23)"; `toast-host.spec.ts` "renderiza o erro como alert e o mantém até o descarte (AC-23)"; `shopping-list-page.spec.ts` "a falha de mutação do store vira um toast persistente e é consumida (AC-23)", "falha ao marcar mantém o digitado na tela e vira toast persistente (AC-23)", "falha ao excluir não deixa fantasma… (AC-23)"; `item-form-sheet.spec.ts`/`purchase-sheet.spec.ts`/`checkout-sheet.spec.ts` (falha de rede mantém o sheet aberto com o digitado) | `items.spec.ts` e `purchase.spec.ts` "falha de rede ao salvar/marcar/concluir: toast persistente, digitado preservado, sem estado fantasma" | Contrato: 400/401/404/409/500 com `ApiErrorResponse` | Erro não some sozinho (≠ ≈4s); sai por "Dispensar" |
| AC-24 | aprovado | Unit web: `shopping-list-store.spec.ts` "criar/editar/marcar/excluir não gravam nada em localStorage" e "recarregar é um novo GET: instância nova não hidrata do navegador"; Integração backend: `shopping-list-postgres.spec.ts` (persistência real; estado sobrevive a nova leitura) | `checkout.spec.ts` "adicionar/editar/marcar/excluir e **recarregar a PWA**: estado mantido (GET refeito no serviço; nada em `localStorage`)" | Contrato/ADR 0009: GET refeito na base `http://localhost:3000/api/shopping-list` **com** `Authorization: Bearer …` | E2E assere `localStorage` = `['lcd.accessToken']` |
| AC-25 | aprovado | Unit web: `item-row.spec.ts`/`item-actions-sheet.spec.ts`/`checkout-sheet.spec.ts` (alvo ≥44px — AC-25); `shopping-list-page.spec.ts` "mantém a ação primária única e no terço inferior quando há itens (AC-25)"; checklist de design abaixo | `load.spec.ts` "viewport 360px e desktop (`--container-max`), tema claro e escuro, uma única primary, alvos ≥44px, `:focus-visible` visível" | Tokens: sem hex hardcoded nos `.scss` da feature (só `var(--…)`; hairline `1px` conforme guia) | `--touch-target-min: 44px`; `--container-max: 960px` |
| AC-26 | aprovado | Unit web: `item-form-sheet.spec.ts`/`purchase-sheet.spec.ts` "mostra 'Salvando…' e desabilita; toques repetidos geram uma única requisição (AC-26)"; `checkout-sheet.spec.ts` "durante o envio, o botão mostra progresso e fica desabilitado (AC-26)"; `shopping-list-store.spec.ts` "double submit do formulário gera uma única requisição (AC-26, single-flight)" e "single-flight por operação…"; `shopping-list-page.spec.ts` "toque duplo no alvo de desmarcar compartilha uma única requisição (AC-26)" | `items.spec.ts` "duplo toque no Salvar: rótulo `Salvando…`, botão desabilitado e **1** requisição" | — | E2E assere `countRequests('POST','/items') === 1` |

Regras (ADR 0008): Superfície de UI = **sim**; todo AC observável na UI tem
cenário Playwright citado acima (§Matriz AC ↔ E2E do `PLAN.md`), com corrida
real registrada em "Comandos executados". **AC-09 é backend-only** — evidência
de integração (coluna Playwright = N/A).

## Checklist de documentação

- [x] **Contratos HTTP/eventos coerentes com a implementação.** As 8 operações
      do `shopping-list.controller.ts` (`@Get`, `@Post('items')`,
      `@Patch('items/:id')`, `@Delete('items/:id')`,
      `@Post('items/:id/restore')`, `@Put('items/:id/purchase')`,
      `@Delete('items/:id/purchase')`, `@Post('checkout')`) conferem com a tabela
      de `libs/contracts/README.md` (rotas, verbos, status 200/201/400/401/404/409,
      envelope `ApiErrorResponse`, 409 com `duplicateOf`). **Eventos: nenhum**
      (RN-16/AC-21), coerente com a spec.
- [x] **ADR versionada** porque houve decisão arquitetural: **ADR 0009**
      (`docs/decisions/0009-excecao-temporaria-ao-gateway-shopping-list-service.md`,
      exceção temporária à ADR 0001 para a PWA chamar o `shopping-list-service`
      direto + CORS local), com nota de ampliação na ADR 0006 §1. Nenhuma outra
      decisão arquitetural nova surgiu na implementação (T-18 alinhou a corrida à
      regra já documentada — sem migração, sem contrato novo).
- [x] **README / `.env.example` atualizados** (T-07): `.env.example` traz
      `API_PORT=3000`, `DATABASE_URL`, `SHOPPING_LIST_CORS_ORIGINS` (comentada,
      ADR 0009) e a nota de que `AUTH_JWT_PUBLIC_KEY_B64`/`AUTH_JWT_ISSUER` são
      lidas pelo serviço (ADR 0007); `README.md` documenta a feature, a chamada
      direta + CORS (ADR 0009), o pré-requisito Docker/`db:migrate` dos testes de
      integração e os atalhos npm. Sem segredo novo no `.env.example`.
- [x] **`docs/lessons/`** — **N/A nesta rodada**: nenhum arquivo novo foi criado
      (o único existente é o do setup, `2026-10-07-setup-inicial.md`). Os
      aprendizados das tarefas corretivas estão registrados de forma versionada no
      `STATUS.md`/handoffs (T-18 — violação `23505` traduzida **pelo port** e
      recuperação *bounded*; T-19 — *project reference* vale por projeto TS, por
      isso só o `typecheck` pegou o erro) e nos testes que os guardam. Promovê-los
      a uma lição é recomendação **não bloqueante** (ver Pendências).
- [x] **`STATUS.md` final com próxima ação.** O `STATUS.md` (orquestrador) será
      atualizado para "Validação aprovada — decidir push/PR" após esta validação.
      Esta validação não editou o `STATUS.md` (arquivo do orquestrador).

## Checklist de design (Superfície de UI = sim)

- [x] **Tokens: sem cor, espaço ou raio hardcoded.** Busca de hex
      (`#[0-9a-fA-F]{3,8}`) nos `.scss` da feature: **0 ocorrências**; o
      dimensionamento usa `var(--touch-target-min)`, `var(--space-*)`,
      `var(--radius-*)`, `var(--font-size-*)`. Os únicos `px` são espessura de
      hairline/borda (`1px solid var(--color-hairline)`) e contorno de foco
      (`outline: 2px`), conforme o guia §5.
- [x] **Quatro estados:** carregando (skeleton, AC-02), vazio (empty state,
      AC-03), erro (área de carga AC-22 + toast persistente AC-23) e sucesso
      (lista AC-04/AC-12) — cada um com cenário Playwright e unitário citados.
- [x] **Layout uma coluna mobile-first; ações frequentes no terço inferior:**
      `main.container` único (E2E AC-01/AC-25); CTA "Adicionar item" `position:
      fixed` acima da bottom nav (`shopping-list-page.scss` `.list__add`), na área
      do polegar.
- [x] **Contraste e foco (`:focus-visible`); alvos ≥44px:** E2E AC-25 mede
      `≥44px` (linha, ações do item, CTA) e assere foco visível via teclado
      (`hasVisibleFocusRing`); `outline: 2px solid var(--color-primary-text)` nos
      `.scss`; contrato/kit `--touch-target-min: 44px`.
- [x] **Erro visível na UI (não só no console):** erro de campo
      (`aria-invalid` + mensagem por `aria-describedby`), erro de carga
      (`role=alert` + "Tentar novamente") e erro de mutação (toast persistente
      com "Dispensar") — todos com E2E.
- [x] **Modo escuro via tokens (sem hardcoded):** E2E AC-25 com
      `emulateMedia({ colorScheme: 'dark' })` assere `--color-canvas: #191919` e
      `--color-primary-text: #62aef0`; nenhum hex nos `.scss` da feature.
- [x] **Hierarquia tipográfica presente:** app bar `Lista de compras` em
      `--font-size-h2` (título do tipo de tela Lista/conteúdo), apoio
      `.summary` em `--font-size-caption`/`--color-ink-muted`, nomes da lista em
      `--font-size-body` e metadados em `--font-size-caption`; empty state com
      `--font-size-title`.
- [x] **Agrupamento visual por whitespace:** `.summary` (`margin-bottom`
      `--space-md`), `.list__item` (`padding-block` `--space-xs`), divisor
      hairline entre linhas, `.empty` com `gap: --space-sm` e `padding:
      --space-xl --space-md` — grupos separados por ritmo, não `gap` uniforme.
- [x] **Receita do tipo de tela do guia §4 aplicada:** tipo **Lista/conteúdo** =
      app bar + coluna única (`main.container`) e empty state rico quando vazia
      (`🧺` sticker + título + frase + CTA primary) — sem form/conteúdo solto no
      void (anti-padrão). Formulários são bottom sheets com `h2` nomeado pelo tipo
      de fluxo (`item-form-sheet`, `purchase-sheet`).

## Verificações transversais

- [x] Contratos HTTP/eventos refletem a implementação (8 rotas conferidas; eventos = nenhum).
- [x] ADRs necessárias estão versionadas (ADR 0009; ADR 0006 §1 com nota; ADR 0007/0008 vigentes).
- [x] Documentação da feature está atualizada (README, `.env.example`, `libs/contracts/README.md`).
- [x] Testes planejados foram executados e os resultados estão registrados (seção abaixo).
- [x] `npx nx e2e web-e2e` foi executado e o resultado está registrado (**32 passed**; com `--skip-nx-cache`, **32 passed**).
- [x] Checklist de documentação acima está completa.
- [x] Checklist de design acima está completa.
- [x] Não há segredo ou credencial versionada (`git ls-files` traz só `.env.example`; busca por `BEGIN … PRIVATE KEY` em arquivos versionados = vazio).

## Pendências

- **Nenhuma pendência bloqueante de comportamento, contrato ou arquitetura.**
  Todos os 26 ACs estão aprovados e cada um tem evidência executável registrada.
  Os três pontos levantados no `STATUS.md` foram julgados **aceitáveis como
  estão** (detalhe em "Julgamentos exigidos pelo DoD"). Recomendações
  **não bloqueantes** (não exigem T de correção nesta rodada):
  1. **Design (decisão do usuário):** o toast de erro persistente é ancorado
     acima da bottom nav em `--z-toast (300)`, acima de `--z-overlay (200)`, então
     cobre o rodapé de um sheet aberto. Não contraria AC; se o comportamento
     desejado for outro, é uma tarefa de design própria.
  2. **Doc (nit opcional):** `libs/contracts/README.md` documenta o 400 de corpo
     malformado, mas não explicita a precedência sobre o 401 (parsing antes do
     guard). Uma linha de nota tornaria a ordem explícita — não muda contrato.
  3. **`docs/lessons/`:** promover os aprendizados de T-18/T-19 a uma lição, se o
     usuário quiser (hoje registrados no `STATUS.md`/handoffs).
- **Observação de higiene (fora da feature):** `git status` mostra 3 arquivos
  `.opencode/agents/*.md` modificados e **não commitados** que **não** fazem parte
  desta feature nem desta validação (não foram tocados por nenhuma T). Cabe ao
  orquestrador/usuário decidir o destino deles antes do PR.

## Julgamentos exigidos pelo DoD

Os três pontos registrados em `STATUS.md` foram analisados com evidência. **Nenhum
bloqueia a aprovação.**

1. **Toast de erro persistente sobre o rodapé de um sheet aberto** — **não
   bloqueia.** Nenhum AC exige o CTA do sheet acessível *enquanto* o toast está
   visível. A spec prescreve o toast em `--z-toast`, acima da bottom nav (SPEC
   §"Componentes/tokens usados"), exatamente como implementado
   (`toast-host.scss:7`, `bottom-sheet.scss:6`), e o `GUIA-DESIGN` não define
   precedência entre toast e overlay. AC-23 exige "nova tentativa é possível" —
   o que se comprova: as jornadas de T-17 descartam o toast ("Dispensar", previsto
   em AC-23) e concluem a operação (`items.spec.ts` e `purchase.spec.ts`,
   AC-23), logo a retry existe. É fricção de design, não violação de AC; fica como
   recomendação não bloqueante nº 1.

2. **Deflake do E2E de auth (`app.spec.ts` — `dblclick()`)** — **preserva a prova
   do AC-04 do auth.** A mudança é **só de teste** (produção intacta), mantém a
   asserção central `requests === 1` e ainda verifica o rótulo "Entrando…" e o
   botão desabilitado. A troca de `click()` + `click({force:true})` por
   `dblclick()` é *mais* fiel ao "duplo toque no mesmo alvo" do AC-04: o segundo
   toque chega com o botão já desabilitado; se o *single-flight*/`disabled`
   regredisse, o segundo clique geraria uma 2ª requisição e o teste falharia. A
   prova, portanto, é preservada (e ficou determinística sob carga). Está fora do
   escopo desta feature; o dono do auth pode aceitar ou reverter sem afetar
   nenhum AC da lista.

3. **Corpo malformado sem token responde 400 antes do `JwtAuthGuard`** —
   **não é pendência de segurança nem de contrato; é ordem de validação
   inerente à borda HTTP.** Verificado por execução real (comando na seção
   abaixo): `POST /api/shopping-list/items` com JSON malformado e **sem** token →
   `400 {"statusCode":400,"message":"Corpo da requisição inválido"}`; com JSON
   **válido** e sem token → `401 {"statusCode":401,"message":"Não autorizado"}`.
   O parser de corpo (registrado em `configure-app.ts:48-69`) roda na etapa de
   parsing do Fastify, **antes** dos guards do Nest — comportamento idêntico ao do
   `auth-service` (paridade explicitamente documentada). Não há bypass: a
   requisição é **rejeitada** em ambos os casos, sem dado retornado e sem vazar o
   detalhe técnico do parser (só a mensagem genérica PT). No produto não há
   impacto: a PWA sempre serializa JSON válido e o interceptor anexa o token. O
   400 de corpo malformado já é contrato documentado (`libs/contracts/README.md`,
   §Erros); a precedência sobre o 401 é detalhe de ordenação, não cláusula de
   produto — fica como nit de doc não bloqueante nº 2.

## Comandos executados

```text
npx nx e2e web-e2e
# Running 32 tests using 6 workers → 32 passed (20.0s)
# (26 jornadas da lista: load 6, items 6, duplicates 2, purchase 7,
#  delete-undo 1, checkout 4 + 6 de auth)

npx nx e2e web-e2e --skip-nx-cache
# 32 passed (20.3s) — corrida real, sem cache do Nx

npx nx test web --skip-nx-cache
# Test Files 20 passed (20); Tests 177 passed (177) — 3.78s

npm run docker:up
# Container lista-de-compras-postgres Running (healthy); lista-de-compras-rabbitmq Running

npx nx run shopping-list-service:db:migrate
# Successfully ran target db:migrate for project shopping-list-service

npx nx test shopping-list-service --skip-nx-cache
# Test Files 14 passed (14); Tests 162 passed (162) — 3.12s

npx nx lint web          # Successfully ran target lint for project web
npx nx lint web-e2e      # Successfully ran target lint for project web-e2e
npx nx lint shopping-list-service   # Successfully ran target lint
npx nx typecheck web     # Successfully ran target typecheck for project web
npx nx sync:check        # [@nx/js:typescript-sync]: All files are up to date.

docker exec lista-de-compras-postgres psql -U postgres -d shopping_list -c \
  "SELECT count(*) FROM shopping_list_items;"
# rows = 0  (banco deixado limpo)

# Julgamento 3 — ordem parse→guard na borda (serviço em localhost:3000):
curl -X POST http://localhost:3000/api/shopping-list/items \
     -H "Content-Type: application/json" --data-binary '{ "name": '   # malformado, sem token
# 400 {"statusCode":400,"message":"Corpo da requisição inválido"}
curl -X POST http://localhost:3000/api/shopping-list/items \
     -H "Content-Type: application/json" --data '{ "name": "Arroz" }' # válido, sem token
# 401 {"statusCode":401,"message":"Não autorizado"}
curl http://localhost:3000/api/shopping-list                        # sem token
# 401 {"statusCode":401,"message":"Não autorizado"}
```

## Parecer

**Aprovada.** Os 26 critérios de aceite (AC-01…AC-26) possuem evidência
executável registrada: **25 com cenário Playwright** citado e corrida real
(`npx nx e2e web-e2e` → **32 passed**, confirmada também com `--skip-nx-cache`) e
**AC-09** (backend-only, não observável na UI) com evidência de integração com
Postgres real (`npx nx test shopping-list-service` → **162 passed / 14 arquivos**,
incluindo o índice único parcial e o `409` por chamada HTTP direta). O gate da
ADR 0008 está satisfeito (comando + resultado no handoff de T-17 e nesta seção).
As checklists de documentação e de design estão completas; contratos, ADR 0009,
README/`.env.example`, segurança transversal (sem segredo versionado) e higiene de
dados (banco com 0 linhas) foram conferidos. Os três julgamentos exigidos pelo DoD
foram analisados e **nenhum** constitui pendência de comportamento, contrato ou
arquitetura. Não há AC a reabrir. A decisão de push/PR/merge permanece com o
usuário.

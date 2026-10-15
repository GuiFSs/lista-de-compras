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

> **Rodada 2 (máscara de centavos em BRL — `AC-27` + cross-refs):** validada em
> **2026-10-15** na seção **"Rodada 2 — máscara de centavos em BRL"** no fim
> deste arquivo. O bloco da Rodada 1 acima (26/26 ACs, 2026-10-14) permanece
> **intacto**; a Rodada 2 não reabre nenhum AC da Rodada 1.

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

---

# Rodada 2 — máscara de centavos em BRL

**Spec:** `docs/features/shopping-list/SPEC.md` — **Rodada 2 aprovada em
2026-10-14** (`RN-21`/`AC-27`/`CD-14`/`CD-15`; `D-02` resolvida) + Rodada 1
aprovada em 2026-10-13 (26 ACs, **permanece intacta**)
**Plano:** `docs/features/shopping-list/PLAN.md` — seção "Rodada 2"
(`Superfície de UI: sim`, matriz AC ↔ E2E da Rodada 2, T-20…T-23; gate aprovado
em 2026-10-14)
**Data:** 2026-10-15
**Resultado:** **Aprovada** (Rodada 2) — nenhum AC da Rodada 1 reaberto
**Superfície de UI (do plano):** **sim** (ADR 0008)

DoR da revalidação: tarefas **T-20…T-23** concluídas e commitadas (`2120634`,
`48a8ff2`, `e79d354`, `8175f72`) + auditoria de testes (`f93abea`); árvore de
trabalho limpa na branch `feature/shopping-list`; nenhuma tarefa reaberta no
`STATUS.md`; o handoff do `test-engineer` **registra a corrida Playwright**
(`npx nx e2e web-e2e -- --grep "máscara"` → 4 passed e a corrida completa → 36
passed). Gate da ADR 0008 satisfeito — e **reproduzido por mim** (comandos ao
final). Escopo desta validação: **apenas** `AC-27` (novo, integral) e os
**cross-refs** `AC-04`, `AC-10`, `AC-13`, `AC-15`, `AC-25` (conferir que
continuam provados após a mudança); os demais ACs da Rodada 1 seguem aprovados
**salvo regressão**, que não foi encontrada (ver "Regressão").

## Evidências por critério (Rodada 2)

Legenda: **Comando E2E** = `npx nx e2e web-e2e` (ou filtro `-- --grep`), corrida
real registrada em "Comandos executados (Rodada 2)". **Unit web** =
`npx nx test web`. Títulos entre crases = `arquivo › título`.

| AC | Estado | Evidência unit (`npx nx test web`) | Evidência Playwright (ADR 0008) | Contrato/ops | Observação |
| --- | --- | --- | --- | --- | --- |
| **AC-27** | **aprovado** | Helper: `money.spec.ts › formata os dígitos como centavos, entrando pela direita` (`'3'`→`R$ 0,03`, `'30'`→`R$ 0,30`, `'3015'`→`R$ 30,15`), `› acima de mil não usa separador de milhar (CD-15)`, `› não há limite artificial de dígitos (CD-15)`, `› o dígito zero é valor, não ausência`; `numberFromDigits › sem dígitos é ausência, não zero`, `› converte centavos no número do payload`, `› não há limite artificial de dígitos no payload (CD-15)`; `digitsFromNumber › faz o prefill sem erro de ponto flutuante`, `› fecha o ciclo prefill → exibição`; `digitsFromInput › mantém apenas os dígitos`, `› descarta prefixo, separadores, sinal e letras — inclusive ao colar`. Wiring **item**: `item-form-sheet.spec.ts › máscara de centavos em BRL: 3/30/3015 viram R$ 0,03/R$ 0,30/R$ 30,15 e enviam número (AC-27)`, `› um backspace apaga um dígito (RN-21/CD-15)`, `› colar mantém só os dígitos, sem separador de milhar (AC-27/CD-15)`, `› texto inválido não cola na tela: o campo volta à máscara (AC-27)`, `› o campo de preço usa teclado numérico (AC-27)`, `› a máscara não aceita sinal… (RN-21/AC-27)`, `› prefill da edição na máscara e limpar os opcionais envia null (RN-03/AC-10)`. Wiring **compra**: `purchase-sheet.spec.ts` com os mesmos casos (`máscara de centavos em BRL: 3/30/3015…`, `um backspace apaga um dígito (RN-21/CD-15)`, `colar mantém só os dígitos…`, `o campo de preço usa teclado numérico (AC-27)`, `a máscara não aceita sinal…`, `usa os valores preservados… (AC-16)` ⇒ `R$ 9,90`) | `items.spec.ts:159 › máscara de centavos em BRL no preço planejado: digitar 3/30/3015 mostra R$ 0,03/R$ 0,30/R$ 30,15 e envia o número` (campo começa **vazio**, **sem** `R$ 0,00`; linha `R$ 30,15`; POST com `plannedPrice: 30.15`); `items.spec.ts:195 › máscara no preço planejado: apagar remove um dígito, colar mantém só dígitos e a edição abre na máscara` (prefill `12.5` ⇒ `R$ 12,50`; Backspace `R$ 12,50`→`R$ 1,25`→`R$ 0,12`; 9 dígitos reais ⇒ `R$ 1234567,89`; `R$ 1.234,56` ⇒ `R$ 1234,56`; PATCH com `plannedPrice: 1234.56`); `purchase.spec.ts:218 › máscara de centavos em BRL no preço por unidade: digitar 3015 mostra R$ 30,15 e envia 30.15` (começa vazio, vazio ⇒ erro no campo + **0** `PUT /purchase`; PUT com `unitPrice: 30.15`); `purchase.spec.ts:260 › máscara no preço por unidade: apagar um dígito, colar só dígitos e o valor volta na máscara ao reabrir` (10 dígitos reais ⇒ `R$ 30123456,78`; draft do RN-12 volta como `R$ 1234,56`) | `libs/contracts/src/http/shopping-list.ts` (`plannedPrice: number \| null`, `unitPrice: number`) — **inalterado**: `git diff 89e7d75..HEAD -- libs/contracts` = vazio; payload assertado pelo *fake api* é **número** (`30.15`/`1234.56`) | Cobre os **dois** campos, exibição, payload, vazio=`''` (não `0`), sem milhar, apagar/colar, sem limite, prefill e draft. Quantidade **não** é afetada (ver AC-15) |
| **AC-04** | **aprovado (cross-ref reconfirmado)** | `item-form-sheet.spec.ts › adiciona só com o nome, com os opcionais vazios (AC-04)` — `priceValue === ''` e `plannedPrice: null`; `› aceita a quantidade com vírgula e o preço na máscara, enviando números (RN-06/AC-27)` | `items.spec.ts:7 › adiciona item só com o nome: aparece pendente com opcionais vazios` — POST `{plannedQuantity:null,unit:null,plannedPrice:null}` (e a jornada de máscara, l.169, assere o campo **vazio** antes do 1º dígito) | `POST /api/shopping-list/items` → 201 com `plannedPrice: null` (`libs/contracts/README.md`) | O preço **vazio** continua criando o item; a máscara só cria valor a partir do 1º dígito |
| **AC-10** | **aprovado (cross-ref reconfirmado)** | `item-form-sheet.spec.ts › prefill da edição na máscara e limpar os opcionais envia null (RN-03/AC-10)` (`R$ 12,50`); `shopping-list-page.spec.ts › a ação da linha abre o sheet de ações e Editar preenche o formulário (AC-10)`, `› salvar a edição atualiza a linha e confirma com toast (AC-10)` | `items.spec.ts:72 › editar planejados e salvar atualiza a linha` (`fill('1250')` ⇒ `toHaveValue('R$ 12,50')`; meta da linha `3 kg · R$ 12,50`); `items.spec.ts:195` (abrir Editar mostra `R$ 12,50`) | `PATCH /items/{id}` → 200 com `plannedPrice: 1234.56` (número) | Linha continua no formato `R$ 30,15`/`R$ 12,50` (sem mudança em `item-row`) |
| **AC-13** | **aprovado (cross-ref reconfirmado)** | `purchase-sheet.spec.ts › os três campos são obrigatórios: erro em cada campo e nenhuma requisição (AC-13)` — no campo mascarado: `aria-invalid="true"`, `aria-describedby="purchase-price-error"`, mensagem `Informe o preço por unidade.`, `markItemPurchased` **não** chamado; `› valida quantidade > 0 sem enviar a marcação (RN-06/AC-13)` | `purchase.spec.ts:34 › sem um dos campos obrigatórios: erro no campo e nenhuma requisição de marcação`; trecho de **preço vazio** dentro de `purchase.spec.ts:218` (`#purchase-price-error` + `countRequests('PUT','/purchase') === 0`) | `PUT .../purchase` exige `unitPrice` (`libs/contracts/README.md`) | A regra defensiva "preço ≥ 0" segue no código, agora **inalcançável pela digitação** (RN-21) — ver Julgamento 1 |
| **AC-15** | **aprovado (cross-ref reconfirmado)** | `purchase-sheet.spec.ts › pré-preenche quantidade e unidade planejadas e deixa o preço por unidade vazio (AC-15)` (`#purchase-price.value === ''`), `› sem planejados, os três campos começam vazios… (AC-15)`; `shopping-list-page.spec.ts › o alvo de um item pendente abre o sheet com o prefill planejado; marcar confirma com toast (AC-12/AC-15)`; quantidade com decimal livre: `purchase-sheet.spec.ts › marca com os três campos… (AC-12)` (`'1,5'` ⇒ `1.5`), `item-form-sheet.spec.ts › aceita a quantidade com vírgula…` | `purchase.spec.ts:98 › pré-preenche quantidade/unidade planejadas e deixa o preço por unidade vazio` (`toHaveValue('')` no preço; quantidade `2,5` — digitação decimal preservada); `purchase.spec.ts:113` (reload ⇒ preço volta **vazio**) | — | RN-13 preservada; RN-12 (draft) reaparece na máscara (`R$ 7,25`/`R$ 1234,56`) |
| **AC-25** | **aprovado (cross-ref reconfirmado)** | `shopping-list-page.spec.ts › mantém a ação primária única e no terço inferior quando há itens (AC-25)`; `item-row.spec.ts` (alvos ≥44px, inalterados) | `load.spec.ts:132 › viewport 360px e desktop (--container-max), tema claro e escuro, uma única primary, alvos ≥44px, :focus-visible visível` — verde na corrida completa | `.field__input` / `.field__input:focus-visible` / `.field__input--error` só com tokens (`var(--touch-target-min)`, `var(--space-*)`, `var(--font-size-body)`, `var(--color-*)`, `var(--radius-xs)`, `outline: 2px solid var(--color-primary-text)`); **nenhum `.scss` mudou na Rodada 2** (`git diff 89e7d75..HEAD -- "*.scss"` = vazio) | Rótulo visível + `inputmode="numeric"` + `aria-invalid`/`aria-describedby` no campo mascarado (templates conferidos); `aria-invalid` assertado na E2E |

**Exibição × contrato:** os ACs acima mostram no campo o **texto mascarado**
(`R$ 30,15`) e enviam ao serviço o **número** (`30.15`) — nenhum AC exige `R$` no
payload, e o contrato segue sem mudança (o diff de `libs/contracts` e do backend
é vazio; ver "Verificações transversais").

### Regressão (Rodada 1)

- **Nenhuma.** A corrida completa `npx nx e2e web-e2e --skip-nx-cache` →
  **36 passed** (as **32** jornadas da Rodada 1 + as **4** da máscara) e
  `npx nx test web --skip-nx-cache` → **204 passed / 21 arquivos**, ambas
  executadas por mim (saída real abaixo). Os ACs da Rodada 1 **não** são
  reaprovados por suposição: como a Rodada 2 tocou dois componentes
  (`item-form-sheet`, `purchase-sheet`) que servem a vários ACs da Rodada 1, a
  reconfirmação se dá pela **passagem das jornadas/testes originais** (nenhum
  cenário da Rodada 1 foi removido — conferido em `items.spec.ts`,
  `purchase.spec.ts` e `checkout.spec.ts`, que mantêm todos os casos e apenas
  digitam **dígitos** nos campos de preço).

## Checklist de documentação (Rodada 2)

- [x] **Contratos HTTP/eventos coerentes com a implementação.** **Nada mudou**:
      `git diff --stat 89e7d75..HEAD -- libs/contracts` = **vazio** e o backend
      (`apps/shopping-list-service`) também não tem diff; os tipos seguem
      `plannedPrice: number | null` e `unitPrice: number`
      (`libs/contracts/src/http/shopping-list.ts`), e o `libs/contracts/README.md`
      (rotas/status/envelope/`unitPrice >= 0`) segue descrevendo a borda real.
      **Eventos: nenhum** (RN-16/AC-21) — a Rodada 2 não publica nada.
- [x] **ADR registrada quando a implementação gerou decisão arquitetural.**
      **Nenhuma ADR nova** — e é o correto: a máscara é **formatação de entrada
      da PWA**, sem mudança de contrato, dados, ownership ou integração
      (`SPEC.md` › "Rodada 2" e `PLAN.md` › "Contratos, dados e ownership").
      `docs/decisions/` segue com a **0009** (Rodada 1) como última; o diff de
      `docs/decisions` na Rodada 2 é vazio. Revisão arquitetural: **não
      aplicável**, declarada no `PLAN.md`.
- [x] **README / `.env.example`.** Sem mudança de setup: a Rodada 2 não alterou
      comandos, portas, variáveis ou pré-requisitos (nenhum arquivo de README/
      `.env.example` aparece no diff da Rodada 2), logo não havia o que atualizar.
- [x] **`docs/lessons/`** — **N/A nesta rodada**: nenhum arquivo novo (só o
      `2026-10-07-setup-inicial.md`). Os aprendizados da Rodada 2 (estado =
      dígitos; DOM sobrescrito imperativamente; `beforeinput` para 1 backspace =
      1 dígito; zeros que a própria máscara insere) estão registrados de forma
      versionada nos handoffs T-20…T-23 e nos testes que os guardam. Promovê-los
      (e registrar o padrão da máscara no `GUIA-DESIGN` §5) é recomendação
      **não bloqueante**.
- [x] **Documentação da feature atualizada quando ambiguidades foram
      resolvidas.** **D-02 → CD-15** foi registrada na `SPEC.md` (sem separador de
      milhar; campo sem dígitos **vazio**, sem `R$ 0,00`; apagar = último dígito,
      colar = só dígitos, sem limite artificial) e **RN-21/AC-27** foram
      refinados; o `PLAN.md` traz a Rodada 2 com a matriz AC ↔ E2E e T-20…T-23
      (gate aprovado em 2026-10-14). Nenhuma decisão aberta remanescente.
- [x] **`STATUS.md` final com a próxima ação.** O bloco de handoff desta
      validação foi registrado logo após `## Últimos handoffs` (o topo
      fase/gate/próxima ação é do orquestrador e **não** foi tocado por esta
      validação).

## Checklist de design (Superfície de UI = sim — escopo da Rodada 2)

> A Rodada 2 **não** alterou nenhum `.scss` (`git diff 89e7d75..HEAD -- "*.scss"` =
> vazio): a máscara reusa a classe de campo já aprovada na Rodada 1. O checklist
> abaixo confere o que a mudança **poderia** ter afetado.

- [x] **Tokens: nenhuma cor/espaço/raio hardcoded no caminho novo.**
      `.field__input` usa `var(--touch-target-min)`, `var(--space-*)`,
      `var(--font-size-body)`, `var(--color-ink)`, `var(--color-surface)`,
      `1px solid var(--color-hairline)`, `var(--radius-xs)`; erro
      (`--color-danger`) e foco (`--color-primary-text` + `var(--shadow-1)`).
      Nenhum hex/px novo (o `1px` é a hairline do guia §5).
- [x] **Foco e toque.** `.field__input:focus-visible` com
      `outline: 2px solid var(--color-primary-text)`; E2E `load.spec.ts`
      (AC-25) assere `:focus-visible` visível e alvos ≥44px (verde na corrida);
      `inputmode="numeric"` no campo mascarado dos **dois** sheets (unit
      `… o campo de preço usa teclado numérico (AC-27)`).
- [x] **Erro visível (não só no console).** O campo mascarado mantém rótulo
      visível (`Preço (R$)`, `Preço por unidade (R$)` com `*` + "(obrigatório)"),
      `role=alert` no `#…-price-error`, `aria-invalid`/`aria-describedby` — com
      asserção unit (AC-13/AC-27) e na E2E.
- [x] **Quatro estados.** A máscara não altera os estados da tela
      (carregando/vazio/erro/sucesso) — carregando (skeleton), vazio (empty
      state), erro (área de carga + toast persistente + erro de campo) e sucesso
      (lista) permanecem com as jornadas da Rodada 1; o erro de **campo** ganhou
      a cobertura nova.
- [x] **Mobile-first / uma coluna / hierarquia / agrupamento / receita do tipo de
      tela.** Nenhum layout mudou: os preços vivem nos **bottom sheets de
      formulário** nomeados pelo tipo de fluxo (`item-form-sheet` /
      `purchase-sheet`), sem form solto no void; app bar + coluna única + bottom
      nav seguem as jornadas de AC-01/AC-25.
- [x] **Modo escuro via tokens.** Sem scss novo; E2E AC-25
      (`emulateMedia({ colorScheme: 'dark' })` → `--color-canvas: #191919`) verde.
- [x] **Quantidade intocada (RN-06).** Continua com digitação livre de decimal e
      teclado decimal: `item-form-sheet.spec.ts › aceita a quantidade com vírgula
      e o preço na máscara, enviando números (RN-06/AC-27)` (`1,5` ⇒ `1.5`),
      `purchase-sheet.spec.ts › marca com os três campos…` (`'1,5'` ⇒ `1.5`) e a
      E2E `toHaveValue('2,5')`/`toHaveValue('2')` no sheet de compra.

## Verificações transversais (Rodada 2)

- [x] Contratos HTTP/eventos inalterados e coerentes (diff vazio em
      `libs/contracts`; backend sem diff; **eventos = nenhum**).
- [x] ADRs necessárias versionadas: **nenhuma nova** era necessária (máscara é
      entrada da PWA); `0001…0009` vigentes.
- [x] Documentação da feature atualizada (SPEC com CD-15/RN-21/AC-27; PLAN com a
      Rodada 2 e o gate aprovado; STATUS com os handoffs).
- [x] Testes planejados executados e resultados registrados (seção de comandos).
- [x] **`npx nx e2e web-e2e` executado por mim** → **36 passed** (e o filtro
      `-- --grep "máscara"` → **4 passed**), ambas também com `--skip-nx-cache`.
- [x] Checklists de documentação e de design acima completas.
- [x] Nenhuma regressão: `web` **204/204** e `web-e2e` **36/36**.
- [x] Nenhum segredo/credencial novo (nenhum arquivo de configuração tocado na
      Rodada 2; `git status --porcelain` limpo antes e depois das corridas).
- [x] Portas livres antes das corridas (`netstat … :4200 :3001` sem `LISTENING`)
      e livres depois — o Playwright subiu e derrubou os dois `webServer`.

## Pendências (Rodada 2)

- **Nenhuma pendência bloqueante de comportamento, contrato ou arquitetura.**
  `AC-27` está aprovado e os cross-refs seguem provados; **nenhum AC a reabrir**.
- Recomendações **não bloqueantes** (não exigem T de correção; decisão do
  usuário/orquestrador):
  1. **Payload E2E com >6 dígitos** não é assertado (a E2E prova o *display* com
     9/10 dígitos reais e o helper prova o número — `numberFromDigits('123456789')
     → 1234567.89`). Se quiser o valor longo **no payload** da E2E, é o ajuste de
     uma asserção nas jornadas de máscara.
  2. **`:focus-visible` do AC-25 na E2E é genérico** (Tab na página), não foca
     especificamente o campo mascarado; rótulo/erro/`aria-*` do campo têm
     cobertura própria (AC-13/AC-27).
  3. **`inputmode="decimal"` da quantidade** (risco do `PLAN.md`, **não** é AC)
     sem asserção de atributo; o comportamento decimal é coberto.
  4. Registrar o **padrão da máscara no `GUIA-DESIGN` §5** e reusar
     `formatBrlFromDigits` em `item-row` quando ele for tocado por outra demanda
     (recomendações já anotadas no `PLAN.md`).
- Nada disto muda comportamento, contrato ou arquitetura: **não há devolução ao
  orquestrador por lacuna** — são melhorias opcionais.

## Julgamentos exigidos pelo DoD (Rodada 2)

1. **Reescrita dos dois casos de teste que digitavam `-1` (item e compra)** —
   **não bloqueia; preserva a prova.** Foi um item **aprovado** pelo usuário no
   gate do plano (item 4): o caminho de entrada mudou pela spec (CD-14/RN-21) e a
   regra defensiva "preço ≥ 0" **permanece no código**, agora inalcançável pela
   digitação. No item: `item-form-sheet.spec.ts › valida quantidade > 0 sem enviar
   requisição (RN-06)` e `› a máscara não aceita sinal… (RN-21/AC-27)`; na compra:
   `purchase-sheet.spec.ts › valida quantidade > 0 sem enviar a marcação
   (RN-06/AC-13)` e `› os três campos são obrigatórios: erro em cada campo e
   nenhuma requisição (AC-13)`. Nenhum teste foi removido por conveniência: os
   casos `-1` viraram testes de máscara **mantendo** o caso "quantidade > 0 sem
   requisição" (conferido no diff da Rodada 2).

2. **Payload de valor longo sem asserção E2E** — **não bloqueia.** `AC-27` exige
   "não há limite artificial de dígitos — o limite prático é a precisão do
   serviço"; isso está provado por (a) 9 e 10 dígitos **reais via teclado** na E2E
   (`R$ 1234567,89`, `R$ 30123456,78`) e (b) `numberFromDigits`/`digitsFromNumber`
   no helper unitário. O valor enviado ao serviço já está provado nos dois campos
   (`30.15` e `1234.56`). Fica como recomendação nº 1.

3. **`:focus-visible` genérico no AC-25** — **não bloqueia.** O campo mascarado
   usa a **mesma** classe `.field__input:focus-visible` com tokens que já foi
   aprovada na Rodada 1, e **nenhum `.scss` mudou** nesta rodada; o rótulo visível,
   `aria-invalid`/`aria-describedby`, `role=alert` e `inputmode="numeric"` do campo
   têm asserção própria (unit + E2E). Fica como recomendação nº 2.

Nenhum dos três rebaixa `AC-27`, `AC-04`, `AC-10`, `AC-13`, `AC-15` ou `AC-25`.

## Comandos executados (Rodada 2)

Todos executados por mim em 2026-10-15, com a branch `feature/shopping-list` e a
árvore limpa (`git status --porcelain` vazio), portas 4200/3001 livres antes e
depois das corridas.

```text
npx nx lint web
# Linting "web"... ✔ All files pass linting
# Successfully ran target lint for project web — Cache: 0/1 hit (0%) — exit 0

npx nx lint web-e2e
# Successfully ran target lint for project web-e2e — Cache: 0/1 hit (0%) — exit 0

npx nx typecheck web
# > tsc --build tsconfig.json --emitDeclarationOnly
# Successfully ran target typecheck for project web and 2 tasks it depends on — exit 0
# (contratos: build/typecheck vieram do cache; o web:typecheck executou)

npx nx sync:check
# The workspace is up to date · [@nx/js:typescript-sync]: All files are up to date. — exit 0

npx nx test web
# nx run web:test [existing outputs match the cache, left as is] — Cache 1/1 hit
# → repetido para execução real:
npx nx test web --skip-nx-cache
# Test Files 21 passed (21); Tests 204 passed (204) — 3.87s
# Cache: Skipped (--skip-nx-cache) — exit 0

npx nx e2e web-e2e -- --grep "máscara"
# nx run web-e2e:e2e--grep máscara [local cache] — 4 passed (3.0s)  ← cache do Nx
# → repetido para execução real:
npx nx e2e web-e2e --skip-nx-cache -- --grep "máscara"
# Running 4 tests using 2 workers → 4 passed (2.9s) — exit 0
#  ok items.spec.ts:159 › Lista — itens › máscara de centavos em BRL no preço planejado: digitar 3/30/3015 mostra R$ 0,03/R$ 0,30/R$ 30,15 e envia o número
#  ok items.spec.ts:195 › Lista — itens › máscara no preço planejado: apagar remove um dígito, colar mantém só dígitos e a edição abre na máscara
#  ok purchase.spec.ts:218 › Lista — compra › máscara de centavos em BRL no preço por unidade: digitar 3015 mostra R$ 30,15 e envia 30.15
#  ok purchase.spec.ts:260 › Lista — compra › máscara no preço por unidade: apagar um dígito, colar só dígitos e o valor volta na máscara ao reabrir

npx nx e2e web-e2e --skip-nx-cache
# Running 36 tests using 6 workers → 36 passed (21.6s) — exit 0
# (as 32 jornadas da Rodada 1 — load 6, items 6, duplicates 2, purchase 7,
#  delete-undo 1, checkout 4, auth 6 — mais as 4 jornadas novas de máscara,
#  2 em items.spec.ts e 2 em purchase.spec.ts ⇒ items 8 e purchase 9 no total;
#  contagem conforme a saída real da corrida)

netstat -ano | findstr ":4200 :3001" | findstr "LISTENING"
# (antes) sem saída — portas livres; (depois) sem saída — webServer derrubados
```

## Parecer (Rodada 2)

**Aprovada.** O `AC-27` (novo) tem evidência executável nos **dois** campos de
preço: cenário Playwright com **corrida real registrada** (`--grep "máscara"` →
**4 passed**, e a corrida completa → **36 passed**, ambas com `--skip-nx-cache`),
cobrindo dígito a dígito (`3`/`30`/`3015` ⇒ `R$ 0,03`/`R$ 0,30`/`R$ 30,15`),
campo vazio sem `R$ 0,00`, **payload numérico** (`30.15`, `1234.56`), sem separador
de milhar, apagar/colar, sem limite de dígitos, prefill na edição e draft do
desmarcar — mais o helper unitário e os dois sheets. Os **cross-refs** `AC-04`,
`AC-10`, `AC-13`, `AC-15` e `AC-25` **continuam provados** após a mudança (unit +
Playwright, com os testes originais mantidos e apenas digitando dígitos nos campos
de preço). **Nenhum AC da Rodada 1 foi reaberto**: as suítes completas estão
verdes (`web` **204/204**; `web-e2e` **36/36**) e não há indício de regressão. As
checklists de documentação e de design estão completas; contratos, backend e ADRs
**não mudaram** (confirmado por diff), e a quantidade permanece com digitação
livre. Os três julgamentos do DoD foram analisados e **nenhum** bloqueia. Não há
pendência bloqueante nem AC a reabrir; push/PR/merge continuam decisão do usuário.

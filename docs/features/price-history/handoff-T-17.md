Tarefa: T-17 — Checkout sheet com Mercado e Data
Estado: concluída

Arquivos alterados:
- apps/web/src/app/features/shopping-list/checkout-sheet.ts (alterado): campos `market`/`purchaseDate` (default = hoje local, sinal `submitted`), validação local (`marketError`/`dateError`/`hasErrors`) com mensagens PT idênticas ao envelope 400 do serviço, `confirm()` enviando `store.checkout({ market, purchaseDate })` com ≥1 comprado e `store.checkout(null)` com 0 comprados (RN-09); rótulo/desabilitado do CTA agora leem `store.concluding()` (não `saving()`); guard `if (this.concluding()) return` contra toque duplo; export `localDateString()` (hoje no fuso local, RN-04) reusado pelo spec. Comentário de topo atualizado (o de "sem mercado/data" estava obsoleto).
- apps/web/src/app/features/shopping-list/checkout-sheet.html (alterado): virou `<form novalidate>`; com `leaving() > 0` renderiza os campos **Mercado** (`#checkout-market`, texto) e **Data da compra** (`#checkout-date`, `type="date"` com `[max]="today"`); labels associados + `*` + `(obrigatório)` oculto; erro com `aria-invalid`, `aria-describedby` e `role="alert"`; CTA `Concluindo…` + `disabled` enquanto `concluding()`.
- apps/web/src/app/features/shopping-list/checkout-sheet.scss (alterado): blocos `.checkout__fields`/`.field*` espelhando os tokens do `purchase-sheet` (hairline, `--radius-xs`, foco `--color-primary-text` + `--shadow-1`, erro `--color-danger`); ações inalteradas (≥44px, primary única).
- apps/web/src/app/features/shopping-list/checkout-sheet.spec.ts (alterado): de 10 para 14 specs — campos com comprados (hoje pré-preenchido, `max=today`, labels) AC-03; sem campos com 0 comprados RN-09; payload `{ market: 'Mercado Z' (trim), purchaseDate: hoje }` AC-03; mercado vazio/só espaços → "Mercado é obrigatório" + `aria-invalid` + sem request AC-04; data futura → "Data da compra não pode ser futura" + sem request AC-04; data vazia → "Data da compra é obrigatória" e `2026-02-31` → "Data da compra inválida" AC-04; 0 comprados → `checkout(null)` RN-09; duplo toque → 1 request + `Concluindo…` desabilitado AC-20/AC-15; erro 400 com mensagem PT → sheet aberto, digitado preservado, retry possível AC-05/AC-15; resumo/cancel/44px/primary únicos mantidos.
- apps/web/src/app/features/shopping-list/shopping-list-page.spec.ts (alterado, só specs — o componente/template da página não mudou): `StoreStub` ganhou `concluding`; os fluxos com comprados agora preenchem `#checkout-market` antes de concluir; "sem itens comprados" passa a asserir `checkout` chamado com `null`; o teste antigo "o resumo da conclusão não pede mercado nem data (AC-21)" foi substituído por: campos presentes com comprados (AC-03), campos ausentes sem comprados (RN-09/AC-07) e falha ao concluir → toast `.toast--error` com a mensagem PT + digitado preservado + lista intacta (AC-05/AC-15).

ACs cobertos:
- AC-03: com ≥1 comprado o sheet mostra Mercado* e Data* (hoje pré-preenchida, editável, `max=today`) — spec unitária do sheet + asserção na página.
- AC-04: mercado vazio/só espaços, data vazia/futura/inválida → erro no campo correspondente (`role="alert"`, `aria-invalid`) e **nenhuma** requisição (o guard em `confirm()` retorna antes de `store.checkout`).
- AC-05: payload válido enviado (`{ market, purchaseDate }`), sucesso emite `confirmed` (a página fecha o sheet e mostra o toast; a remoção dos comprados é da resposta do serviço via store).
- AC-07/RN-09: 0 comprados → nenhum campo renderizado e `checkout(null)` (sem payload) — provado no sheet e na página.
- AC-15: erro (400/rede) → sheet permanece aberto, digitado preservado, novo `confirmed` não emitido, retry possível; a mensagem PT vira toast pelo efeito `mutationError` da página (asserção nova).
- AC-19 (sheet): labels associados, `*` + obrigatório oculto, foco preso/devolvido pelo `BottomSheet` existente (sem mudança — com campos, o foco inicial cai no Mercado), tokens only, primary única, alvos ≥44px.
- AC-20: CTA `Concluindo…` + `disabled` durante `concluding()`; duplo toque → 1 request (o single-flight na store da T-15 é a garantia de fundo; o spec prova 2 cliques → 1 chamada).

Testes executados:
- `npx nx test web` → 23 arquivos, **238 testes, 0 falhas** (antes 232: +4 no sheet, +2 líquidos na página — 3 novos e 1 antigo removido).
- `npx nx lint web` → Successfully (0 problemas; nenhum `any`).
- `npx nx build web` → verde.
- `npx nx e2e web-e2e` → **34 passed, 2 failed** (28,4s). Os 2 vermelhos são de `apps/web-e2e/src/shopping-list/checkout.spec.ts` (**fora do meu escopo — NÃO corrigidos**, decisão com o orquestrador; mesmo caso da T-16, ratificado):
  1. `checkout.spec.ts:99 › "o resumo não pede mercado nem data"` — asserção do comportamento antigo (0 inputs no sheet) que esta mudança substitui de propósito por AC-03/RN-09.
  2. `checkout.spec.ts:6 › "resumo N saem/M permanecem; confirmar remove só os comprados + toast; cancelar mantém a lista"` — clica "Concluir compra" com comprado sem preencher mercado; a validação local nova (AC-04) bloqueia corretamente e o sheet permanece aberto, derrubando o locator que esperava o sheet fechado. A correção é preencher os campos na jornada (T-22).

Decisões registradas:
- **Single-flight**: o estado de progresso é `store.concluding()` (T-15 já serializa o POST); o componente só espelha rótulo/`disabled` e tem um guard de leitura antes de enviar — redundante de propósito, e o spec prova 2 toques → 1 request.
- **Validação só após o primeiro submit** (`submitted`), mesmo padrão do `purchase-sheet`: nada de erro vermelho antes de a pessoa tentar concluir.
- **Mensagens PT espelham o backend** (`Mercado é obrigatório`, `Data da compra é obrigatória`, `Data da compra não pode ser futura`, `Data da compra inválida`) — se o 400 chegar mesmo assim, o toast da página mostra a mesma string do campo.
- **Data futura comparada como texto** (`YYYY-MM-DD` com zeros à esquerda compara lexicograficamente certo) + `isCalendarDate` rejeitando dias impossíveis (`2026-02-31`) que o `type="date"` não forma mas o DOM aceita.
- **jsdom sanitiza `type="date"`** e zera valor inválido: o teste de "data inválida" contorna com um accessor no elemento (getter devolve o valor digitado, setter vazio absorve o binding `[value]`) — comentado no próprio teste, não é bug da tela.
- **`localDateString()` exportada** do componente: o spec reusa o mesmo cálculo de "hoje" local em vez de duplicar a fórmula (RN-04: fuso da pessoa).

Composição (T tocou UI):
- Tipo: **formulário de app** dentro de bottom sheet (guia §4): título do sheet + resumo curto (lead + 2 linhas) → campos agrupados (`--space-lg` entre grupos, `--space-md` dentro) → par de ações no terço inferior; com 0 comprados os campos somem e o resumo sozinho compõe a decisão (RN-09) — nada de form no vazio.
- Campos espelham a gramática do `purchase-sheet` (label caption `--color-ink-secondary`, `*` com "(obrigatório)" oculto, erro `--color-danger` abaixo com anúncio `role="alert"`), só tokens; a única `primary` do sheet continua "Concluir compra".

Pendências:
- **E2E ×2 vermelhos documentados acima** — `apps/web-e2e/**` é dono da T-22; nada foi corrigido lá. Recomendo ao orquestrador manter a decisão de ratificar como na T-16 ou repassar à T-22.
- `shopping-list-page.ts`/`.html`/`.scss` **não mudaram**: o wiring já existia (outputs `closed`/`confirmed` + toast "Compra concluída"); só o spec da página foi ajustado à nova behavior.
- `STATUS.md` não tocado; git não executado (conforme a delegação). Commit da T-17 (Conventional Commits, `T-17`) deve incluir os 5 arquivos acima.

Próximo passo recomendado: onda 10 — **T-18** (Telas Histórico + detalhe, `features/price-history/**`) ∥ **T-20** (auditoria backend); depois **T-19** (Menor preço) e, ao fim, **T-21/T-22** (auditoria unitária PWA e E2E — esta última atualiza os 2 specs vermelhos de checkout e cobre a jornada com os campos novos).

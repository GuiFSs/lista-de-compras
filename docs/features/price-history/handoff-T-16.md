Tarefa: T-16
Estado: concluída

Arquivos alterados:
- apps/web/src/app/app.routes.ts (alterado): três rotas filhas do `AuthenticatedShell`, lazy via `loadComponent` — `historico`, `historico/:id`, `menor-preco` (imports dinâmicos dos componentes de `features/price-history`). `path: ''` continua `ShoppingListPage` (Lista permanece `/`) e `**` continua por último; as rotas novas herdam o `authGuard` do pai, sem guard novo.
- apps/web/src/app/layout/bottom-nav/bottom-nav.ts (alterado): comentário do componente atualizado (as três abas têm rota real; Histórico/Menor preço acompanham os filhos). Sem mudança de API do componente.
- apps/web/src/app/layout/bottom-nav/bottom-nav.html (alterado): as abas Histórico e Menor preço deixaram de ser `<button disabled>` com "em breve" e viraram `<a routerLink>` (`/historico`, `/menor-preco`) com `routerLinkActive="bottom-nav__tab--active"` e `ariaCurrentWhenActive="page"`, idênticos ao link da Lista. Ícones/labels existentes (`app-icon-clock`, `app-icon-tag`) mantidos.
- apps/web/src/app/layout/bottom-nav/bottom-nav.scss (alterado): removidas a regra `.bottom-nav__tab:disabled` e o seletor `.bottom-nav__soon` (não há mais aba desabilitada nem "em breve"). Ativo segue em `--color-primary-text`; alvo mínimo em `--bottom-nav-height`.
- apps/web/src/app/layout/bottom-nav/bottom-nav.spec.ts (alterado): de 5 para 7 spec. Novos: Histórico navega para `/historico` e fica ativa (`aria-current="page"`); Menor preço navega para `/menor-preco` e fica ativa; detalhe `/historico/:id` mantém a aba Histórico ativa (e Lista inativa); nenhuma aba desabilitada nem com "em breve".
- apps/web/src/app/features/price-history/history-page.ts/.html/.scss (novos): placeholder navegável de `/historico` — título + frase, só tokens; contribui título "Histórico" no app bar.
- apps/web/src/app/features/price-history/history-detail-page.ts/.html/.scss (novos): placeholder navegável de `/historico/:id` — contribui título "Detalhe da compra".
- apps/web/src/app/features/price-history/lowest-price-page.ts/.html/.scss (novos): placeholder navegável de `/menor-preco` — contribui título "Menor preço".
- apps/web-e2e/src/shopping-list/load.spec.ts (alterado, **edição autorizada pelo usuário na sessão**): era o único teste E2E vermelho e afirmava o comportamento antigo (abas `button` desabilitadas, "em breve" ×2, toque não navega). Reescrito para o comportamento novo: Histórico/Menor preço são links habilitados com `href` `/historico`/`/menor-preco`, sem "em breve"; toque real em Histórico navega e ativa a aba; voltar pela aba Lista retoma a lista.

ACs cobertos:
- AC-01: aba Histórico é link real para `/historico`, ativa em `--color-primary-text` (classe `--active` sobre o token) e **sem** "em breve"/desabilitado — provado na spec unitária (navegação + estado ativo + ausência de `button`/"em breve") e no E2E `load.spec.ts` (toque → `/historico`).
- AC-02: aba Menor preço é link real para `/menor-preco`, ativa e sem "em breve" — provado nos mesmos dois níveis.
- AC-19 (navegação): nav mobile-first com marco `nav aria-label="Navegação principal"`, `aria-current="page"` na aba ativa, alvo ≥44px via `min-height: var(--bottom-nav-height)` e ícone+label em tokens (`--font-size-eyebrow`); layout de coluna única/bottom nav fixa inalterado. O restante do AC-19 (4 estados, uma `primary`, ~360px/desktop, temas) é das telas de T-18/T-19 e do sheet de T-17.
- AC-18: sem regressão — as rotas novas são filhas do mesmo pai com `authGuard`; nenhuma rota pública adicionada.

Testes executados:
- `npx nx test web` → 23 arquivos, **232 testes, 0 falhas** (o número inclui as mudanças da T-15 ainda não commitadas no mesmo worktree; a spec da nav foi de 5 → 7: +2 testes líquidos meus).
- `npx nx lint web` → All files pass linting (0 problemas; nenhum `any`).
- `npx nx build web` → verde; chunks lazy novos `history-page`, `history-detail-page`, `lowest-price-page` gerados (~0,9 kB cada).
- `npx nx e2e web-e2e` → **36 passed, 0 failed** (22,4s). Antes da correção autorizada do `load.spec.ts`: 35 passed, 1 failed — o único vermelho era o teste que afirmava o comportamento antigo da nav (auth/shell/lista passaram em todos os demais).
- `npx nx lint web-e2e` → All files pass linting (verifica a edição no E2E).

Decisões registradas:
- **Match das abas**: Lista mantém `[routerLinkActiveOptions]="{ exact: true }"` (sem isso `/` prefixa qualquer URL e ficaria sempre ativa); Histórico e Menor preço usam o match padrão para que o detalhe `/historico/:id` mantenha a aba Histórico ativa — coerente com a receita de "voltar sempre pela aba" do guia §3. `aria-current="page"` em todas as abas ativas, padrão já existente.
- **Lazy por rota** (`loadComponent`) espelhando a rota `login`: cada tela nova vira chunk próprio (confirmado no build) e o shell não engorda. As telas reais de T-18/T-19 entram no mesmo ponto de import.
- **Placeholders dentro de `features/price-history/**`** (permitido pela delegação "apenas se não houver outra forma — declare no handoff"): mantêm a rota navegável sem UI real e sem antecipar as telas de T-18/T-19; nomes `history-page`/`history-detail-page`/`lowest-price-page` seguem o padrão plano da feature de shopping-list para T-18/T-19 **substituírem em lugar** em vez de reorganizar rotas. Cada placeholder contribui o título do app bar via `ShellChromeService` (mesmo padrão de `shopping-list-page`) para o shell ficar coerente na troca de aba.
- **Sem `app.routes.spec.ts` novo**: o escopo estrito lista `app.routes.ts` (não um spec irmão). A prova de "rotas registradas" vem dos `href`/navegação na spec da nav, dos chunks lazy no build e do E2E. Se o orquestrador quiser uma spec dedicada da tabela de rotas, é uma adição pequena fora do meu escopo.

Composição (T tocou UI — nav/rota):
- Não há tela nova a "compor" aqui: o placeholder é estado transitório (título `h2` + frase em `--color-ink-muted`, sem CTA) e a receita real (skeleton/empty/erro + conteúdo) é de T-18/T-19. A superfície tocada é a **bottom nav** (guia §3): ícone + label, ativa em `--color-primary-text`, fixa com `--safe-bottom`, alvos ≥44px.
- A nav usa só tokens e preserva o padrão visual existente — nenhum estilo novo, nenhuma cor hardcoded; as abas novas são visualmente idênticas às anteriores, apenas habilitadas e navegáveis (evita "placeholder no lugar de hierarquia").

Pendências:
- **Placeholders são temporários**: T-18 (Histórico + detalhe) e T-19 (Menor preço) são donas de `features/price-history/**` e devem substituir `history-page*`, `history-detail-page*` e `lowest-price-page*` pelas telas reais com os 4 estados (AC-06, AC-08–AC-14, AC-19 completo).
- `apps/web-e2e/src/shopping-list/load.spec.ts` foi editado com autorização explícita do usuário na sessão (arquivo pertence à T-22). A cobertura E2E **dedicada** de AC-01/AC-02 continua sendo `price-history/nav.spec.ts` (matriz do PLAN, T-22) — a edição aqui só alinhou a asserção de shell à nova realidade, sem duplicar a jornada.
- Worktree compartilhado: há mudanças não commitadas de **T-15** (`features/shopping-list/data/shopping-list-api.service.ts`, `.../state/shopping-list-store.ts` e `.spec.ts`) no mesmo diretório — não são minhas e não foram tocadas; o commit da T-16 deve considerar só os arquivos acima.
- Não toquei `STATUS.md`, `features/shopping-list/**`, `core/**`, `libs/contracts`, backend nem git (conforme a delegação).

Próximo passo recomendado: encerrar a onda 8 e seguir para **T-17** (checkout sheet, depende de T-15/T-16) sozinha; depois **T-18** (Histórico + detalhe) ∥ possivelmente **T-20**, e **T-19** (Menor preço) consumindo o store da T-14 e estas rotas; **T-22** cobre a jornada E2E dedicada de nav (`price-history/nav.spec.ts`). Commit da T-16 (Conventional Commits, `T-16`) fica com o orquestrador.

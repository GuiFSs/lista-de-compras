Tarefa: T-18 — Telas Histórico + detalhe (PWA)
Estado: concluída

Arquivos alterados (todos dentro de `apps/web/src/app/features/price-history/**`):
- apps/web/src/app/features/price-history/history-page.ts (novo): componente `HistoryPage` (standalone). Injeta `PriceHistoryStore` (RN-19: `providedIn: 'root'`; a tela só lê) e `ShellChromeService` (contribui o título "Histórico" via `contribute(..., destroyRef)`). Expõe `status`/`purchases`/`loadError` como `computed` sobre `store.purchases()`; `summary` ("N compras"/"1 compra"); `itemsLabel(count)` ("N itens"/"1 item"); `retry()` → `store.loadPurchases()`. No construtor dispara `void this.store.loadPurchases()` (AC-14: toda entrada refaz o GET; o histórico é do serviço — RN-01/RN-08).
- apps/web/src/app/features/price-history/history-page.html (novo): 4 estados — skeleton (3 linhas, `role="status"`+`aria-busy="true"`+`.visually-hidden` "Carregando o histórico…", sem spinner), vazio (`.empty__sticker` decorativo + título + texto + 1 CTA `primary` "Ir para a lista" `href="/"`), erro (`.load-error` `role="alert"` + `.btn-secondary` "Tentar novamente") e sucesso (apoio `.summary` + `<ul role="list">` com uma `<a class="history__link" [routerLink]="['/historico', p.id]">` por compra: `DD/MM/AAAA` como linha primária e `mercado · N itens` como legenda).
- apps/web/src/app/features/price-history/history-page.scss (novo): só tokens (`--color-*`, `--space-*`, `--radius-*`, `--shadow-*`). Linha é âncora com `min-height: 44px` e margem inline negativa (o texto alinha à coluna, mas o alvo continua ≥44px e clicável por inteiro); `a { color: var(--color-ink) }` local vence o `--color-primary-text` global do `_reset.scss`.
- apps/web/src/app/features/price-history/history-detail-page.ts (novo): componente `HistoryDetailPage`. Injeta store + chrome (título "Compra") + `ActivatedRoute`. `route.snapshot.paramMap.get('id')` alimenta `store.loadPurchase(id)` no construtor e `destroyRef.onDestroy(() => store.clearPurchase())` (RN-19: a seleção não sobrevive à rota). `retry()` chama `store.loadPurchase()` sem id (o store repete a última seleção).
- apps/web/src/app/features/price-history/history-detail-page.html (novo): `page-back` (`<a routerLink="/historico" aria-label="Voltar para o histórico">Voltar</a>`) presente **em todos os estados**, inclusive erro/404 (guia §4: voltar é a navegação principal); skeleton (título + linha + 3 itens, `role="status"`); erro (`role="alert"` "Não foi possível carregar a compra" + mensagem do serviço, ex. "Compra não encontrada", + "Tentar novamente"); sucesso (mercado, data `DD/MM/AAAA`, `<ul role="list" aria-label="Itens comprados">` com nome + `quantidade · R$ preço` por item).
- apps/web/src/app/features/price-history/history-detail-page.scss (novo): tokens only; `.btn-primary`/`.btn-secondary` são component-scoped no repo, cada página define só o que usa; `.page-back` com `min-height: 44px`.
- apps/web/src/app/features/price-history/purchase-format.ts (novo): `formatPurchaseDate` (`YYYY-MM-DD` → `DD/MM/AAAA`, devolve a entrada intacta se não casar), `formatQuantity` (vírgula decimal) e `formatUnitPrice` (`R$ 7,50`). Sem `Intl` — determinístico e independente do fuso/locale da máquina de CI.
- apps/web/src/app/features/price-history/purchase-format.spec.ts (novo): 3 specs cobrindo data válida/inválida/vazia, vírgula na quantidade e centavos no preço.
- apps/web/src/app/features/price-history/history-page.spec.ts (novo): 6 specs — skeleton na forma da lista + 1 GET ao entrar (AC-13); título "Histórico" na app bar e volta ao default ao destruir (AC-01); empty com 1 único primary "Ir para a lista" `href="/"` e sem lista/apoio (AC-12); lista com data+mercado na ordem do serviço + `.summary` plural + `role="list"` (AC-06/RN-08); `.summary` singular com 1 compra; erro `role="alert"` + "Tentar novamente" refazendo o GET; tocar na linha navega para `/historico/:id` (AC-11).
- apps/web/src/app/features/price-history/history-detail-page.spec.ts (novo): 6 specs — `loadPurchase('c1')` + skeleton de detalhe (AC-13); título "Compra" + `clearPurchase()` ao destruir (AC-11/RN-19); detalhe com mercado/data/itens + meta `2 pacote · R$ 7,50` + `role="list"`/`aria-label` + `page-back` com `aria-label`/`href` (AC-11); 404 "Compra não encontrada" → erro com voltar disponível + retry sem id (AC-14); voltar navega para `/historico` (AC-11).

ACs cobertos:
- AC-01: app bar mostra o título da tela ("Histórico"/"Compra") via `ShellChromeService` e as abas de nav continuam navegando (o shell/nav é da T-16; a T-18 só contribui o título) — provado nos specs de título e no E2E existente de nav.
- AC-06: a lista mostra data (primária) e mercado por compra, na ordem entregue pelo serviço (RN-08: a tela não reordena nem deriva domínio).
- AC-11: tocar numa compra abre `/historico/:id`; o detalhe mostra data, mercado e os itens daquela conclusão; "Voltar" (com `aria-label`) retorna à lista e está visível em todos os estados.
- AC-12: histórico vazio → empty state rico (sticker decorativo + título + texto) com **uma** CTA `primary` "Ir para a lista"; sem lista nem apoio.
- AC-13: primeira carga mostra skeleton no formato do conteúdo (linhas do histórico / título+itens do detalhe), `role="status"` + `aria-busy="true"`, nunca spinner sozinho.
- AC-14: falha de carga (ou 404 no detalhe) → bloco de erro `role="alert"` com a mensagem e "Tentar novamente" que refaz o GET; detalhe inexistente mapa para o mesmo estado com a mensagem do serviço.
- AC-19: labels/`aria-label` associados (voltar, lista "Itens comprados"), alvos ≥44px, uma única `primary` por tela, apenas tokens do GUIA (sem cor/px hardcoded).

Testes executados:
- `npx nx test web` → 26 arquivos, **253 testes, 0 falhas** (antes 238; +15: +6 história, +6 detalhe, +3 formatadores).
- `npx nx lint web` → Successfully (0 problemas; nenhum `any`).
- `npx nx build web` → verde; chunks lazy `history-page` (6,67 kB) e `history-detail-page` (6,49 kB) gerados; sem aviso de budget de `anyComponentStyle`.
- `npx nx e2e web-e2e` → **36 passed, 0 falhas** (22,4s). O spec `shopping-list/load.spec.ts` navega até `/historico` e afirma só o estado da nav (nenhum texto de placeholder), então continua verde mesmo a página agora buscando `localhost:3002` e caindo no estado de erro no E2E hermético — nenhum E2E novo ficou vermelho.

Decisões registradas:
- **Data como linha primária da lista**: `DD/MM/AAAA` grande + `mercado · N itens` como legenda; a linha inteira é uma `<a [routerLink]="['/historico', id]">` com `min-height: 44px` e margem inline negativa (mantém o texto alinhado à coluna sem encolher o alvo de toque).
- **Sem `Intl`**: `Intl.DateTimeFormat` depende de locale/fuso e diverge entre máquinas de CI; os helpers puros da feature (`purchase-format.ts`) são determinísticos. É uma duplicação pequena de helpers de exibição, aceita e coerente com o que `item-row.ts` já faz no projeto.
- **Skeleton explícito**: as linhas do skeleton são constantes (`SKELETON_ROWS`/`SKELETON_ITEMS`) para o skeleton ter o formato do conteúdo real (AC-13), não uma caixa genérica.
- **Voltar dentro do conteúdo, no topo do detalhe**: o shell não tem slot de ação à esquerda e `layout/**` está fora do escopo da T; o controle fica visível em todos os estados, inclusive erro/404.
- **404 → estado de erro**: o serviço devolve a mensagem ("Compra não encontrada"); a tela a exibe no bloco de erro padrão em vez de um estado próprio.
- **Retry do detalhe sem id**: `retry()` chama `loadPurchase()` sem argumento; o store repete a última seleção guardada — a tela não reimplementa qual id buscar.
- **`clearPurchase()` no `destroyRef.onDestroy`**: detalhe de uma compra não sobrevive à tela (RN-19), evitando vazar a seleção para a próxima visita à lista.
- **`route.snapshot.paramMap`** (em vez de `toSignal(route.paramMap)`): o fluxo é sempre lista → detalhe, sem troca de `:id` com o componente vivo; o snapshot simplifica e o spec controla o `ActivatedRoute`.
- **Teste do detalhe**: o stub de `ActivatedRoute` é provido **depois** de `provideRouter(...)`, porque o array de providers deixa o último vencer e o `provideRouter` também registra um `ActivatedRoute` raiz sem params — ordem importa (comentado no spec).

Composição (T tocou UI):
- **Tipo**: lista de conteúdo (Histórico) e página de detalhe (guia §4). Na lista há cabeçalho de apoio (`.summary`) → lista de linhas com hierarquia clara (data forte, mercado/itens em caption) → nada mais; a navegação é a própria linha, então não há CTA competindo com o primary do estado vazio.
- **Detalhe**: voltar (navegação primária) → título/cabeçalho com mercado e data → itens agrupados; nos estados de carregamento/erro/vazio o mesmo esqueleto de página se mantém (voltar + bloco central), evitando o form/lista "no vazio".
- **Estados desenhados por estado, não por acidente**: cada estado (carregando, vazio, erro, sucesso) tem seu próprio layout completo com marca/cabeçalho de contexto — anti-padrão "form no vazio" não se aplica; a única `primary` da tela aparece só no vazio.

Notas didáticas (Angular × React) — para quem vem de React:
- **Componente standalone** (`@Component({ imports: [...] })`) é como um componente React com os imports declarados junto: o template é o "JSX" (`templateUrl`), mas a reatividade não é re-render por estado local — `computed()` é um valor derivado reavaliado quando o sinal-fonte muda, tipo `useMemo` ligado a um store observável, e o Angular atualiza só os nós de DOM afetados.
- **Injeção de dependência** (`inject(PriceHistoryStore)`) é o contexto React (`useContext`) levado ao runtime do framework: em vez de um `Provider` envolvendo a árvore, o token é resolvido por tipo em qualquer nível, e o `providedIn: 'root'` faz o store ser um singleton app-wide.
- **Navegação** por `routerLink`/`Router` é o análogo de `<Link>`/`useNavigate`; a diferença é que a rota `historico/:id` é resolvida por `ActivatedRoute` (`paramMap`), que é como ler `useParams()` — aqui via `snapshot` por simplicidade de fluxo.
- **Ciclo de vida** usa `DestroyRef.onDestroy` (equivalente ao cleanup de `useEffect`): registra o teardown (`clearPurchase`) ligado ao componente, sem `ngOnDestroy` explícito.

Pendências:
- Nenhum arquivo de `apps/web-e2e/**` foi tocado (a cobertura E2E da jornada de histórico é da T-22); nenhum E2E ficou vermelho.
- `app.routes.ts`, `layout/**`, `features/shopping-list/**`, `core/**`, backend e `libs/contracts` não foram modificados.
- `STATUS.md` não tocado; git não executado (conforme a delegação). O commit da T-18 (Conventional Commits, escopo `T-18`) deve incluir os 11 arquivos listados acima.

Próximo passo recomendado: onda 11 — **T-19** (Tela Menor preço, mesma pasta `features/price-history/**`; sequencial em relação à T-18 por compartilhar a pasta); depois **T-20** (auditoria backend) e, ao fim, **T-21/T-22** (auditoria unitária PWA e E2E — esta última adiciona os specs de jornada `histórico` e `menor preço` e evolui o checkout fake).

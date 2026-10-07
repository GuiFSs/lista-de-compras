# Guia de design e UX — Lista de Compras

> Referência de estilo: [`DESIGN-notion.md`](../../DESIGN-notion.md) (na raiz) ·
> Decisão registrada na [ADR 0005](../decisions/0005-linguagem-de-design-mobile-first.md).
>
> Este guia é a **fonte de verdade** do design do projeto. Ele espelha os tokens
> de `apps/web/src/styles/_tokens.scss`: doc e CSS mudam na mesma rodada, nunca
> um sem o outro. É leitura obrigatória antes de especificar ou implementar uma
> feature (ver `AGENTS.md`).

A adoção do Notion é **inspiração, não rigidez**: valem os princípios e a
disciplina visual, não o pixel exato do arquivo de referência.

---

## 1. Princípios

1. **Mobile-first**: o celular é o alvo principal (PWA instalável); desktop é
   derivado, com uma única coluna centralizada.
2. **Calmo e document-like**: fundo de página no papel quente, superfícies
   brancas, hairlines finas. Nada grita; o conteúdo é o protagonista.
3. **Um único azul**: `--color-primary` é a única cor estrutural de ação —
   CTA, link, foco e item ativo da navegação. Nunca decora.
4. **Whitespace agrupa**: separação por respiro, não por bordas ou linhas.
5. **Uma ação primária por tela**: um botão `primary` visível por tela;
   o resto é secundário ou ghost.
6. **Alvo de toque ≥ 44×44px** em qualquer elemento clicável, inclusive
   os que só têm ícone.
7. **Toda tela tem 4 estados**: carregando, vazio, erro e sucesso — nenhum
   fica implícito.

---

## 2. Tokens (espelho do `_tokens.scss`)

### Cores — tema claro

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-primary` | `#0075de` | Fundo do CTA, indicador ativo |
| `--color-primary-active` | `#005bab` | Estado pressionado do CTA |
| `--color-primary-text` | `#0075de` | Links, foco, texto/ícone em azul |
| `--color-on-primary` | `#ffffff` | Texto sobre o CTA |
| `--color-secondary` | `#213183` | Indigo profundo (uso pontual, ex.: faixa de destaque) |
| `--color-canvas` | `#f6f5f4` | Fundo de página (papel quente) |
| `--color-surface` | `#ffffff` | Cards, app bar, campos, sheets |
| `--color-ink` | `#000000` | Títulos e corpo principal |
| `--color-ink-secondary` | `#31302e` | Texto de apoio |
| `--color-ink-muted` | `#615d59` | Texto secundário/metadados |
| `--color-ink-faint` | `#a39e98` | Placeholders, legendas |
| `--color-hairline` | `#e6e6e6` | Bordas e divisores de 1px |

### Cores semânticas (só feedback: validação, toast, badge)

| Token claro | Valor | Token suave | Valor |
| --- | --- | --- | --- |
| `--color-success` | `#15803d` | `--color-success-soft` | `#ecf7ef` |
| `--color-warning` | `#9a6700` | `--color-warning-soft` | `#fff7e0` |
| `--color-danger` | `#c62828` | `--color-danger-soft` | `#fdecec` |

### Paleta decorativa (*sticker*) — **nunca** em CTA ou estrutura

`--color-sticker-sky` `#62aef0` · `--color-sticker-purple` `#d6b6f6` ·
`--color-sticker-purple-deep` `#391c57` · `--color-sticker-pink` `#ff64c8` ·
`--color-sticker-orange` `#dd5b00` · `--color-sticker-orange-deep` `#793400` ·
`--color-sticker-teal` `#2a9d99` · `--color-sticker-green` `#1aae39` ·
`--color-sticker-brown` `#523410`

Uso: dots de categoria, ilustrações de empty state, faixas coloridas. Em texto
sobre fundo claro, usar apenas as variantes *deep* (`purple-deep`, `orange-deep`)
que têm contraste suficiente.

### Tema escuro

Aplicado automaticamente por `prefers-color-scheme: dark` e forçável com
`document.documentElement.setAttribute('data-theme', 'dark')`.

| Token | Valor escuro |
| --- | --- |
| `--color-canvas` | `#191919` |
| `--color-surface` | `#202020` |
| `--color-ink` | `#ffffff` |
| `--color-ink-secondary` | `#e3e2e0` |
| `--color-ink-muted` | `#9b9a97` |
| `--color-ink-faint` | `#6b6a66` |
| `--color-hairline` | `rgba(255, 255, 255, 0.1)` |
| `--color-primary` / `--color-on-primary` | inalterados (`#0075de` / `#ffffff`) |
| `--color-primary-text` | `#62aef0` (azul claro para contraste no escuro) |
| `--color-success` | `#3fb950` |
| `--color-warning` | `#d29922` |
| `--color-danger` | `#f85149` |
| `*-soft` | a cor forte a 15% de opacidade |

Regras do escuro: superfícies sobem por **tom** (`#191919` → `#202020`) e a
definição vem da hairline branca; a paleta sticker não muda (é decorativa);
sombra encurta, pois hairline já dá profundidade.

### Tipografia — Inter (auto-hospedada via `@fontsource/inter`)

| Token | Tamanho | Onde |
| --- | --- | --- |
| `--font-size-display` | 32px / 700 / tracking −0.03em | Rare: hero de empty state e login |
| `--font-size-h1` | 26px / 700 / −0.02em | Título da tela |
| `--font-size-h2` | 22px / 700 / −0.02em | Seções |
| `--font-size-title` | 20px / 600 / −0.01em | Cards, dialogs, títulos de item |
| `--font-size-body` | 16px / 400 / 1.5 | Corpo padrão, formulários |
| `--font-size-body-sm` | 15px / 400 | Listas densas, navegação |
| `--font-size-caption` | 14px / 400 | Metadados, legendas |
| `--font-size-eyebrow` | 12px / 600 / +0.01em | Badges, rótulos pequenos |

- Pesos usados: **400** (corpo), **500** (botões), **600** (títulos pequenos e
  eyebrow), **700** (títulos). Corpo **nunca** em peso forte.
- A escala é de **aplicação**, não de marketing: o display de 64px do Notion não
  se reaplica aqui.
- Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial`.

### Espaçamento (base 4px, ritmo 8px)

`--space-xxs` 4 · `--space-xs` 8 · `--space-sm` 12 · `--space-md` 16 ·
`--space-lg` 24 · `--space-xl` 28 · `--space-xxl` 32

### Raios

`--radius-xs` 4 (campos, chips) · `--radius-sm` 5 (linhas de lista, pills) ·
`--radius-md` 8 (botões utilitários) · `--radius-lg` 12 (cards) ·
`--radius-xl` 16 (sheets, containers grandes) · `--radius-full` 9999 (CTA, badges)

Campo de texto **nunca** usa pill; CTA **nunca** usa raio quadrado.

### Elevação

- `--shadow-1` — sombra em camadas quase invisíveis: cards que flutuam,
  botões flutuantes, foco de campo.
- `--shadow-2` — mais profunda: sheets, modais, popovers.
- Padrão de card no canvas = **hairline, sem sombra**. Sombra só quando o
  elemento realmente flutua acima da superfície.

### Layout e navegação

| Token | Valor | Uso |
| --- | --- | --- |
| `--container-max` | `960px` | Coluna de conteúdo no desktop |
| `--app-bar-height` | `56px` | Altura da app bar |
| `--bottom-nav-height` | `56px` | Altura da bottom nav |
| `--touch-target-min` | `44px` | Tamanho mínimo de área de toque |
| `--safe-bottom` | `env(safe-area-inset-bottom, 0px)` | Espaço do notch/home indicator |
| `--z-app-bar` / `--z-bottom-nav` | `100` | Camadas fixas |
| `--z-overlay` | `200` | Backdrop de sheet/modal |
| `--z-toast` | `300` | Toasts |

### Movimento e breakpoints

- `--motion-fast` 120ms · `--motion-base` 200ms (transições de estado).
- Breakpoints de referência: `sm` 640px · `md` 768px · `lg` 1024px.
- Com `prefers-reduced-motion: reduce`, animações e transições são desligadas.

---

## 3. Navegação (padrão mobile-first)

```
┌─────────────────────────────┐
│ App bar: título + ações     │  ← surface + hairline embaixo, sem azul
├─────────────────────────────┤
│                             │
│  Conteúdo (coluna única)    │  ← canvas; padding-bottom = bottom nav
│                             │
├─────────────────────────────┤
│  Lista · Histórico · Preços │  ← bottom nav fixa, ativo em azul
└─────────────────────────────┘
```

- **App bar** (`--app-bar-height`): superfície, título em `--font-size-h2`,
  ações à direita como botões de ícone. Hairline embaixo, sem sombra.
- **Bottom nav** (`--bottom-nav-height`): abas **Lista**, **Histórico**,
  **Menor preço**. Ícone + label em `--font-size-eyebrow`; ativo usa
  `--color-primary-text`, inativo `--color-ink-muted`. Fixa, com
  `padding-bottom: var(--safe-bottom)`.
- O conteúdo **sempre** reserva `padding-bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + var(--space-md))` para não ficar sob a barra.
- **Login fica fora** da navegação (tela cheia, sem bottom nav).
- No desktop (`md+`), a bottom nav pode continuar no rodapé — a aplicação é
  mobile-first e não precisa de sidebar.
- Voltar é sempre possível: navegação por abas preserva o histórico do
  navegador/PWA.

---

## 4. Padrões de componentes

Regras para serem aplicadas nas specs de feature (os componentes serão criados
nas respectivas implementações).

### Botões

| Variante | Aparência | Uso |
| --- | --- | --- |
| `primary` | Fundo `--color-primary`, texto `--color-on-primary`, pill `--radius-full` | Ação principal da tela (uma por tela) |
| `secondary` | Fundo `--color-surface`, texto `--color-ink`, hairline, pill | Ação de apoio ao lado do primary |
| `ghost` | Transparente, texto `--color-primary-text` | Ações leves dentro de cards |
| `icon` | Circular, fundo `--color-ripple` (no escuro o token já vira branco a 8%) | Apenas ícone, sempre com `aria-label` |
| `danger` | Texto `--color-danger`, fundo `--color-danger-soft` | Excluir/limpar (nunca o primary em vermelho) |

- Altura mínima 44px (`--touch-target-min`); rótulo em `--font-size-body`,
  peso 500.
- Estado pressionado: `--color-primary-active` + `scale(0.97)`;
  desabilitado: opacidade 0.5 e `cursor: not-allowed`.
- Envio de formulário mostra rótulo de progresso (`Salvando…`) e desabilita o
  botão — sem cliques duplos.

### Campos de texto e selects

- Superfície branca, **1px hairline**, `--radius-xs` (4px) — canto mais fechado
  que os botões, de propósito.
- Rótulo sempre visível acima (`--font-size-caption`, `--color-ink-secondary`);
  placeholder não substitui rótulo.
- Foco: borda `--color-primary-text` + `--shadow-1` (anel de foco visível).
- Erro: borda `--color-danger`, mensagem abaixo em `--font-size-caption` com
  ícone, ligada por `aria-describedby` + `aria-invalid`.
- Select de unidade (padronizado: `unidade`, `kg`, `g`, `L`, `ml`, `pacote`,
  `caixa`) é **sempre** `<select>`/sheet — nunca digitação livre.
- Label do campo obrigatório com `*` e texto acessível "obrigatório".

### Listas (itens da lista de compras)

- Linha com checkbox/ícone de marcar à esquerda ou direita (lado do polegar),
  nome em `--font-size-body`, metadade (quantidade, unidade, preço) em
  `--font-size-caption` `--color-ink-muted`.
- Divisor hairline entre linhas; sem sombra.
- Item comprado: nome com `text-decoration: line-through` e
  `--color-ink-faint` — **sem** diminuir o alvo de toque.
- Ações secundárias (editar/excluir) não ficam sempre visíveis: swype, sheet ou
  menu — a linha padrão mostra só o essencial.
- Lista com muitos itens agrupa por estado (pendentes em cima, comprados
  embaixo).

### Sheets e modais

- Bottom sheet no mobile (arrasta de baixo), `--radius-xl` em cima,
  `--color-surface`, backdrop `--color-overlay` com `--z-overlay`.
- Usados para: confirmar compra (quantidade real ≠ planejada), escolher unidade,
  ações de item. Nunca para conteúdo longo.
- Fecha com botão visível (não só com backdrop/gesto); foco preso dentro;
  `Esc` fecha.

### Toasts

- `--color-surface`, `--radius-xl`, `--shadow-2`, texto `--font-size-body-sm`,
  `--z-toast`; ancorado acima da bottom nav.
- Confirmações rápidas ("Item adicionado", "Compra salva") com auto-dismiss
  ~4s; erros ficam até o descarte.
- Erros de rede: toast + manter o que a pessoa digitou.

### Empty states

- Ilustração/emoji da paleta sticker + título (`--font-size-title`) + frase
  curta (`--font-size-body`, `--color-ink-muted`) + ação primária.
- Presente em: lista vazia, histórico vazio, busca sem resultado.
- Nunca mostrar só uma tela em branco.

### Carregamento

- Primeira carga da tela: **skeleton** na forma do conteúdo (nunca spinner
  centralizado sozinho).
- Ações locais: botão com estado `Salvando…`.
- Offline: banner discreto `--color-warning-soft` + aviso de que será
  sincronizado.

---

## 5. UX mobile-first e acessibilidade

- **Uma coluna** sempre; `md+` apenas centraliza em `--container-max` e reserva
  mais respiro lateral.
- **Polegar**: ações frequentes no terço inferior (bottom nav, botão de adicionar
  item, sheets); ações destrutivas nunca ao lado direto do principal.
- **Feedback imediato**: toda ação tem resposta visual em <100ms (estado,
  toast ou transição).
- **Contraste**: texto ≥ 4.5:1, elementos não textuais ≥ 3:1 (já garantido pelos
  tokens de cada tema — não inventar cor fora deles).
- **Foco**: `:focus-visible` com contorno `--color-primary-text` e offset —
  nunca `outline: none` sem substituto.
- **Teclado virtual**: campo focado não fica coberto pelo bottom nav; rolar até
  o campo visível.
- **Zoom 200%** sem quebrar layout; nada de larguras fixas em px para texto.
- **Toque**: `touch-action: manipulation` (sem delay de 300ms); alvos ≥44px.
- **Voz/leitura**: labels diretos ("Adicionar item", não "OK").
- **Modo escuro**: nunca hardcoded — usar tokens, que já têm os dois valores.

---

## 6. Do's and Don'ts

### Do

- Usar `--color-primary` só em CTA, link, foco e aba ativa.
- Fundo de página em `--color-canvas`; branco (`--color-surface`) só em cards,
  campos e barras fixas.
- Separar por whitespace; hairline quando precisar de borda.
- Aplicar tracking negativo dos tokens nos títulos (é o que dá o "set" do Notion).
- Declarar na spec os 4 estados da tela (carregando/vazio/erro/sucesso).
- Títulos em 600/700, corpo em 400.

### Don't

- Não pintar CTA, fundo ou estrutura com a paleta sticker.
- Não introduzir um segundo azul/ cor de marca estrutural.
- Não usar pill em campo de texto nem raio quadrado em CTA.
- Não usar sombra pesada — hairline + `--shadow-1`/`--shadow-2`.
- Não deixar corpo de texto em peso forte.
- Não hardcodar cor, px de espaço ou raio fora dos tokens.
- Não enterrar erro só em console: erro sempre visível na tela (campo ou toast).
- Não entregar tela sem estado vazio nem sem estado de carregamento.

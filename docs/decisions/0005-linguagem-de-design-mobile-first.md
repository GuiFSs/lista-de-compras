# ADR 0005 — Linguagem de design mobile-first inspirada no Notion

**Status:** Aceita
**Data:** 2026-10-07

## Contexto

A ADR 0004 definiu a *base* de estilos do front (`apps/web/src/styles/` com reset,
design tokens mobile-first e utilities em SCSS), mas não o *conteúdo* dessa base:
os tokens existentes eram um esqueleto genérico (4 cores de exemplo, escala de
espaçamento parcial) sem relação com nenhuma direção visual. Até aqui não existia
linguagem de design no projeto — nem documento, nem decisão registrada.

Com as features de produto entrando pelo ciclo SDD (spec → plano → implementação →
validação), era necessário definir antes, e num único lugar:

- que estilo visual o projeto segue;
- quais regras de UX mobile-first valem para toda a aplicação;
- onde os agentes consultam essas regras ao especificar e implementar telas.

O arquivo `DESIGN-notion.md` (na raiz) foi trazido como referência de inspiração:
um sistema calmo, "papel-quente", com um único azul estrutural e paleta decorativa
separada — adequado a uma aplicação de uso diário e familiar.

## Decisões

- **Referência de estilo**: `DESIGN-notion.md` inspira a linguagem de design.
  A adoção é **deliberadamente não rígida**: valem os princípios e a disciplina
  (um azul, canvas quente, hairline em vez de sombra pesada, Inter), não o pixel
  exato. As escalas do Notion são de marketing (display de 64px) e foram
  adaptadas para escala de aplicação.
- **Fonte de verdade do design**: `docs/design/GUIA-DESIGN.md`, que espelha os
  tokens existentes no CSS e é referenciado pelo `AGENTS.md` como leitura
  obrigatória antes de especificar ou implementar uma feature.
- **Tokens**: CSS custom properties globais em
  `apps/web/src/styles/_tokens.scss` — única origem de cor, tipografia,
  espaçamento, raio, sombra e breakpoints. Componentes nunca hardcodam valor.
- **Tema claro e escuro desde o início**: cada token de cor tem par light/dark.
  O tema segue o sistema (`prefers-color-scheme`) e pode ser forçado com
  `[data-theme]` no `:root`, preparando o terreno sem refatoração futura.
- **Tipografia**: Inter auto-hospedada com `@fontsource/inter` (pesos 400, 500,
  600, 700), e não CDN — a PWA precisa renderizar sem rede. Fallback para a
  system stack.
- **Cores semânticas mínimas**: além da paleta Notion, tokens
  `success`/`danger`/`warning` (com variações forte e suave) exclusivamente
  para feedback — validação, toasts, badges. A disciplina do Notion permanece:
  **só o azul é cor estrutural de ação**; a paleta *sticker* é decorativa.
- **Navegação mobile-first**: app bar no topo (superfície + hairline, sem azul)
  e bottom navigation fixa com abas **Lista / Histórico / Menor preço**; login
  fica fora da navegação. Respeita `safe-area-inset` e exige `padding-bottom`
  no conteúdo.
- **Integração com o SDD**: `TEMPLATE-spec.md` ganha seção "Design e UX" para
  que toda spec declare estados da tela e componentes usados.

## Consequências

- Features nascem consistentes: quem especifica e quem implementa consultam o
  mesmo guia e os mesmos tokens, reduzindo retrabalho visual entre telas.
- Custo de bundle: ~100 KB de fonte Inter auto-hospedada (com `font-display:
  swap`); aceito em troca de render consistente offline.
- Manutenção em dois lugares (guia e `_tokens.scss`): mitigado porque o guia
  espelha os tokens e ambos mudam na mesma rodada.
- A escala de espaçamento passa a significado Notion (`--space-sm` = 12px, antes
  8px). O único uso em código era `--space-md` no shell, sem quebra.
- O shell atual deixa o header azul e passa ao padrão app bar — mudança visual
  intencional e pequena.
- Escopo desta rodada é sistema e regras: componentes base (`libs/ui-web`),
  animações e telas de produto entram nas specs de feature, não aqui.

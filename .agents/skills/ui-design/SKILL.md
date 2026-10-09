---
name: ui-design
description: >-
  Composição visual Notion-calma do Lista de Compras — hierarquia, receitas por
  tipo de tela e anti-padrões. Use ao especificar, implementar ou validar qualquer
  tela ou componente visual (Angular), junto com docs/design/GUIA-DESIGN.md.
---

# Design de telas (composição)

Fonte de verdade: `docs/design/GUIA-DESIGN.md` (tokens + §4 Composição). Esta
skill traduz a composição em passos; não substitui o guia.

## Quando usar

- Tarefa `T-*` que cria ou altera tela, layout, formulário ou empty state.
- Spec com seção Design e UX / superfície de UI.
- Validação de feature com Superfície de UI = sim.

## Passos

1. Leia `docs/design/GUIA-DESIGN.md` (princípios, tokens e **§4 Composição**).
2. Classifique o tipo de tela: **auth/entrada**, **lista/conteúdo**, **empty
   state** ou **formulário de app**.
3. Aplique a receita do tipo (guia §4). Em auth: marca em `--font-size-display`
   + subtítulo + form com labels + um CTA `primary`. Exemplo canônico:
   `apps/web/src/app/features/login/`.
4. Agrupe por whitespace: ritmo maior entre blocos (`--space-lg`/`--space-xl`),
   menor dentro do bloco (`--space-md`/`--space-sm`).
5. Confirme os 4 estados (carregando / vazio / erro / sucesso), um `primary` por
   tela, alvos ≥44px e só tokens (sem cor/espaço/raio hardcoded).
6. Antes de encerrar a T, rode o checklist abaixo. No **handoff**, 2–3 linhas
   sobre escolhas de composição — não narrativa no SCSS.

## Checklist (reprova se falhar)

- [ ] Tipo de tela identificado e receita do guia aplicada.
- [ ] Hierarquia tipográfica no primeiro viewport (marca/título adequado).
- [ ] Agrupamento visual por whitespace (não form/conteúdo no void).
- [ ] Auth/entrada sem marca display = **reprovado**.
- [ ] Quatro estados cobertos; um CTA primary; tokens only.

## Anti-padrões

- Form sozinho no viewport sem marca/título.
- Placeholder no lugar de hierarquia.
- Gap uniforme sem grupos.
- “Passou tokens/a11y” sem composição pensada.

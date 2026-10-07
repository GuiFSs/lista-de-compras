---
name: code-review
description: Revisão de PR por lentes especializadas — como obter o diff, taxonomia de severidade, formato do parecer por lente e regras de consolidação do code-reviewer.
---

# Revisão de PR (code-review)

Use esta skill ao revisar um PR criado por outro agente (geralmente o `sdd-orchestrator`, após push aprovado). A revisão é **consultiva**: ela informa a decisão do usuário, mas nunca edita código, nunca roda git mutante e nunca faz merge sozinha.

## Entrada

- Número do PR (ex.: `gh pr view 12`) **ou** branch (`feature/<nome>`).

## Coleta do contexto (pelo `code-reviewer`)

0. Verifique se o `gh` está disponível (`gh --version`). Se não estiver, use diretamente o caminho git abaixo.
1. Metadados e corpo do PR: `gh pr view <n> --json title,body,author,files`
   (fallback: `git fetch origin` + `git log origin/master..origin/<branch> --oneline`).
2. Diff completo: `gh pr diff <n>` (fallback: `git diff master...origin/<branch>`).
3. Refs do corpo do PR (template `.github/pull_request_template.md`): `docs/features/<feature>/SPEC.md`, `PLAN.md` e, quando aplicável, `docs/product/initial-scope.md` e ADRs em `docs/decisions/`.

## Taxonomia de severidade

- 🔴 **Blocker** — segurança, comportamento fora da spec, contrato quebrado; não deve mergear.
- 🟠 **Major** — deveria corrigir antes do merge, mas pode haver justificativa aceitável.
- 🟡 **Minor** — melhoria clara, não impede o merge.
- 🔵 **Nit/Questão** — sugestão de estilo ou pergunta, sem exigência.

## Formato do parecer (por lente)

Para cada achado:
- `arquivo:linha` (ou trecho, quando o diff não trouber linha)
- severidade
- evidência (o que o código faz e por que é problema)
- sugestão concreta (como corrigir)

Ao final da lente: resumo de 1–3 linhas e, se aplicável, o que ficou sem verificação.

## Consolidação (pelo `code-reviewer`)

- Deduplique achados iguais de lentes diferentes (cite todas as lentes que o viram).
- Ordene por severidade.
- Veredito: `APPROVE` (sem 🔴; 🟠 com justificativa aceitável), `REQUEST CHANGES` (🔴 presentes, ou 🟠 sem justificativa) ou `COMMENT` (só 🟡/🔵).
- Apresente tudo ao usuário; a decisão de merge é sempre dele.

## Regras

- Revisores são **read-only**: nunca edite arquivos, nunca rode git mutante, nunca faça merge.
- Todo achado precisa de evidência no diff; não invente problemas (a revisão também não pode alucinar).
- Se o PR não tiver spec (Refs vazio), a lente de requisitos revisa contra `docs/product/initial-scope.md` e sinaliza a ausência de spec como achado.

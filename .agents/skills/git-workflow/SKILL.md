---
name: git-workflow
description: Commit, branch and push rules for Lista de Compras — one Conventional Commit per SDD gate, branch per feature, push and PR only with explicit user approval.
---

# Fluxo de git

Use esta skill sempre que um gate do SDD for aprovado ou quando o usuário pedir para subir código.

## Decisões (2026-10-06)

- Um **commit por gate** cumprido do SDD (não por tarefa, nem um só commit por feature).
- **Branch por feature**: `feature/<nome-da-feature>`, criada quando o plano é aprovado.
- **Push somente com aprovação explícita do usuário**; nunca automático.
- **PR opcional após push**: também só com aprovação explícita; corpo gerado a partir dos commits e das mudanças de dependências.

## Passos

1. Confirme qual gate foi aprovado (spec, plano, implementação+testes, validação).
2. Se o plano acabou de ser aprovado e a branch não existe, crie `feature/<nome-da-feature>` a partir de `master`.
3. Verifique `git status` e **nunca inclua** credenciais, segredos, tokens ou senhas (regra do AGENTS.md).
4. Faça o commit em Conventional Commits com escopo de serviço/área:
   - Gates de spec, plano e validação: `docs(<escopo>): ...`
   - Gate de implementação: `feat(<escopo>): ...` (ou `fix`/`refactor` quando couber)
   - Escopos típicos: `auth`, `list`, `history`, `gateway`, `infra`, `docs`
   - O corpo do commit referencia `docs/features/<feature>/` e os critérios de aceite atendidos.
5. Somente o `sdd-orchestrator` executa git; subagents não commitam.
6. Após o gate de validação, incorpore a feature ao `master` com merge `--no-ff` e mensagem referenciando a feature.
7. Para push: apresente ao usuário o resumo (branch, commits, destino) e aguarde aprovação explícita.
8. **PR (opcional)**: após o push, pergunte ao usuário se quer abrir PR também. Se sim:
   - Colete do branch: `git log master..HEAD --oneline`, arquivos mudados (`git diff master...HEAD --stat`) e alterações de dependências (`git diff master...HEAD -- '**/package.json' '**/package-lock.json'`).
   - Monte título e corpo no template `.github/pull_request_template.md` (bullets curtos: Feito, Mudanças, Dependências, Testes/Validação, Refs).
   - Abra com `gh pr create --base master --head feature/<nome> --title "..." --body "..."`. Se o `gh` não estiver disponível, gere a URL de compare pré-preenchida (`https://github.com/<owner>/<repo>/compare/master...<branch>?title=...&body=...`) e ofereça abri-la no navegador.
   - O PR também exige aprovação explícita do usuário antes de ser criado.

## Observações

- Trabalho que não é feature (setup, docs de processo) vai direto ao `master`.
- Sem aprovação de push, o trabalho permanece local na branch da feature.

---
name: git-workflow
description: Commit, branch, push, PR and merge rules for Lista de Compras — traceable task commits, PR-first integration and explicit approval for every remote or integration action.
---

# Fluxo de git

Use esta skill para qualquer operação git de uma feature.

## Princípios

- **Branch por feature**: `feature/<nome-da-feature>`, criada quando o plano é aprovado.
- Commits pequenos por tarefa ou mudança coerente; o corpo referencia `T-*`,
  `AC-*` e `docs/features/<feature>/`.
- Gates são comprovados por `STATUS.md`, checklists e evidências, não pela
  quantidade de commits.
- Somente o `sdd-orchestrator` executa git mutante.
- Push, criação de PR e merge exigem aprovações explícitas e separadas.
- PR é o caminho principal de integração quando existe remoto.

## Passos

1. Confirme `STATUS.md`, tarefa/gate e branch atual.
2. Crie `feature/<nome>` a partir de `master` depois da aprovação do plano.
3. Antes de cada commit, inspecione status/diff e exclua segredos, credenciais,
   tokens, senhas e mudanças fora da tarefa.
4. Use Conventional Commits com escopo (`docs(auth)`, `feat(list)`,
   `test(history)`, `fix(gateway)`); referencie `T-*` e `AC-*` no corpo.
5. Para push, apresente branch, commits e destino; aguarde aprovação.
6. Depois do push, ofereça criar PR. Com nova aprovação:
   - Colete do branch: `git log master..HEAD --oneline`, arquivos mudados (`git diff master...HEAD --stat`) e alterações de dependências (`git diff master...HEAD -- '**/package.json' '**/package-lock.json'`).
   - Monte título e corpo no template `.github/pull_request_template.md` (bullets curtos: Feito, Mudanças, Dependências, Testes/Validação, Refs).
   - Abra com `gh pr create --base master --head feature/<nome> --title "..." --body "..."`. Se o `gh` não estiver disponível, gere a URL de compare pré-preenchida (`https://github.com/<owner>/<repo>/compare/master...<branch>?title=...&body=...`) e ofereça abri-la no navegador.
7. Ofereça a revisão consultiva adaptativa do `code-reviewer`.
8. Faça merge somente após `VALIDATION.md` aprovada, checks/revisão tratados e
   nova aprovação explícita do usuário.

## Fallback sem remoto

Se o repositório não tiver remoto, após validação aprovada e autorização do
usuário faça merge local `--no-ff`. Não faça merge local antes de abrir um PR:
isso elimina o diff da branch e torna o fluxo ambíguo.

Trabalho que não é feature (setup e documentação de processo) pode ir direto ao
`master` em commits coerentes. Sem aprovação de push, tudo permanece local.

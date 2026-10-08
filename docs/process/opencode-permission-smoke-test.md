# Smoke test de permissões do OpenCode

Execute este roteiro no mesmo ambiente e versão do OpenCode usados no projeto
sempre que `opencode.json` ou `.opencode/agents/` mudar.

## Pré-condições

1. Registre `opencode --version`.
2. Inicie o OpenCode na raiz do repositório.
3. Garanta que o working tree esteja limpo ou use uma cópia descartável.

## Casos

### Orquestrador

- Deve listar apenas os subagentes SDD permitidos.
- Leitura de status/diff deve ser permitida.
- Edição direta deve ser negada.
- `git commit`, `git push`, `git merge` e `gh pr create` devem pedir aprovação.

### Product spec e planner

- Edição em `docs/features/**` deve ser permitida.
- Edição de código em `apps/**` deve ser negada.
- Execução de shell e delegação devem ser negadas.

### Devs e test engineer

- Edição da tarefa deve ser permitida.
- Comandos de build/test podem pedir aprovação.
- Commit, push, merge e criação de PR devem ser negados.

### Validator e reviewers

- Reviewers não podem editar nenhum arquivo.
- Validator só pode escrever `VALIDATION.md` e `STATUS.md` da feature.
- Comandos de inspeção/teste podem pedir aprovação.
- Git mutante deve ser negado.

## Registro esperado

```text
OpenCode: <versão>
Data: <AAAA-MM-DD>
Agente | ação permitida | resultado | ação proibida | resultado
...
Resultado geral: aprovado | reprovado
```

Não declare o enforcement validado sem executar este roteiro. Neste repositório,
a sintaxe foi alinhada à documentação oficial, mas o teste de runtime depende do
binário instalado no ambiente do OpenCode.

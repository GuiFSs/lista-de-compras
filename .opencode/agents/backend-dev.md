---
description: Implementa ou revisa serviços Node.js/TypeScript preservando a arquitetura hexagonal
mode: subagent
color: "#16a34a"
permission:
  edit: allow
  bash:
    "*": ask
    "git commit *": deny
    "git push *": deny
    "git merge *": deny
    "gh pr create *": deny
  task: deny
---

Use as skills `feature-delivery` e, quando a alteração cruzar serviços, `microservice-architecture` (`.agents/skills/`).

Regras:
- Execute somente a tarefa `T-*` delegada e edite apenas seus arquivos
  permitidos no `PLAN.md`.
- Domínio não conhece NestJS, Fastify, PostgreSQL ou RabbitMQ.
- Não ler nem escrever o banco de outro serviço.
- Antes de codificar, confirme os contratos HTTP/eventos que a feature altera e documente contratos novos.
- Registre migrações pertencentes ao serviço e contratos atualizados.
- Escreva os testes próximos da mudança, atualize `STATUS.md` e encerre com o
  handoff de `docs/process/sdd-workflow.md`.

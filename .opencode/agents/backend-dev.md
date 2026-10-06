---
description: Implementa ou revisa serviços Node.js/TypeScript preservando a arquitetura hexagonal
mode: subagent
color: "#16a34a"
permissions:
  - action: edit
    resource: "*"
    effect: allow
---

Use as skills `feature-delivery` e, quando a alteração cruzar serviços, `microservice-architecture` (`.agents/skills/`).

Regras:
- Domínio não conhece NestJS, Fastify, PostgreSQL ou RabbitMQ.
- Não ler nem escrever o banco de outro serviço.
- Antes de codificar, confirme os contratos HTTP/eventos que a feature altera e documente contratos novos.
- Registre migrações pertencentes ao serviço e contratos atualizados.

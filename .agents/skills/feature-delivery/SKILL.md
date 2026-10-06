---
name: feature-delivery
description: Implement one specified Lista de Compras feature while preserving its hexagonal and microservice boundaries.
---

# Entrega de feature

Use esta skill para implementar uma feature que já possua especificação e critérios de aceite.

1. Leia a especificação em `docs/features/`, o escopo inicial, ADRs relevantes e os limites do serviço afetado.
2. Antes de codificar, confirme os contratos HTTP e de eventos que a feature altera. Documente contratos novos ou modificados.
3. Mantenha regras de negócio em domínio e casos de uso. Framework HTTP, PostgreSQL, RabbitMQ e clientes externos são adapters.
4. Escreva ou atualize testes proporcionais ao risco da regra e execute a validação relevante.
5. Atualize a documentação da feature se a implementação revelar uma ambiguidade resolvida pelo usuário.

Pare e peça decisão se faltar uma regra que altere a experiência, o contrato público ou os limites entre serviços.

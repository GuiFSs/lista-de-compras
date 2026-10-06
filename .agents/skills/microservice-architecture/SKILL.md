---
name: microservice-architecture
description: Design or review service boundaries, HTTP contracts, events, and data ownership for Lista de Compras microservices.
---

# Arquitetura de microserviços

Use esta skill para propor ou revisar mudanças que cruzam serviços.

1. Leia as ADRs e a feature relacionada antes de desenhar a integração.
2. Defina explicitamente o dono de cada dado e proíba acesso direto ao banco de outro serviço.
3. Escolha HTTP para consultas ou comandos que precisam de resposta imediata; escolha evento RabbitMQ para propagação assíncrona de fatos de domínio.
4. Para cada evento, documente nome, produtor, consumidores, payload, versão, garantias de entrega e estratégia de idempotência.
5. Registre trade-offs e decisões duráveis em uma ADR.

Não introduza um novo serviço, broker, banco ou padrão distribuído sem necessidade da feature e confirmação do usuário quando houver alternativas materiais.

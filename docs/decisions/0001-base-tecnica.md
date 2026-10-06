# ADR 0001 — Base técnica e limites iniciais

**Status:** Aceita  
**Data:** 2026-10-06

## Contexto

O projeto é uma aplicação real de lista de compras e, simultaneamente, um ambiente de aprendizado de Angular, backend, arquitetura hexagonal, microserviços e mensageria.

## Decisões

- O código ficará em um monorepo gerenciado por Nx.
- A interface será uma PWA Angular.
- Os serviços backend usarão Node.js e TypeScript.
- Cada serviço HTTP usará NestJS com o adaptador Fastify.
- A borda de acesso da PWA será um API Gateway.
- A comunicação assíncrona inicial usará RabbitMQ.
- Cada microserviço possuirá e acessará exclusivamente seu próprio banco PostgreSQL.
- No desenvolvimento local, os bancos ficarão em uma única instância PostgreSQL no Docker, mas serão bancos lógicos separados e terão credenciais próprias.
- Todo o ambiente inicial será executado localmente com Docker e Docker Compose.
- O primeiro conjunto de serviços será: autenticação, lista de compras e histórico de preços.

## Consequências

- O gateway será a única API chamada pela PWA; ele encaminhará as requisições aos serviços internos.
- A atualização do histórico após a conclusão de uma compra ocorrerá por evento, e não por leitura direta do banco da lista.
- A infraestrutura e a operação local terão mais componentes do que um monólito, deliberadamente, para exercitar conceitos reais de microserviços.
- As regras de negócio devem permanecer independentes de NestJS, Fastify, PostgreSQL e RabbitMQ; essas tecnologias serão adaptadores da arquitetura hexagonal.

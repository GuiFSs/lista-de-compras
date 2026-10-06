# Guia de colaboração do projeto

Este repositório é, ao mesmo tempo, um produto utilizável e um ambiente de aprendizado de Angular, microserviços, arquitetura hexagonal, mensageria e IA no desenvolvimento.

## Fonte de verdade

Leia antes de alterar ou especificar uma feature:

- `docs/product/initial-scope.md`
- ADRs em `docs/decisions/`
- A skill aplicável em `.agents/skills/`

Não presuma regras de produto, integrações, dados ou experiência de uso ainda não documentados. Durante a implementação de uma feature, faça perguntas apenas quando a resposta mudar o comportamento, o contrato ou a arquitetura.

## Regras de evolução

- Registre decisões arquiteturais relevantes como ADR em `docs/decisions/` antes ou junto da mudança correspondente.
- Escreva uma especificação e critérios de aceite da feature antes de implementá-la.
- Preserve a arquitetura hexagonal: domínio e casos de uso não dependem de framework, banco, broker ou HTTP.
- Cada serviço é dono exclusivo de seus dados; integração entre serviços ocorre por contratos HTTP ou eventos documentados.
- Nunca versionar credenciais, segredos, tokens nem senhas em texto puro.
- Explique decisões e mudanças de modo didático, conectando-as aos objetivos de aprendizado do projeto.

## Papéis de agentes

Use os briefings em `.agents/roles/` ao delegar trabalho. Cada agente deve ficar no seu escopo, registrar as decisões que tomar e não implementar requisitos ainda em aberto.

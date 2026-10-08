# Revisão arquitetural — <nome da feature>

**Plano:** `docs/features/<feature>/PLAN.md`  
**Revisor:** architecture-review  
**Data:** AAAA-MM-DD  
**Resultado:** Aprovada | Aprovada com ressalvas | Reprovada

## Limites de serviço

- <serviço, responsabilidade e motivo>

## Propriedade dos dados

- <dado → serviço dono; confirmar ausência de acesso direto a banco alheio>

## Contratos de integração

- HTTP: <contrato e arquivo; ou "nenhum">
- Eventos: <nome, versão, produtor, consumidores, payload, entrega e idempotência; ou "nenhum">

## Riscos operacionais

- <falha, retry, timeout, observabilidade ou "nenhum risco novo">

## Decisões e ADRs

- <ADR criada/necessária ou "nenhuma">

## Pendências bloqueantes

- <pendência ou "nenhuma">

## Gate

- [ ] Ownership de dados está explícito.
- [ ] Integrações não acessam banco de outro serviço.
- [ ] Contratos estão documentados e versionáveis.
- [ ] Falhas e idempotência foram consideradas quando aplicável.
- [ ] Não há pendência bloqueante.

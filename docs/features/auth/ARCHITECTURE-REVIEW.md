# Revisão arquitetural — Autenticação

**Plano:** `docs/features/auth/PLAN.md`
**Revisor:** architecture-review
**Data:** 2026-10-07
**Resultado:** Aprovada com ressalvas

## Limites de serviço

- `auth-service` é responsável por credenciais, login, rate limit e emissão.
- `web` consome temporariamente o login por HTTP direto, conforme ADR 0006.
- `shopping-list-service` valida o JWT na borda, sem consultar o auth-service.

## Propriedade dos dados

- Tabela `users` e chave privada RS256 pertencem exclusivamente ao auth-service.
- Outros serviços recebem apenas o Bearer JWT e a chave pública de validação.
- Não há leitura ou escrita direta no banco `auth` por outro serviço.

## Contratos de integração

- HTTP: `POST /api/auth/login`, tipado em
  `libs/contracts/src/http/auth.ts` e documentado em `libs/contracts/README.md`.
- Erros: envelope `{ statusCode, message, error? }`, incluindo 429 com
  `Retry-After`.
- Eventos: nenhum.

## Riscos operacionais

- `localStorage` amplia impacto de XSS; aceito na v1 pela ADR 0006.
- Rate limit em memória reinicia com o processo e não escala horizontalmente.
- CORS e URL direta existem apenas até a feature de gateway.
- Rotação do par RS256 invalida tokens ainda ativos; novo login recupera a sessão.

## Decisões e ADRs

- ADR 0006: exceção temporária ao gateway, sessão e rate limit da v1.
- ADR 0007: JWT RS256 validado localmente por serviço.

## Pendências bloqueantes

- Nenhuma. As ressalvas originais foram incorporadas ao plano e às ADRs.

## Gate

- [x] Ownership de dados está explícito.
- [x] Integrações não acessam banco de outro serviço.
- [x] Contratos estão documentados e versionáveis.
- [x] Falhas e idempotência foram consideradas quando aplicável.
- [x] Não há pendência bloqueante.

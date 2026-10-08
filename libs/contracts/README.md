# contracts

Lib de **contratos de integração** do monorepo: tipos de transporte HTTP e de
eventos, fonte única compartilhada entre microserviços e PWA. Os tipos são
apenas de borda (DTOs) — não contêm regra de negócio nem dependem de
framework, banco ou broker.

## Building

Run `nx build contracts` to build the library.

## Contratos HTTP — auth-service: `POST /api/auth/login`

Endpoint **público** (não exige token) do auth-service, porta
`AUTH_API_PORT=3001`, chamado diretamente pela PWA (exceção temporária à ADR
0001, registrada na ADR 0006). Tipos em `src/http/auth.ts`, re-exportados por
`@lista/contracts`.

### Request (JSON)

```json
{ "username": "string", "password": "string" }
```

Campos obrigatórios (RN1): página não-string, ausente ou vazia → **400**.

### 200 OK — `LoginSuccessResponse`

```json
{
  "accessToken": "<JWT RS256>",
  "tokenType": "Bearer",
  "expiresIn": 86400
}
```

- `accessToken`: JWT assinado em **RS256** com claims `JwtClaims`
  (`sub` uuid · `iss` (`AUTH_JWT_ISSUER`, default `auth-service`) · `iat` ·
  `exp` = `iat + 86400`), válido por **24h** (RN11/AC-13).
- `tokenType`: sempre `"Bearer"` — a PWA envia o token no header
  `Authorization: Bearer <jwt>`.
- `expiresIn`: validade em segundos (**86400**), correspondente ao `exp` do
  JWT.

### Erros — envelope canônico único `ApiErrorResponse` (400/401/429/500)

Todos os erros usam **um único shape**:

```json
{ "statusCode": 400, "message": "string", "error": "string (opcional)" }
```

- `statusCode` e `message` são **garantidos**; `error` é **opcional** (nome
  curto do tipo de erro) e **nunca é dependido pelos clientes** — a PWA
  consome apenas `statusCode` e `message` (decisão 🟠-1).
- `message` é sempre genérica, em PT.
- Nenhum corpo contém a senha (AC-10); o corpo do **500 nunca expõe detalhes
  internos** — detalhes vão apenas para o log do servidor.

| Status | Significado | `message` (PT, genérica) |
| --- | --- | --- |
| 400 | Payload inválido (campos ausentes, não-string ou vazios) | `Nome de usuário e senha são obrigatórios` |
| 401 | Credenciais inválidas (genérico; não distingue usuário inexistente de senha errada) | `Credenciais inválidas` |
| 429 | Limite de tentativas com falha atingido na janela (RN13/AC-14) + header `Retry-After: <segundos>` | `Muitas tentativas de login. Aguarde e tente novamente.` |
| 500 | Erro interno não previsto (ex.: banco indisponível) | `Erro interno` |

> 429 vale **antes** da validação de credenciais: mesmo com credenciais
> corretas, o login é bloqueado até a janela expirar (AC-14).

## Contratos de eventos

**Nenhum** na v1: login é comando com resposta imediata (HTTP) e não publica
fato de domínio via RabbitMQ (`src/events/` mantido para uso futuro).
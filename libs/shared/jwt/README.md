# shared/jwt

Verificação **local** de JWT na borda HTTP dos microserviços (RN12/AC-15,
ADR 0007) — framework-free, construída sobre [`jose`](https://github.com/panva/jose)
(sem builds nativos).

Cada serviço valida com a própria cópia da **chave pública** RS256
(`AUTH_JWT_PUBLIC_KEY_B64` do `.env`, base64 single-line) e com o `iss`
esperado (`AUTH_JWT_ISSUER`). Fundamento da ADR 0007: o auth-service é o único
que possui a chave privada; distribuir a pública não dá a ninguém o poder de
assinar tokens.

## API

| Export | Descrição |
| --- | --- |
| `extractBearerToken(header)` | Extrai o JWT de `Authorization: Bearer <jwt>`; `null` se ausente/malformado (`Basic`, vazio, com espaços...). Esquema case-insensitive (RFC 7235 §5.1). |
| `verifyJwt({ token, publicKey, issuer?, clockTolerance? })` | Verifica localmente: **alg pinado `RS256`**, assinatura contra a chave pública (PEM ou base64 do PEM), `iss` igual ao esperado (default `auth-service`), `exp` não vencida (tolerância de relógio **0** na v1). Rejeita (throw) em qualquer falha — sem distinguir motivo; o guard da borda mapeia para o 401 uniforme. |
| `decodeBase64Pem(value)` | Decodifica o base64 single-line do `.env` (ADR 0007) de volta ao PEM. |

## Regras de validação (ADR 0007)

1. Algoritmo **pinado** `RS256` — tokens `none`, `HS256` etc. são rejeitados
   (sem confusão de algoritmo).
2. Assinatura válida contra a chave pública — inválida ⇒ rejeita.
3. `iss` === `AUTH_JWT_ISSUER` (default `auth-service`).
4. `exp` não vencida, tolerância de relógio 0.
5. Token ausente/malformado é rejeitado (`verifyJwt` com string vazia ou
   inválida) — a extração do header é responsabilidade do chamador
   (`extractBearerToken`).

Esta lib **não decide HTTP**: quem chama (ex.: o guard Nest de cada serviço)
é responsável pelos 401 uniformes. Evolução futura para JWKS registrada na
ADR 0007 — a interface de validação permanece a mesma.
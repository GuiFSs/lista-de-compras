# ADR 0007 — Validação local de JWT na borda de cada serviço

**Status:** Aceita
**Data:** 2026-10-07

## Contexto

A feature Autenticação cria o microserviço de autenticação (`auth-service`),
que emite JWT no login (RN5/RN11), e define que **cada microserviço valida, na
própria borda HTTP e localmente, a assinatura e a expiração** do token recebido
no header `Authorization: Bearer` (RN12, decisão DE4 fechada na spec). Não há
gateway na v1 (ADR 0001 prevê gateway, ainda pendente; a PWA chama o
auth-service diretamente por exceção temporária — ADR 0006), e a validação não
pode depender de chamada central ao auth-service: o serviço de autenticação
emite o token, mas não é um oráculo de validação para as demais chamadas.

Precisávamos fixar o "padrão-ouro JWT": algoritmo e biblioteca, claims mínimas,
como a chave pública chega a cada serviço e qual a resposta uniforme quando o
token não passa. Esta ADR registra essas escolhas (nível técnico que ficou para
o `PLAN.md` da feature); a spec não criava esta ADR.

## Decisões

- **Validação local em cada serviço, sem gateway e sem chamada central (RN12)**:
  cada microserviço valida na própria borda HTTP a assinatura e a expiração do
  token do header `Authorization: Bearer`. Não existe endpoint de validação no
  auth-service nem chamada por serviço ao emissor (o auth-service não é ponto
  único de validação). O padrão permanece válido quando o gateway futuro
  existir: a validação continua local em cada serviço, o gateway apenas roteia.
  Compartilhamento de **código** (a lib `libs/shared/jwt`) não viola a regra de
  ownership de dados: cada serviço valida com a própria cópia da chave pública
  e nenhum serviço lê o banco `auth`.
- **Algoritmo RS256 com a biblioteca `jose`**. A chave de assinatura (privada)
  fica **somente no auth-service**; os demais serviços validam apenas com a
  **chave pública** — a chave de assinatura é tratada como dado do serviço de
  auth. **Por que RS256 e não HS256**: no HS256 a mesma chave secreta assina e
  valida, então distribuí-la a todos os serviços daria a cada um o poder de
  **forjar tokens** válidos para toda a aplicação (e quem valida também poderia
  emitir). Com RS256, distribuir a pública não concede poder de emissão a
  ninguém além do auth-service. `jose`: sem builds nativos (lição do
  Windows/OneDrive), algoritmos explícitos e pinados — evita ataques de
  confusão de algoritmo (ex.: forçar `none` ou HS256 com a pública).
- **Header do token**: `{ "alg": "RS256", "typ": "JWT" }`.
- **Claims mínimas**: `sub` (id do usuário, uuid) · `iss` (env
  `AUTH_JWT_ISSUER`, default `auth-service`) · `iat` (emissão) · `exp`
  (`iat + 86400`, 24h — RN11). **Sem `aud` na v1**: há um único público (os
  serviços internos da aplicação), então restringir audiência não adiciona
  proteção; o claim entra quando houver públicos distintos (ex.: PWA e
  serviços com escopos diferentes).
- **Validação (lib `libs/shared/jwt`, framework-free)**: algoritmo **pinado**
  `RS256`, assinatura válida contra a pública, `iss` == `AUTH_JWT_ISSUER`,
  `exp` não vencida (tolerância de relógio 0 na v1 — relógios locais em
  sincronia no ambiente de desenvolvimento). Falha em qualquer ponto →
  **401 uniforme** `{ statusCode: 401, message: "Não autorizado" }`, **sem
  distinguir o motivo** (ausente, inválido, expirado, assinatura ou `iss`
  errado): distinguir vazaria detalhes de implementação e de configuração
  interna, e a PWA só precisa saber que não está autorizada.
- **Distribuição da chave pública**: cada serviço lê
  `AUTH_JWT_PUBLIC_KEY_B64` do `.env` local (gitignored, padrão ADR 0004); o par
  RS256 é gerado por `npm run auth:keys` em **base64 single-line** (evita PEM
  multilinha no `.env`). `AUTH_JWT_PRIVATE_KEY_B64` existe apenas no
  auth-service; a pública não é segredo, mas também não vai para arquivos
  versionados para manter `.env.example` só com placeholders. A privada nunca
  sai do `.env` local.
- **Evolução futura para JWKS**: quando houver gateway/distribuição de chaves
  (vários ambientes, rotação automática), a lib passa a buscar a chave pública
  em um endpoint JWKS (`/.well-known/jwks.json`) servido pelo auth-service;
  a interface de validação permanece a mesma, então a troca é localizada. A
  rotação de chaves na v1 é manual: regenerar o par (`npm run auth:keys`) e
  atualizar os `.env` locais.

## Consequências

- **A v1 funciona sem gateway** (AC15 verificável por requisição direta a cada
  serviço) e **continua válida quando o gateway existir**: nenhum serviço
  depende de chamada central para decidir autorização.
- **Cada serviço novo precisa da chave pública no `.env` local** (`AUTH_JWT_PUBLIC_KEY_B64`) e do `AUTH_JWT_ISSUER` coerente — passo documentado no README e no `.env.example`.
- **Sem revogação imediata na v1**: a validação é stateless; um token só deixa
  de valer por expiração (≤ 24h). Se o par de chaves for perdido ou trocado,
  os tokens em circulação ficam inválidos até o `exp` e a pessoa faz login de
  novo — a conta semeada não é afetada (o seed é independente das chaves).
- **401 uniforme** simplifica a PWA (trata qualquer 401 como "voltar ao
  login"), mas dificulta diagnósticos de configuração (ex.: `iss` divergente
  entre serviços); o motivo fica apenas em log no servidor, nunca na resposta.
- **`jose` e RS256** exigem o passo `npm run auth:keys` no setup local
  (geração do par) — aceito em troca de nenhum serviço além do auth poder
  assinar tokens.
# ADR 0006 — Exceção temporária ao API Gateway e políticas da v1 de autenticação

**Status:** Aceita
**Data:** 2026-10-07

## Contexto

A ADR 0001 define que a borda de acesso da PWA será um API Gateway — "o gateway
será a única API chamada pela PWA; ele encaminhará as requisições aos serviços
internos". Porém o gateway ainda não existe: ele depende da feature **"API
Gateway"** do backlog, e a feature Autenticação (spec aprovada em
`docs/features/auth/SPEC.md`) precisa entregar login real nesta rodada, com a PWA
obtendo um JWT (AC1/AC2).

A spec fechou, então, uma decisão de produto: a PWA chama o microserviço de
autenticação **diretamente**, como exceção temporária à ADR 0001, até o gateway
existir. Esta ADR registra essa exceção com escopo explícito, a política de
sessão v1 associada (RN11), os critérios de aceite e o dono da migração futura
para o gateway, e as convenções que esta rodada estabelece: prefixo `<SERVICO>_*`
nas variáveis de ambiente e rate limit em memória na v1 (RN13).

## Decisões

### 1. Exceção temporária à ADR 0001 — PWA chama o auth-service diretamente

- A PWA chama o auth-service **diretamente** em `http://localhost:3001` (porta
  `AUTH_API_PORT=3001`), na operação `POST /api/auth/login`. Isso é **exceção
  temporária** à ADR 0001, que permanece vigente como regra geral: o gateway
  continua sendo a única API chamada pela PWA para os demais serviços e no
  futuro.
- **Escopo da exceção:** somente a operação de login (e os endpoints futuros do
  auth-service), e somente **enquanto o gateway não existir**. Qualquer outra
  chamada direta da PWA a um microserviço exige nova decisão registrada.
- Para viabilizar essa chamada direta local, o auth-service expõe CORS com a
  origem da PWA (`http://localhost:4200`, default `AUTH_CORS_ORIGINS`) e métodos
  `POST`/`OPTIONS`.

### 2. Política de sessão v1 (RN11) — JWT 24h, localStorage, sem refresh, logout manual

- JWT com validade de **24 horas** (`exp = iat + 86400`), armazenado no
  **`localStorage`** da PWA.
- **Sem refresh token na v1**; sessão expirada → a PWA volta à tela de login
  (redirect). O encerramento da sessão é feito por **logout manual**.
- **Por que não cookie httpOnly nesta fase (didático):** token no `localStorage`
  é acessível a scripts (vetor XSS), enquanto cookie `httpOnly` fica fora do
  alcance do JavaScript. A escolha pelo `localStorage` na v1 é deliberada e
  registrada por três motivos:
  - sem cookie httpOnly não há o risco de CSRF associado a cookies (tokens
    enviados automaticamente exigiriam `SameSite`/token CSRF); o JWT no header
    `Authorization` não sofre esse vetor;
  - explicitar o trade-off XSS × `localStorage` é objetivo didático do projeto:
    documenta-se a mitigação em vez de esconder o problema;
  - mitigação v1: TTL curto (24h), sem refresh token, logout manual e
    expiração → login limitam a janela de uso de um token vazado.
  - O cookie httpOnly (com proteção CSRF) permanece como evolução possível para
    versões futuras, não como pendência desta rodada.

### 3. Migração para o gateway — gatilho por feature, não por data

- A migração da chamada direta para o gateway é disparada pela **feature "API
  Gateway" do backlog**, não por data/calendário.
- **Critérios de aceite da migração:**
  1. a PWA passa a chamar o login por **URL relativa** (same-origin, via gateway,
     que roteia `/api/auth/*`);
  2. o **CORS do auth-service é removido** (não há mais origem cruzada);
  3. a base `http://localhost:3001` é **deprecada**: `AUTH_API_BASE_URL` sai da
     configuração da PWA.
- **Dono do follow-up:** a feature "API Gateway" no backlog. Esta ADR é o
  registro do compromisso; não há responsável por data nesta rodada.

### 4. Convenção de prefixo por serviço nas variáveis de ambiente

- Serviços novos usam variáveis prefixadas por serviço: `<SERVICO>_*` (ex.:
  `AUTH_API_PORT`, `AUTH_DATABASE_URL`, `AUTH_JWT_ISSUER`).
- `API_*` e `DATABASE_URL` (primeira geração, ADR 0004) são **herança do primeiro
  serviço** (shopping-list-service): não viram padrão nem se replicam em serviços
  novos.
- Motivo (lição 5 do monorepo): o Nx injeta o `.env` da raiz em todos os targets
  e o dev server do Angular trata `PORT` como a própria porta; nomes genéricos
  colidem entre serviços. O prefixo por serviço elimina a colisão e torna
  explícito o dono de cada variável.

### 5. Rate limit na v1

- O rate limit do login é **em memória** (5 falhas / 60s por IP, janela fixa a
  partir da 1ª falha), **sem dependência nova** (sem Redis, sem broker, sem
  serviço extra — RN13).
- **Por quê em memória:** a v1 roda em **instância única local**; não há
  distribuição horizontal nem múltiplas réplicas para sincronizar. Adicionar um
  armazenamento distribuído para uma única instância seria dependência nova sem
  benefício — RN13 pede explicitamente "sem dependência nova".
- **Limitações aceitas:** o contador zera no restart do serviço e não escala para
  múltiplas instâncias.
- **Caminho de upgrade:** quando houver distribuição (múltiplas instâncias) ou
  quando o gateway integrar a borda, o contador migra para **armazenamento
  distribuído (ex.: Redis)** ou passa a ser responsabilidade do gateway; a
  política já nasce **isolada atrás da port `LoginRateLimiter`** do domínio — a
  troca substitui apenas o adaptador em memória, sem tocar no caso de uso.

## Consequências

- A regra "o gateway é a única API chamada pela PWA" (ADR 0001) passa a ter
  exceção nominal e limitada ao auth-service, com escopo e critérios de saída
  explícitos nesta ADR.
- A PWA depende, na v1, de uma base URL local (`http://localhost:3001`) e do CORS
  do auth-service; ambos são eliminados na migração para o gateway (critérios de
  aceite na seção 3).
- O token no `localStorage` fica sujeito a XSS; a mitigação v1 (24h, sem refresh,
  logout manual, expiração → login) fica documentada, e o cookie httpOnly/CSRF
  como evolução futura registrada, sem refatoração nesta rodada.
- Enquanto o gateway não existe, cada serviço valida o JWT localmente na própria
  borda HTTP (RN12 — ver ADR 0007); com o gateway, a validação local permanece
  válida (padrão-ouro JWT), e o roteamento `/api/auth/*` do gateway reaproveita o
  prefixo `api` já adotado pelo auth-service.
- Variáveis de ambiente novas seguem `<SERVICO>_*`; nomes legados (`API_*`,
  `DATABASE_URL`) não se propagam aos serviços novos.
- O rate limit em memória é aceito para a v1 local; a port `LoginRateLimiter`
  permite trocar por Redis/distribuído sem alterar o domínio.
- Dono do follow-up da migração: a feature "API Gateway" no backlog.
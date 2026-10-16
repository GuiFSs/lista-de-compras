# ADR 0009 — Exceção temporária ao API Gateway para o shopping-list-service

**Status:** Aceita
**Data:** 2026-10-13

## Contexto

- A ADR 0001 define que a **borda de acesso da PWA é um API Gateway** — "o gateway
  será a única API chamada pela PWA; ele encaminhará as requisições aos serviços
  internos".
- A ADR 0006 registrou a primeira exceção temporária (a PWA chama o auth-service
  diretamente) e fechou o escopo com uma regra explícita: "Qualquer outra chamada
  direta da PWA a um microserviço exige **nova decisão registrada**".
- O gateway **não existe**: sua construção depende da feature **"API Gateway"** do
  backlog, ainda não planejada.
- A feature **Lista de compras ativa** (spec aprovada em
  `docs/features/shopping-list/SPEC.md`, decisão **CD-01** dos usuários) é a
  primeira feature de produto depois do login: exige ler e gravar a lista ativa.
  Sem gateway, a única forma de entregá-la nesta rodada é a PWA chamar o
  `shopping-list-service` diretamente.
- O serviço já existe (`apps/shopping-list-service`) com o guard global de JWT na
  borda HTTP (ADR 0007) e com o banco lógico `shopping_list` provisionado no
  ambiente local (ADR 0004) — falta apenas a decisão de acesso e o CORS.
- Esta ADR é a decisão exigida por CD-01/ADR 0006 e foi prevista como tarefa do
  `PLAN.md` da feature (`docs/features/shopping-list/PLAN.md`, T-01).

## Decisões

### 1. Exceção temporária à ADR 0001 — PWA chama o shopping-list-service diretamente

- A PWA chama o shopping-list-service **diretamente** em
  `http://localhost:3000` (porta `API_PORT=3000`), sob o prefixo `/api`, nos
  caminhos `/api/shopping-list/*`.
- **Escopo da exceção:** somente as operações da **lista de compras ativa** desta
  rodada — obter a lista, criar/editar/excluir/restaurar item, marcar/desmarcar
  item como comprado e concluir a compra. **Não** inclui histórico de preços,
  eventos, menor preço nem qualquer operação de outro serviço.
- **Validade:** somente **enquanto o gateway não existir**. Qualquer outra chamada
  direta nova (outro serviço, ou operação fora do escopo acima) continua exigindo
  nova decisão registrada — a regra da ADR 0006 permanece.
- A ADR 0001 permanece vigente como **regra geral** (o gateway continua sendo o
  destino de todas as demais chamadas e do futuro roteamento).
- A chamada direta ao auth-service (ADR 0006) e a validação local do JWT na borda
  de cada serviço (ADR 0007) **não mudam**.

### 2. CORS do shopping-list-service (viabiliza a chamada cruzada local)

- O serviço registra `@fastify/cors` (dependência que já existe no repo, usada
  pelo auth-service) com:
  - `origin` = lista de **`SHOPPING_LIST_CORS_ORIGINS`** (CSV), default
    `http://localhost:4200`;
  - `methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']`;
  - `allowedHeaders: ['Content-Type', 'Authorization']`.
- **Por quê:** a PWA roda em `http://localhost:4200` e o serviço em
  `http://localhost:3000` — origens diferentes. O CORS **não é controle de
  segurança**: ele apenas autoriza o navegador a completar a chamada cruzada; a
  autorização continua sendo o **JWT validado localmente** na borda do serviço
  (ADR 0007), que é o que de fato protege as operações.
- O CORS é removido na migração para o gateway (critério 3 abaixo).

### 3. Critérios de saída (migração para o gateway)

A migração é disparada pela **feature "API Gateway" do backlog** — por feature,
não por data (mesma política da ADR 0006 §3). Critérios de aceite da migração:

1. a PWA passa a chamar a lista por **URL relativa** (same-origin, via gateway,
   que roteia `/api/shopping-list/*`);
2. o **CORS do shopping-list-service é removido** (não há mais origem cruzada) e
   `SHOPPING_LIST_CORS_ORIGINS` sai do `.env.example`;
3. a base `http://localhost:3000` é **deprecada**: `SHOPPING_LIST_API_BASE_URL`
   sai da configuração da PWA;
4. nada muda na validação do JWT: cada serviço continua validando localmente na
   própria borda (ADR 0007 segue válida com o gateway, que apenas roteia).

**Dono do follow-up:** a feature **"API Gateway"** no backlog. Esta ADR é o
registro do compromisso; não há responsável por data nesta rodada.

### 4. Convenção de variáveis de ambiente

- Variáveis **novas** do shopping-list-service usam o prefixo **`SHOPPING_LIST_*`**
  — continuação da convenção da ADR 0006 §4 (ex.: `SHOPPING_LIST_CORS_ORIGINS`).
- **`API_PORT` e `DATABASE_URL` permanecem como estão** nesta rodada: são a
  herança do **primeiro serviço** já reconhecida na ADR 0006 §4. Renomeá-las
  (`SHOPPING_LIST_API_PORT`/`SHOPPING_LIST_DATABASE_URL`) exigiria mexer em
  `.env` local, `docker/compose.dev.yml`, `drizzle.config.ts`, `.env.example`,
  README e no ambiente de quem já desenvolve — churn fora do escopo desta feature.
  Fica registrado como **dívida de nomenclatura** (não bloqueia nada; o caminho é
  a renomeação junto de uma tarefa de infra/limpeza, não escondida dentro de uma
  feature de produto).

## Alternativas descartadas

- **Construir o gateway nesta rodada:** fora do escopo desta feature (o gateway é
  uma feature própria no backlog, com suas decisões de roteamento e autenticação
  de borda). Adiar não bloqueia o produto e mantém as features pequenas.
- **Usar o `proxy` do dev server do Angular para esconder o cross-origin:** não
  elimina a chamada direta — apenas a disfarça em desenvolvimento (e não existiria
  em produção sem gateway). A chamada direta continuaria acontecendo e, pela
  ADR 0006, continuaria exigindo decisão registrada. Sobraria menos transparência
  com o mesmo acoplamento.
- **Expor a lista pelo auth-service:** violaria o ownership dos dados
  (ADR 0001/0004) — o auth-service não é dono, nem proxy, dos dados da lista.
- **Modelar a exceção sem CORS, exigindo same-origin (servir a PWA pelo serviço):**
  inverteria a arquitetura da PWA (Angular em 4200) e misturaria responsabilidades
  (borda HTTP de dados servindo o front-end), o que é pior que o CORS local.

## Consequências

- A regra "o gateway é a única API chamada pela PWA" (ADR 0001) passa a ter
  **duas exceções nominais e temporárias**: o auth-service (ADR 0006, §1) e agora o
  shopping-list-service (esta ADR). A **ADR 0006 §1 foi ampliada** — a exceção
  deixou de ser exclusiva do auth-service — e recebeu uma nota apontando para esta
  ADR; o restante da ADR 0006 (sessão v1, prefixo por serviço, rate limit)
  permanece válido.
- Na v1 a PWA passa a depender de **duas bases URLs locais** (`AUTH_API_BASE_URL`
  e `SHOPPING_LIST_API_BASE_URL`) e o serviço de lista passa a responder
  **preflight `OPTIONS`**. Ambos os custos caem nos critérios de saída (§3).
- Nenhum segredo novo: a validação do JWT continua com a chave **pública** já
  distribuída pelo `.env` local (ADR 0007); o CORS não adiciona credencial.
- O serviço de lista fica acessível, **apenas em ambiente local**, a partir da
  origem da PWA. Em produção esse cenário não existe (não há ambiente publicado
  nesta fase) e a migração para o gateway é o caminho de saída registrado.
- Fica registrada uma **dívida de nomenclatura** (`API_PORT`/`DATABASE_URL` do
  primeiro serviço) e a existência de CORS local — custos conhecidos, reversíveis
  e com dono declarado.
- **Valor didático (objetivo do repositório):** o projeto vive intencionalmente o
  estado "microserviços sem gateway" e depois exercita a migração real — rota
  `/api/shopping-list/*` no gateway, remoção do CORS e troca da base URL por URL
  relativa. A decisão registrada é o que transforma esse estágio intermediário em
  aprendizado explícito, em vez de dívida silenciosa.

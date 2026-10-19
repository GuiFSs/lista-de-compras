# ADR 0010 — Exceção temporária ao API Gateway para o price-history-service

**Status:** Aceita
**Data:** 2026-10-16

## Contexto

- A ADR 0001 define que a **borda de acesso da PWA é um API Gateway** — "o gateway
  será a única API chamada pela PWA; ele encaminhará as requisições aos serviços
  internos".
- A ADR 0006 registrou a primeira exceção temporária (auth-service) e fechou o
  escopo com a regra: "Qualquer outra chamada direta da PWA a um microserviço
  exige **nova decisão registrada**". A ADR 0009 registrou a segunda
  (shopping-list-service).
- O gateway **não existe**: sua construção depende da feature **"API Gateway"** do
  backlog, ainda não planejada.
- A feature **Histórico de preços** (spec aprovada em
  `docs/features/price-history/SPEC.md`, decisão **CD-04**) entrega as telas
  **Histórico** e **Menor preço**, que leem dados do `price-history-service`. Sem
  gateway, a única forma de entregá-las nesta rodada é a PWA chamar esse serviço
  **diretamente**.
- O banco lógico `price_history` já está provisionado no Docker local (ADR 0004);
  o serviço ainda não existe e será criado nesta feature (ADR 0001 — primeiro
  conjunto). A validação local do JWT na borda HTTP (ADR 0007) aplica-se a todo
  serviço novo.
- Esta ADR é a decisão exigida por CD-04/ADR 0006 e foi prevista como entrega da
  fase de plano (`docs/features/price-history/PLAN.md`).

## Decisões

### 1. Exceção temporária à ADR 0001 — PWA chama o price-history-service diretamente

- A PWA chama o price-history-service **diretamente** em
  `http://localhost:3002` (porta `PRICE_HISTORY_API_PORT=3002`), sob o prefixo
  `/api`, nos caminhos `/api/price-history/*`.
- **Escopo da exceção:** somente as operações de **consulta** do histórico desta
  rodada — listar compras concluídas, obter detalhe de uma compra, listar
  menores preços e buscar menores preços por nome. **Não** inclui mutação de
  histórico pela PWA (a escrita continua só via evento RabbitMQ), nem operações
  de auth ou da lista ativa.
- **Validade:** somente **enquanto o gateway não existir**. Qualquer outra
  chamada direta nova (outro serviço, ou operação fora do escopo acima) continua
  exigindo nova decisão registrada — a regra da ADR 0006 permanece.
  > **Ponte (2026-10-19):** a
  > [ADR 0011](0011-excecao-temporaria-ao-gateway-drill-down-menor-preco-por-mercado.md)
  > registrou a **quarta operação** da exceção — o drill-down
  > `GET /api/price-history/lowest-prices/{item}` (menor preço por mercado, feature
  > "Menor preço por mercado", RN-15). A exceção do `price-history-service` passa a
  > cobrir **quatro** operações: as três enumeradas acima (inalteradas) e a nova, na
  > mesma base `http://localhost:3002`, com o CORS desta ADR §2 e os critérios de
  > saída desta ADR §3 (mesmo dono do follow-up). As três operações acima **não**
  > mudam.
- A ADR 0001 permanece vigente como **regra geral** (o gateway continua sendo o
  destino de todas as demais chamadas e do futuro roteamento).
- As exceções do auth-service (ADR 0006) e do shopping-list-service (ADR 0009), e
  a validação local do JWT na borda de cada serviço (ADR 0007), **não mudam**.

### 2. CORS do price-history-service (viabiliza a chamada cruzada local)

- O serviço registra `@fastify/cors` (dependência já usada por auth e
  shopping-list) com:
  - `origin` = lista de **`PRICE_HISTORY_CORS_ORIGINS`** (CSV), default
    `http://localhost:4200`;
  - `methods: ['GET', 'OPTIONS']` (somente leitura nesta rodada);
  - `allowedHeaders: ['Content-Type', 'Authorization']`.
- **Por quê:** a PWA roda em `http://localhost:4200` e o serviço em
  `http://localhost:3002` — origens diferentes. O CORS **não é controle de
  segurança**: ele apenas autoriza o navegador a completar a chamada cruzada; a
  autorização continua sendo o **JWT validado localmente** na borda do serviço
  (ADR 0007).
- O CORS é removido na migração para o gateway (critério 2 abaixo).

### 3. Critérios de saída (migração para o gateway)

A migração é disparada pela **feature "API Gateway" do backlog** — por feature,
não por data (mesma política das ADRs 0006 §3 e 0009 §3). Critérios de aceite da
migração:

1. a PWA passa a chamar o histórico por **URL relativa** (same-origin, via
   gateway, que roteia `/api/price-history/*`);
2. o **CORS do price-history-service é removido** (não há mais origem cruzada) e
   `PRICE_HISTORY_CORS_ORIGINS` sai do `.env.example`;
3. a base `http://localhost:3002` é **deprecada**: `PRICE_HISTORY_API_BASE_URL`
   sai da configuração da PWA;
4. nada muda na validação do JWT: cada serviço continua validando localmente na
   própria borda (ADR 0007 segue válida com o gateway, que apenas roteia).

**Dono do follow-up:** a feature **"API Gateway"** no backlog. Esta ADR é o
registro do compromisso; não há responsável por data nesta rodada.

### 4. Convenção de variáveis de ambiente

- Variáveis do price-history-service usam o prefixo **`PRICE_HISTORY_*`** —
  continuação da convenção da ADR 0006 §4 (ex.: `PRICE_HISTORY_API_PORT`,
  `PRICE_HISTORY_DATABASE_URL`, `PRICE_HISTORY_CORS_ORIGINS`).
- **Não** reutilizar `API_PORT`/`DATABASE_URL` (herança do primeiro serviço —
  shopping-list): serviços novos seguem o prefixo por serviço desde o início,
  evitando a dívida de nomenclatura já registrada nas ADRs 0006/0009.

## Alternativas descartadas

- **Construir o gateway nesta rodada:** fora do escopo desta feature (o gateway é
  uma feature própria no backlog). Adiar não bloqueia o produto e mantém as
  features pequenas.
- **Usar o `proxy` do dev server do Angular para esconder o cross-origin:** não
  elimina a chamada direta — apenas a disfarça em desenvolvimento. Pela ADR 0006,
  a chamada direta continuaria exigindo decisão registrada, com menos
  transparência.
- **Expor o histórico pelo shopping-list-service:** violaria o ownership dos
  dados (ADR 0001) — o shopping-list-service não é dono do banco `price_history`
  e a atualização do histórico após conclusão ocorre **por evento**, não por
  leitura/escrita cross-DB.
- **Servir a PWA pelo price-history-service (same-origin sem CORS):** misturaria
  responsabilidades e inverteria a arquitetura da PWA (Angular em 4200).

## Consequências

- A regra "o gateway é a única API chamada pela PWA" (ADR 0001) passa a ter
  **três exceções nominais e temporárias**: auth-service (ADR 0006),
  shopping-list-service (ADR 0009) e agora price-history-service (esta ADR). A
  **ADR 0006 §1** recebe nota apontando para esta ADR; a regra "qualquer outra
  chamada direta exige nova decisão" **permanece**.
- Na v1 a PWA passa a depender de **três bases URLs locais**
  (`AUTH_API_BASE_URL`, `SHOPPING_LIST_API_BASE_URL`,
  `PRICE_HISTORY_API_BASE_URL`) e o serviço de histórico passa a responder
  **preflight `OPTIONS`**. Ambos os custos caem nos critérios de saída (§3).
- Nenhum segredo novo: a validação do JWT continua com a chave **pública** já
  distribuída pelo `.env` local (`AUTH_JWT_PUBLIC_KEY_B64`, ADR 0007); o CORS não
  adiciona credencial.
- O serviço de histórico fica acessível, **apenas em ambiente local**, a partir
  da origem da PWA. Em produção esse cenário não existe (não há ambiente
  publicado nesta fase) e a migração para o gateway é o caminho de saída
  registrado.
- **Valor didático:** o projeto vive o estado "microserviços sem gateway" e
  depois exercita a migração real — rota `/api/price-history/*` no gateway,
  remoção do CORS e troca da base URL por URL relativa — com a decisão
  registrada em vez de dívida silenciosa.

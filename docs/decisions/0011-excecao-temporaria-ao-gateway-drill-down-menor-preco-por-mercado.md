# ADR 0011 — Exceção temporária ao API Gateway para o drill-down de menor preço por mercado

**Status:** Aceita
**Data:** 2026-10-19

## Contexto

- A ADR 0001 define que a **borda de acesso da PWA é um API Gateway** — "o gateway
  será a única API chamada pela PWA; ele encaminhará as requisições aos serviços
  internos".
- A ADR 0006 §1 registrou a primeira exceção temporária (auth-service) e fechou o
  escopo com a regra: "Qualquer outra chamada direta da PWA a um microserviço
  exige **nova decisão registrada**". A ADR 0009 registrou a segunda
  (shopping-list-service) e a ADR 0010 a terceira (price-history-service).
- A ADR 0010 §1 enumera o escopo da exceção do `price-history-service`: "somente
  as operações de **consulta** do histórico desta rodada — listar compras
  concluídas, obter detalhe de uma compra, listar menores preços e buscar menores
  preços por nome"; e fecha: "Qualquer outra chamada direta nova (outro serviço,
  ou operação fora do escopo acima) continua exigindo nova decisão registrada".
- O gateway **não existe**: sua construção depende da feature **"API Gateway"** do
  backlog, ainda não planejada.
- A feature **Menor preço por mercado** (spec aprovada em
  `docs/features/lowest-price-by-market/SPEC.md`, **RN-15**; entrega os AC-05 e
  AC-06) dá contexto à decisão de compra: a lista **Menor preço** passa a ser
  agrupada por mercado e tocar em um item abre a tela dedicada
  `/menor-preco/:item` com **uma linha por mercado**. Essa tela precisa do
  **histórico agregado item × mercado** — os menores preços daquele item em cada
  mercado —, que **não** é servido por nenhuma das quatro operações enumeradas na
  ADR 0010 §1 (a lista de menores preços é plana, por item, sem dimensão de
  mercado).
- A consulta nova (`GET /api/price-history/lowest-prices/{item}`) é, portanto,
  **operação fora do escopo** já aprovado e, pela regra das ADRs 0006/0010,
  **exige nova decisão registrada** — a própria RN-15 declara isso.
- A operação nova é servida pelo **mesmo** `price-history-service` em
  `http://localhost:3002` (porta `PRICE_HISTORY_API_PORT=3002`), sob o prefixo
  `/api`, no mesmo caminho base `/api/price-history/*`, com o **mesmo CORS** já
  existente e a mesma validação local do JWT na borda (ADR 0007). Nada de
  infraestrutura muda: **nenhuma** variável de ambiente nova, **nenhuma** porta
  nova, **nenhum** método ou header novo.
- Esta ADR é a decisão exigida pela RN-15/ADR 0010 e foi prevista como entrega da
  fase de plano (`docs/features/lowest-price-by-market/PLAN.md`, **T-01**).

## Decisões

### 1. Exceção temporária à ADR 0001 — operação nova do drill-down sob a mesma base direta

- A PWA chama a operação nova
  `GET /api/price-history/lowest-prices/{item}` **diretamente** no
  `price-history-service` em `http://localhost:3002` (porta
  `PRICE_HISTORY_API_PORT=3002`), sob o prefixo `/api`.
- **Escopo da exceção:** somente a operação de **consulta** do drill-down — os
  menores preços de um item por mercado, em
  `GET /api/price-history/lowest-prices/{item}`. **Não** inclui mutação de
  histórico pela PWA (a escrita continua só via evento RabbitMQ), nem operação de
  auth ou da lista ativa, nem qualquer outra operação do
  `price-history-service`. As operações já cobertas pela ADR 0010 **não** são
  alteradas por esta ADR.
- **Validade:** somente **enquanto o gateway não existir**. Qualquer outra
  chamada direta nova (outro serviço, ou operação fora do escopo acima) continua
  exigindo nova decisão registrada — a regra da ADR 0006 permanece.
- A ADR 0010 **não é substituída nem revogada**: ela continua valendo para as
  três operações que enumera. A exceção do `price-history-service` passa a ter
  **quatro** operações nominais — as três da ADR 0010 (inalteradas) e a nova do
  drill-down (registrada aqui). A **ADR 0010 §1** recebe nota de ponte apontando
  para esta ADR.
- A ADR 0001 permanece vigente como **regra geral** (o gateway continua sendo o
  destino de todas as demais chamadas e do futuro roteamento).
- As exceções do auth-service (ADR 0006 §1) e do shopping-list-service
  (ADR 0009), e a validação local do JWT na borda de cada serviço (ADR 0007),
  **não mudam**.

### 2. CORS do price-history-service — inalterado

- A operação nova usa o **mesmo** CORS já registrado na ADR 0010 §2 e que
  viabiliza as demais operações do serviço:
  - `origin` = lista de **`PRICE_HISTORY_CORS_ORIGINS`** (CSV), default
    `http://localhost:4200`;
  - `methods: ['GET', 'OPTIONS']` (a operação nova é de leitura, como as demais);
  - `allowedHeaders: ['Content-Type', 'Authorization']`.
- **Por quê nada muda:** a operação nova é `GET`, parte do mesmo serviço e da
  mesma origem cruzada da PWA (`http://localhost:4200`) — o CORS existente já a
  cobre. Não há configuração nova, método novo ou header novo.
- O CORS **não é controle de segurança**: ele apenas autoriza o navegador a
  completar a chamada cruzada; a autorização continua sendo o **JWT validado
  localmente** na borda do serviço (ADR 0007).
- O CORS é removido na migração para o gateway (critério 2 abaixo), **junto** com
  o da ADR 0010 — é o mesmo serviço.

### 3. Critérios de saída (migração para o gateway)

Idênticos aos da **ADR 0010 §3** — mesmo serviço, mesmo dono, mesma política: a
operação nova entra na **mesma migração** e não cria caminho de saída próprio.
Critérios de aceite da migração:

1. a PWA passa a chamar o histórico por **URL relativa** (same-origin, via
   gateway, que roteia `/api/price-history/*` — **incluindo** a rota nova do
   drill-down);
2. o **CORS do price-history-service é removido** (não há mais origem cruzada) e
   `PRICE_HISTORY_CORS_ORIGINS` sai do `.env.example`;
3. a base `http://localhost:3002` é **deprecada**: `PRICE_HISTORY_API_BASE_URL`
   sai da configuração da PWA;
4. nada muda na validação do JWT: cada serviço continua validando localmente na
   própria borda (ADR 0007 segue válida com o gateway, que apenas roteia).

A migração é disparada pela **feature "API Gateway" do backlog** — por feature,
não por data (mesma política das ADRs 0006 §3, 0009 §3 e 0010 §3).

**Dono do follow-up:** a feature **"API Gateway"** no backlog. Esta ADR é o
registro do compromisso; não há responsável por data nesta rodada.

## Alternativas descartadas

- **Estender a ADR 0010 em vez de criar uma ADR nova:** **rejeitada por decisão do
  usuário em 2026-10-19** (Pergunta 3 do `PLAN.md`). A operação é **nova** e
  merece registro próprio: a ADR 0010 permanece **histórica** (o que foi decidido
  em 2026-10-16 continua legível como decidido naquele momento, com as três
  operações da v1) e ligada a esta por uma nota de **ponte** na sua §1. A forma
  não é preferência de quem implementa: foi fixada pelo usuário no plano
  aprovado.
- **Construir o gateway nesta rodada:** fora do escopo desta feature (o gateway é
  uma feature própria no backlog). Adiar não bloqueia o produto e mantém as
  features pequenas.
- **Usar o `proxy` do dev server do Angular para esconder o cross-origin:** não
  elimina a chamada direta — apenas a disfarça em desenvolvimento. Pela ADR 0006,
  a chamada direta continuaria exigindo decisão registrada, com menos
  transparência.
- **Expor o drill-down pelo shopping-list-service:** violaria o ownership dos
  dados (ADR 0001) — o shopping-list-service não é dono do banco
  `price_history`, e a leitura cross-DB é justamente o que o ownership proíbe.
- **Servir a PWA pelo price-history-service (same-origin sem CORS):** misturaria
  responsabilidades e inverteria a arquitetura da PWA (Angular em 4200).

## Consequências

- A exceção do `price-history-service` passa a cobrir **quatro operações**: as
  três já registradas na ADR 0010 §1 (inalteradas) e a operação nova do
  drill-down `GET /api/price-history/lowest-prices/{item}` (esta ADR). A
  **ADR 0010 §1 recebe nota de ponte** apontando para esta ADR; a regra "qualquer
  outra chamada direta exige nova decisão" **permanece**.
- **Uma operação a mais a migrar** quando o gateway existir: a rota
  `/api/price-history/lowest-prices/{item}` entra no roteamento
  `/api/price-history/*` do gateway e some da base direta junto com as demais. O
  custo é absorvido pelos critérios de saída (§3), que já cobrem o serviço
  inteiro — a operação nova **não** cria um segundo caminho de migração.
- **Rastreabilidade da exceção:** a operação nova não fica coberta "por analogia"
  nem como dívida silenciosa — tem decisão própria, com escopo, validade e
  critérios de saída explícitos. O histórico de "por que a PWA chama 3002 direto"
  continua auditável nas duas ADRs (0010 + esta).
- **Risco de esquecimento mitigado:** o risco real de uma exceção temporária é a
  operação nova ficar para trás na hora da migração. Os **critérios de saída**
  citam explicitamente a rota nova e o **dono do follow-up** (feature "API
  Gateway") é o mesmo da ADR 0010 — quem migrar o serviço encontra as duas ADRs
  pela ponte.
- Nenhum segredo novo: a operação continua protegida pela chave **pública** do
  JWT já distribuída pelo `.env` local (ADR 0007); esta ADR não adiciona
  credencial. Nenhuma variável de ambiente nova.
- **Valor didático:** o projeto exercita o segundo grau de uma exceção temporária
  — uma operação **nova dentro de um serviço já excetuado**. Registrar ADR nova
  (em vez de emendar a 0010 em silêncio) obriga a pergunta "esta operação
  pertence ao escopo já aprovado?" a cada consulta nova, em vez de assumir que a
  exceção de um serviço cobre tudo o que ele venha a expor.

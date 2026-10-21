# Lições — Menor preço por mercado (2026-10-19/20)

**Contexto:** aprendizados transferíveis da implementação da feature
`lowest-price-by-market` (serviço + PWA + E2E), que evoluiu um **contrato
compartilhado** e trouxe uma **operação nova** ao `price-history-service`.

Este documento **não é uma ADR**: decisões ficam em `docs/decisions/`. Aqui ficam
os aprendizados que vão se repetir. Cada tópico segue **o que aconteceu → por que
importa → onde ficou o guard**.

---

## 1. Evoluir contrato compartilhado deixa consumidores vermelhos — versão o commit pelo ponto de fechamento, não pela tarefa

- **O que aconteceu:** `libs/contracts` mudou de `LowestPricesResponse.items`
  para `markets[]` (breaking, sem alias de transição) **antes** dos consumidores.
  Do commit dos contratos até o último consumidor, `use-cases`, `http` e a PWA
  ficaram vermelhos — não por regressão, mas por ainda lerem o shape antigo.
- **Por que importa:** a regra do `AGENTS.md`/`sdd-workflow` é **nunca avançar
  com falha de teste**. Uma mudança de shape honesta violaria a regra se o commit
  fosse por tarefa isolada; "tudo vermelho" e "quebrou de verdade" ficariam
  indistinguíveis no histórico.
- **Onde ficou o guard:** a **tabela de impacto** do PLAN (suíte × quem atualiza)
  + os **pontos de commit** (PC-0…PC-8, ressalva R-3). Os contratos **não** foram
  commitados sozinhos: entraram no PC-2 com os primeiros consumidores verdes
  (`contracts` build/lint + `-- domain`); cada PC fecha com a suíte-alvo verde — o
  serviço fechou inteiro no PC-4, a PWA no PC-5, o E2E no PC-7 (72/72). Todo
  handoff de commit registra as suítes vermelhas **por design** e a T dona.
- **Gatilho:** qualquer mudança de shape em contrato consumido por mais de um
  projeto.

## 2. Spec de integração com Postgres real escreve no banco de dev — escope o `update` e limpe por caso

- **O que aconteceu:** o spec de integração do repositório rodava
  `update … set({ unit: 'invalida' })` **sem `where`**, corrompendo
  `purchase_items` no banco de **dev** `price_history` — a corrupção derrubava
  `GET /lowest-prices` com **500**. O `afterEach` truncando por caso + o `where`
  escopado resolveram, e um `afterAll` afirma `count(*) = 0/0` ao fechar o pool.
- **Por que importa:** um teste que passa pode deixar o ambiente pior do que
  achou. Sem limpeza determinística, o próximo run (ou o dev) herda lixo —
  "verde" escondia um banco corrompido.
- **Onde ficou o guard:** o spec declara no **cabeçalho** que apaga
  `purchases`/`purchase_items` do banco de dev a cada caso (o banco de dev passa a
  valer como **descartável**, troca aceita por isolamento zero) e a asserção de
  `0/0` no fim fecha o resíduo (R-4). **Pendência de ambiente registrada:** banco
  de **teste dedicado** para o `price-history-service` — hoje a suíte trunca o
  banco de dev; o follow-up exige decisão de configuração própria e ficou fora do
  escopo desta feature.

## 3. Agrupar/ordenar/desempatar é responsabilidade do serviço — o cliente só renderiza

- **O que aconteceu:** o agrupamento por mercado, a ordem A→Z e o desempate do
  vencedor foram resolvidos **no domínio** e a resposta já chega pronta; a PWA
  recebe os grupos e a tela só pinta. A prova foi uma jornada cuja asserção é
  "a tela **espelha** a resposta".
- **Por que importa:** se o cliente reordenasse ou desempatasse, a regra
  RN-05/desempate viveria em dois lugares (serviço e PWA/E2E) e divergiria em
  silêncio — o E2E hermético **não pega** divergência de regra entre fake e
  serviço.
- **Onde ficou o guard:** o contrato agrupado (`markets[]`, sem alias) torna o
  agrupamento garantia do **tipo**; a asserção de espelhamento no E2E + os units
  de domínio provam a regra **uma vez só**, no dono do dado (RN-12).

---

## Padrões gerais

1. **Falsifique o guard de propósito.** Na auditoria da PWA, remover o guard
   CD-09 do template fez o spec do grupo vazio **falhar** e reverteu; prova que o
   teste pega a regressão em vez de apenas existir.
2. **Registre a hipótese com critério de fechamento, não decida por suposição.**
   A "limitação" de nome com `/` virou **hipótese a refutar** (R-2): o round-trip
   passou nos cinco pontos (domínio, Fastify, PWA, rota, E2E), então a limitação
   **sai** do PLAN — hipótese refutada por teste, sem escolher comportamento.

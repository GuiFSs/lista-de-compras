# Estado da feature — Lista de compras

**Fase atual:** Implementação
**Gate atual:** plano **aprovado** — `PLAN.md` com a frase canônica
`Aprovado pelo usuário em 2026-10-13` (gate do plano fechado)
**Última atualização:** 2026-10-13
**Próxima ação:** Onda 5 — delegar **T-10** (camada de dados da PWA; dep T-02) ∥
**T-15** (auditoria de testes do backend; dep T-06), projetos disjuntos. Depois
**T-11** (tela Lista) → T-12 → T-13 → T-14 (sequenciais) → T-16 → T-17.

## Artefatos

- Spec: `docs/features/shopping-list/SPEC.md` — **aprovada em 2026-10-13** (26 ACs;
  CD-01–CD-13; nenhuma decisão aberta)
- Plano: `docs/features/shopping-list/PLAN.md` — **aprovado em 2026-10-13**
  (17 tarefas `T-01…T-17`, matriz AC ↔ E2E com 26 ACs, `Superfície de UI: sim`,
  contrato HTTP completo, `Eventos: nenhum`; status `Aprovado`)
- ADR: `docs/decisions/0009-excecao-temporaria-ao-gateway-shopping-list-service.md`
  — registrada (exceção temporária à ADR 0001 para o `shopping-list-service`);
  ADR 0006 §1 e Consequências com nota apontando para a 0009
- Revisão arquitetural: **não aplicável** nesta rodada (um único serviço backend, sem
  contrato entre serviços, sem evento, sem mudança de ownership); revisão opcional e
  não bloqueante registrada no `PLAN.md` (limitada à ADR 0009 e ao contrato
  PWA↔serviço)
- Validação: pendente (`VALIDATION.md` só é criado na fase de Validação)

## Escopo desta rodada (confirmado com o usuário)

- **Somente a lista de compras ativa**: obter a lista, adicionar/editar/excluir/
  restaurar item, marcar/desmarcar item como comprado e concluir a compra.
- **Fora desta rodada**: histórico de preços, menor preço e comparação — virão em
  feature(s) futura(s) (`price-history` etc.). A conclusão da compra **não** publica
  evento, **não** grava registro e **não** expõe rota de histórico (RN-16/AC-21); o
  envio ao histórico por evento (previsto na ADR 0001) é contrato da **feature de
  histórico**, fora desta rodada, sem ADR criada aqui.

## Execução

- Tarefa em andamento: nenhuma (T-10 ∥ T-15 a delegar na Onda 5)
- Tarefas concluídas: T-01, T-02, T-03, T-04, T-05, T-06, T-07, T-08, T-09
- Critérios comprovados: backend completo em código (T-01–T-07) com 144 testes na
  suíte do serviço; a prova integrada com Postgres (AC-09/AC-21/AC-24) e a de UI
  (AC-01–AC-26) ainda dependem de T-15/T-16/T-17
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- **Nenhum bloqueio.** O gate do plano está fechado (frase canônica registrada em
  2026-10-13); a implementação pode começar pela Onda 1.
- **Encaminhamento (não bloqueio):** o contrato do **evento de conclusão de compra**
  (previsto na ADR 0001) fica para a **feature de histórico** — fora desta rodada.
- **Nota de escopo (resolvida):** para T-06 honrar o contrato **201 (criado) / 200
  (soma aplicada)** do `POST /items`, o orquestrador autorizou uma alteração
  **aditiva** em `create-shopping-list-item.use-case.ts`/`shopping-list-result.ts`
  (`created?: boolean`), agora implementada e com testes verdes (ver `Último handoff`).

## Último handoff

- Agente: `backend-dev` (T-06, mais recente)
- Tarefa: T-06 — borda HTTP (`apps/shopping-list-service/src/api/http/shopping-list/**`,
  `app/configure-app.ts`, `app/app.module.ts`, `main.ts`)
- Estado: concluída
- Arquivos alterados: controller (8 rotas), módulo (useFactory), mensagens, erros
  canônicos, parse defensivo, mapper domínio→DTO, spec de integração; `configure-app.ts`
  (prefixo `api`, CORS, parser JSON próprio); `app.module.ts`; `main.ts`; **mais**
  mudança aditiva autorizada em `create-shopping-list-item.use-case.ts` +
  `shopping-list-result.ts` (`created?: boolean` → 201/200)
- ACs cobertos: AC-02, AC-04–AC-13, AC-19–AC-24 (AC-09/AC-21/AC-24 com banco real ficam
  em T-15)
- Testes executados: `npx nx test shopping-list-service` (144 verdes, 13 arquivos);
  `npx nx lint` e `npx nx build` verdes
- Decisões registradas: 201/200 na criação via `@Res` + `created` (aditivo autorizado);
  `restore`/`checkout` com `@HttpCode(200)`; **JSON malformado** normalizado para o
  envelope canônico — `MALFORMED_JSON_MESSAGE = 'Corpo da requisição inválido'`
  (paridade estrita com o auth-service; mensagem nova em relação à lista do PLAN)
- Observações (não-AC, registradas): corpo malformado **sem** token responde 400
  canônico (o parse precede o `JwtAuthGuard`) — mesmo comportamento do auth-service;
  doc de `libs/contracts/README.md` poderia citar a mensagem nova (follow-up opcional)
- Commits: `bce7aec` (T-06)
- Pendências: nenhuma bloqueante. **Backend completo** (T-01–T-07)
- Próximo passo recomendado: Onda 5 — T-10 (dep T-02) ∥ T-15 (dep T-06)

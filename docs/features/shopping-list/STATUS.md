# Estado da feature — Lista de compras

**Fase atual:** Implementação
**Gate atual:** plano **aprovado** — `PLAN.md` com a frase canônica
`Aprovado pelo usuário em 2026-10-13` (gate do plano fechado)
**Última atualização:** 2026-10-13
**Próxima ação:** orquestrador cria a branch `feature/shopping-list` e inicia a
**Onda 1** (**T-01** ∥ **T-02**), comitando por `T-*` (Conventional Commits) após
cada tarefa com testes verdes.

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

- Tarefa em andamento: nenhuma (branch `feature/shopping-list` ainda a criar)
- Tarefas concluídas: nenhuma
- Critérios comprovados: nenhum
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- **Nenhum bloqueio.** O gate do plano está fechado (frase canônica registrada em
  2026-10-13); a implementação pode começar pela Onda 1.
- **Encaminhamento (não bloqueio):** o contrato do **evento de conclusão de compra**
  (previsto na ADR 0001) fica para a **feature de histórico** — fora desta rodada.

## Último handoff

- Agente: `tech-planner`
- Tarefa: ajuste do `PLAN.md` à decisão **CD-13** (duplicidade na edição) + fechamento
  do gate do plano
- Estado: concluída
- Arquivos alterados: `docs/features/shopping-list/PLAN.md`,
  `docs/features/shopping-list/STATUS.md`
- ACs cobertos: `AC-07`, `AC-08`, `AC-09` (duplicidade na criação × edição) — regra
  ajustada em domínio, contrato, tarefas T-02/T-05/T-06/T-12, estratégia de testes,
  matriz AC ↔ E2E e T-17; os demais 23 ACs permanecem como no plano aprovado
- Testes executados: não aplicável (fase de plano; sem código)
- Decisões registradas: **CD-13** (na edição, renomear para um nome já existente em
  outro item **não aplica** e **não soma** — conflito visível no formulário; renomear
  para o próprio nome normalizado aplica; a **criação** segue em **CD-02/AC-07** com
  pergunta/soma via `duplicateResolution`); o antigo **DP-01** foi **removido**
- Pendências: nenhuma para o gate; evento de conclusão de compra segue para a feature
  de histórico
- Próximo passo recomendado: orquestrador cria a branch `feature/shopping-list` e
  delega a **Onda 1** (**T-01** ∥ **T-02**); após cada `T-*` com testes verdes, comita
  antes da próxima onda

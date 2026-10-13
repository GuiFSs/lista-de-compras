# Estado da feature — Lista de compras

**Fase atual:** Implementação
**Gate atual:** plano **aprovado** — `PLAN.md` com a frase canônica
`Aprovado pelo usuário em 2026-10-13` (gate do plano fechado)
**Última atualização:** 2026-10-13
**Próxima ação:** Onda 4 em curso — **T-09** (shell autenticado; dep T-08) ∥
**T-06** (borda HTTP; deps T-02/T-04/T-05) em andamento. Depois **T-10** (camada
de dados da PWA; dep T-02) e **T-11** (tela Lista; dep T-08/T-09/T-10).

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

- Tarefa em andamento: T-09 (shell autenticado) ∥ T-06 (borda HTTP)
- Tarefas concluídas: T-01, T-02, T-03, T-04, T-05, T-07, T-08
- Critérios comprovados: nenhum AC fechado ainda (a prova integrada/final é T-06,
  T-15 e T-17); T-03/T-04/T-05 entregam as regras do domínio, a persistência e os
  casos de uso
- ACs reabertos: nenhum
- Tarefas reabertas: nenhuma

## Pendências e bloqueios

- **Nenhum bloqueio.** O gate do plano está fechado (frase canônica registrada em
  2026-10-13); a implementação pode começar pela Onda 1.
- **Encaminhamento (não bloqueio):** o contrato do **evento de conclusão de compra**
  (previsto na ADR 0001) fica para a **feature de histórico** — fora desta rodada.
- **Nota de escopo (autorizada):** para T-06 honrar o contrato **201 (criado) / 200
  (soma aplicada)** do `POST /items`, o orquestrador autorizou uma alteração
  **aditiva** em `create-shopping-list-item.use-case.ts`/`shopping-list-result.ts`
  (expor a distinção criar×somar), mantendo os testes verdes. Entra na avaliação de
  T-06 no `Último handoff` quando a tarefa fechar.

## Último handoff

- Agente: `angular-dev` (T-08, mais recente)
- Tarefa: T-08 — primitivas de UI (`apps/web/src/app/ui/**`)
- Estado: concluída
- Arquivos alterados: `bottom-sheet/*`, `toast/*` (service + host + model),
  `icons/*` (7 SVGs inline + `icon.scss`), `ui/index.ts` (barrel público)
- ACs cobertos: AC-25 (bottom sheet acessível: foco preso, fecha com botão e Esc,
  `--color-overlay`, `--radius-xl`), AC-23 (toast: confirmação auto-dismiss ≈4s com
  ação "Desfazer"; erro permanece até o descarte), ícones inline (sem dependência)
- Testes executados: `npx nx test web` (52 verdes, 9 arquivos); `npx nx lint web`
  (All files pass linting); `npx nx build web` (sucesso)
- Decisões registradas: primitivas em `apps/web/src/app/ui` (não `libs/ui-web` —
  sem consumidor; já decidido no PLAN); `BottomSheet` controlado pelo consumidor
  (`@if` + output `closed`, input `closeOnBackdrop`); sem cor/espaço hardcoded
- Commits: `4a1b7ec` (T-08)
- Pendências: nenhuma. Consumidores: T-11…T-14
- Próximo passo recomendado: Onda 4 — T-09 (shell) ∥ T-06 (borda HTTP)

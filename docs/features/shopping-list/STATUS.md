# Estado da feature — Lista de compras

**Fase atual:** Implementação
**Gate atual:** plano **aprovado** — `PLAN.md` com a frase canônica
`Aprovado pelo usuário em 2026-10-13` (gate do plano fechado)
**Última atualização:** 2026-10-13
**Próxima ação:** Onda 4 — T-09 (shell autenticado) concluída; **T-06** (borda
HTTP) em andamento. Ao fechar T-06: **T-10** (camada de dados da PWA; dep T-02) ∥
**T-15** (auditoria de testes do backend; dep T-06), depois **T-11** (tela Lista) e
a cadeia sequencial T-12 → T-13 → T-14, seguidas de T-16 e T-17.

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

- Tarefa em andamento: T-06 (borda HTTP)
- Tarefas concluídas: T-01, T-02, T-03, T-04, T-05, T-07, T-08, T-09
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

- Agente: `angular-dev` (T-09, mais recente)
- Tarefa: T-09 — shell autenticado (`apps/web/src/app/layout/**`)
- Estado: concluída
- Arquivos alterados: `layout/shell-chrome/*` (`ShellChromeService` + modelo +
  barrel), `layout/bottom-nav/*` (3 abas, `<nav>` semântico), `layout/
  authenticated-shell/*` (app bar com título/ações por rota + "Sair" + bottom nav);
  **mais** `core/auth/auth.guard.spec.ts` (asserção obsoleta corrigida)
- ACs cobertos: AC-01 (shell + navegação), AC-25 (título/ações por rota, "Sair"
  sempre presente, alvos ≥44px, tokens)
- Testes executados: `npx nx test web` (65 verdes, 12 arquivos); `npx nx lint web`
  (All files pass); `npx nx build web` (sucesso); `npx nx e2e web-e2e` (6 verdes —
  regressão de auth preservada)
- Decisões registradas: `ShellChromeService.contribute(chrome, destroyRef)` com
  auto-reset no destroy da rota (evita título preso); ação de ícone via
  `NgComponentOutlet` (`Type<unknown>`); bottom nav com `<nav>` semântico; reserva
  de espaço do conteúdo via `.content-with-bottom-nav`/`--bottom-nav-height`
  (**T-11 não deve duplicar**)
- **Nota de escopo (autorizada):** ampliação mínima aprovada para usar `<nav>`
  semântico e corrigir a asserção obsoleta de `auth.guard.spec.ts` (que afirmava
  ausência de nav no shell autenticado) — em vez de manter o workaround. Sem impacto
  em T-11 (`BottomNav` consumido por `app-bottom-nav`)
- Commits: `1da53e9` (T-09)
- Pendências: nenhuma. Consumidores: T-11 (título/ações por rota)
- Próximo passo recomendado: T-10 (dep T-02) ∥ T-15 (dep T-06), após T-06 fechar

# Validação — Editar compra concluída

**Spec:** `docs/features/edit-purchase/SPEC.md` (aprovada em 2026-11-07 — AC-01…AC-11)
**Plano:** `docs/features/edit-purchase/PLAN.md` (aprovado em 2026-11-07 — T-01…T-07)
**Data:** 2026-11-07
**Resultado:** **Aprovada** — 11/11 ACs com evidência executável
**Superfície de UI (do plano):** **sim** (ADR 0008)

DoR da validação: T-01…T-07 concluídas e commitadas em `feature/edit-purchase`
(`fd602d4`…`159c2a8`), nenhum AC/T reaberto. O handoff do test-engineer registra
a corrida Playwright. Esta validação reproduziu os comandos abaixo.

## Conferência do STATUS contra o repositório

- Branch: `feature/edit-purchase`, já em `origin` (push desta sessão).
- Trabalho não commitado antes desta validação: nenhum (os docs desta
  validação entram depois).
- Docker local: Postgres e RabbitMQ healthy. Depois da suíte do serviço,
  `purchases` e `purchase_items` no Postgres local ficaram em 0/0.
- `.env` local aponta para `localhost`. A suíte não foi apontada ao Neon
  nesta corrida.

## Evidências por critério

**Comando E2E** = `npx nx e2e web-e2e --skip-nx-cache` → **80/80**; filtro
`-- --grep "editar compra"` → **5/5**. **Web** = `npx nx test web --skip-nx-cache`
→ **31 arquivos, 327 testes**. **Serviço** = `npx nx test price-history-service --skip-nx-cache`
→ **25 arquivos, 162 testes**.

| AC | Estado | Playwright | Unit / integração | Observação |
| --- | --- | --- | --- | --- |
| AC-01 | **aprovado** | `edit-purchase.spec.ts:56` — abre Editar com mercado, data, nome e preço da primeira linha | `edit-purchase-sheet.spec.ts` — mercado, data e os dois itens (nome, quantidade, unidade e preço do primeiro) | Prefill no `ngOnInit` por item |
| AC-02 | **aprovado** | mesmo teste: detalhe mostra `2 kg · R$ 12,00`, URL continua `/historico/compra-barata`, um PATCH | sheet: `updatePurchase` com mercado aparado; controller `200 substitui a compra, preserva id e createdAt` | id estável |
| AC-03 | **aprovado** | `:126` — Leite entra depois do Arroz; Feijão sai | sheet: itens enviados na ordem das linhas; domínio preserva a ordem do comando | ordem do formulário |
| AC-04 | **aprovado** | mesmo teste: Salvar desabilitado sem linha, frase visível, PATCH continua 1 | sheet: Salvar disabled e `updatePurchase` não chamado | mínimo de um item |
| AC-05 | **aprovado** | mesmo teste: `leite`/`Leite` mostra o conflito, PATCH não aumenta, detalhe segue com 2 itens | sheet + `update-purchase.spec.ts` (`duplicate-item-name`) | normalização de nome |
| AC-06 | **aprovado** | `:205` — mercado vazio e data futura, PATCH 0, detalhe segue Atacadão | sheet (mesmas mensagens) + domínio (`market-required`, `purchase-date-future`) + controller `400 de validação não altera a compra` | nome, quantidade, unidade e preço inválidos também bloqueiam o Salvar no sheet (`errors()`), com as mesmas mensagens do domínio |
| AC-07 | **aprovado** | `:56` — Menor preço passa a R$ 10,00 · Feira · data · 1 kg; drill-down mostra Atacadão R$ 12,00 e Feira R$ 10,00 | `update-purchase.spec.ts` — preço que passa a ser o menor leva mercado, data, quantidade e unidade | agregação na leitura |
| AC-08 | **aprovado** | `:56` (preço vencedor sobe e a outra compra assume) e `:126` (Feijão some; Leite aparece) | domínio: subir preço, remover linha vencedora, renomear e linha nova | renomear coberto no domínio; a tela cobre subir, remover e incluir |
| AC-09 | **aprovado** | `:180` — quantidade 9 na Feira; Menor preço segue Atacadão · R$ 8,00 · 2 kg | domínio: mudar só a quantidade de quem não vence deixa o vencedor | vencedor estável |
| AC-10 | **aprovado** | `:227` — toast de falha de rede, mercado digitado permanece, sheet aberto | sheet: `HttpErrorResponse` status 0, texto preservado | erro visível |
| AC-11 | **aprovado** | N/A (não observável na UI). `:56` afirma 0 POST e 0 PATCH na lista | caso de uso e domínio preservam `createdAt`; controller 200 devolve o `createdAt` original; repositório `update` não mexe em `createdAt` | sem evento e sem escrita na lista |

## Checklist de documentação

- [x] Contratos coerentes: `UpdatePurchaseRequest` em `libs/contracts/src/http/price-history.ts`; README com PATCH, 200/400/401/404 e CORS `GET, PATCH, OPTIONS`. Nenhum evento novo.
- [x] ADR 0014 aceita em 2026-11-07; ponte na ADR 0010. Revisão arquitetural separada não se aplica (o plano declara isso).
- [x] README / `.env.example`: a feature não cria variável. `.env.example` já descreve as URLs locais. N/A de alteração.
- [x] Lição: `docs/lessons/2026-11-07-suite-de-integracao-e-env.md` (`??=` não segura o banco quando o Nx injeta o `.env`).
- [x] `STATUS.md` atualizado nesta validação: fase validação aprovada; próxima ação é a decisão de PR.

## Checklist de design (Superfície de UI = sim)

Tipo de tela: detalhe continua lista/conteúdo; a edição é formulário de app no bottom sheet (guia §4).

- [x] Tokens: `edit-purchase-sheet.scss` e o detalhe usam `var(--color-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--font-size-*)`, `var(--touch-target-min)`. Sem `rgb`/`hsl`/hex nesses arquivos. Borda `1px` e `outline-offset: 2px` seguem os outros sheets.
- [x] Quatro estados: carregando = skeleton do detalhe (inalterado) e `Salvando…` desabilitado; vazio = “A compra precisa ter pelo menos um item.” com Salvar desabilitado (E2E AC-04); erro = mensagem no campo e faixa/toast (E2E AC-05, AC-06, AC-10); sucesso = detalhe atualizado + “Compra atualizada” (E2E AC-02).
- [x] Uma coluna, grupos com `--space-lg` entre blocos e `--space-md` dentro. Salvar no fim do sheet, ao lado de Cancelar secundário. Incluir item e Remover item não são o primary.
- [x] Campos com `min-height: var(--touch-target-min)` e `:focus-visible`. Botões com a mesma altura. O reset não zera `outline` de `button`, no mesmo padrão dos outros sheets.
- [x] Erro visível: `role="alert"` no campo e na faixa; toast na falha de rede.
- [x] Escuro via tokens de superfície, tinta e perigo. Sem cor literal no sheet.
- [x] Hierarquia: título “Editar compra”, apoio em `--font-size-body-sm` / `--color-ink-muted`, rótulos `--font-size-caption`, CTA `--font-weight-medium`.
- [x] Agrupamento: mercado e data num bloco; cada linha com nome e a fileira quantidade/unidade/preço; ações no fim.
- [x] Receita de formulário de app: título, campos com label, um primary no terço inferior.

## Verificações transversais

- [x] PATCH implementado no controller; CORS `GET, PATCH, OPTIONS` no `configure-app.ts` e no preflight do controller spec.
- [x] ADR 0014 versionada.
- [x] SPEC e PLAN com a frase `Aprovado pelo usuário em 2026-11-07`. Nenhuma decisão aberta.
- [x] Testes do plano executados nesta validação (comandos abaixo).
- [x] Playwright executado (filtro e suíte completa).
- [x] Checklists de documentação e design completos.
- [x] Nenhum segredo nos arquivos desta feature. O `.env` segue gitignored.

## Pendências

- Nenhuma de comportamento, contrato ou arquitetura.
- Fora desta feature: a migração `0001_purchase_item_position` está no Postgres local e ainda não no Neon. Aplicar só num deploy decidido à parte.
- Fora desta feature: banco de teste dedicado para a suíte que trunca `price_history` (já registrado na lição de 2026-10-19).

## Comandos executados

```text
npx nx e2e web-e2e --skip-nx-cache -- --grep "editar compra"
5 passed (7.4s)

npx nx e2e web-e2e --skip-nx-cache
80 passed (1.2m)

npx nx test price-history-service --skip-nx-cache
Test Files  25 passed (25)
Tests  162 passed (162)

npx nx test web --skip-nx-cache
Test Files  31 passed (31)
Tests  327 passed (327)

npx nx run-many -t lint build -p contracts --skip-nx-cache
Successfully ran targets lint, build for project contracts

docker exec … psql … price_history
purchases|purchase_items = 0|0
```

## Parecer

Aprovada. Os onze critérios têm evidência executável. AC-01 a AC-10 têm cenário Playwright na corrida de 5/5, reproduzida dentro da suíte de 80/80. AC-11 é de persistência e está no caso de uso, no controller e no repositório, com o E2E confirmando que a lista ativa não recebe POST nem PATCH. Checklists de documentação e design fechados. Push da branch de implementação já foi feito; abrir o PR continua decisão do usuário.

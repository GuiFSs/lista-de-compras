# Fluxo SDD canônico

Este documento é a fonte de verdade do processo **Spec → Plano →
Implementação → Validação**. `AGENTS.md`, agentes e skills devem apontar para
ele, sem duplicar regras.

Bugfix e correções pós-merge usam o **mesmo ciclo** (SPEC, PLAN, STATUS,
VALIDAÇÃO e gates). Não existe track paralelo mais leve.

## Estado mínimo de uma feature

Cada feature usa `docs/features/<feature>/`:

- `STATUS.md`: fase, próximo passo, bloqueios, reaberturas e último handoff.
- `SPEC.md`: comportamento e critérios `AC-*` aprovados.
- `PLAN.md`: tarefas `T-*`, dependências, escopo de arquivos e testes.
- `ARCHITECTURE-REVIEW.md`: obrigatório quando cruza serviços, dados ou
  mensageria.
- `VALIDATION.md`: evidências finais por critério.

O orquestrador lê primeiro `STATUS.md` e confirma seu conteúdo contra os demais
artefatos e o repositório. Se houver divergência, corrige o `STATUS.md` antes
de delegar (único arquivo que o orquestrador edita).

## Retomada de sessão

Em toda sessão nova ou continuação de uma feature:

1. Ler `docs/features/<feature>/STATUS.md`.
2. Confirmar o STATUS contra SPEC, PLAN, VALIDATION (se existir) e o
   repositório; existência de arquivo isolada não cumpre gate.
3. Executar a **Próxima ação** registrada no STATUS (ou corrigir o STATUS se
   estiver inconsistente e só então avançar).

O STATUS é a memória operacional entre chats. Relato no chat não substitui
esse estado versionado.

## Aprovação canônica

Gates de Spec e Plano só fecham com a frase literal no artefato correspondente
(`SPEC.md` / `PLAN.md`) e refletida no STATUS:

```text
Aprovado pelo usuário em YYYY-MM-DD
```

Confirmação só no chat, sem essa frase no artefato, **não** fecha o gate.

## Gates e aprovações

### 1. Spec

Definition of Ready:

- necessidade e pessoa usuária estão identificadas;
- fontes de produto, design e ADRs foram lidas.

Definition of Done:

- objetivo, fora de escopo, fluxo e regras estão explícitos;
- critérios `AC-*` são verificáveis;
- contratos afetados estão identificados;
- não existe decisão bloqueante aberta;
- o artefato contém `Aprovado pelo usuário em YYYY-MM-DD`.

### 2. Plano

Definition of Ready:

- `SPEC.md` está aprovada com a frase canônica;
- todos os `AC-*` estão estáveis.

Definition of Done:

- tarefas `T-*` mapeiam ACs, agente, arquivos, dependências, testes e evidência;
- preferir tarefas pequenas (um módulo ou responsabilidade estreita; comando
  de teste executável por T); sem teto fixo de arquivos;
- o plano declara `Superfície de UI: sim|não` com justificativa (ADR 0008);
- se superfície de UI = sim: existe tarefa `T-*` de E2E Playwright, matriz
  `AC → cenário E2E` cobrindo todo AC observável na UI, e comando
  `npx nx e2e web-e2e` (ou filtro equivalente) como evidência esperada;
- contratos, ownership, riscos e trade-offs estão definidos;
- `ARCHITECTURE-REVIEW.md` está aprovada quando aplicável;
- não existe decisão bloqueante aberta;
- o artefato contém `Aprovado pelo usuário em YYYY-MM-DD`.

### 3. Implementação e testes

Definition of Ready:

- plano aprovado com a frase canônica;
- branch `feature/<nome>` existente;
- tarefa delegada tem arquivos permitidos e dependências satisfeitas.

Definition of Done:

- todas as tarefas estão concluídas (ou reabertas tratadas — ver Retrabalho);
- cada `T-*` concluída com testes verdes foi commitada pelo orquestrador antes
  da próxima T (skill `git-workflow`);
- contratos e ADRs previstos estão versionados;
- docs tocadas pela mudança (contratos, README, `.env.example`, lessons quando
  houver aprendizado transferível) foram atualizadas na própria T;
- devs escreveram os testes próximos da mudança;
- `test-engineer` auditou os `AC-*`, completou lacunas e registrou resultados;
- se superfície de UI = sim: suíte Playwright da feature em `apps/web-e2e`
  está verde e o handoff registra **comando + resultado** (nunca inferência;
  existência do arquivo `.spec.ts` não conta como evidência);
- se superfície de UI = não: unitários/integração suficientes para os `AC-*`
  estão verdes e registrados;
- suíte proporcional ao risco está verde.

### 4. Validação

Definition of Ready:

- implementação e testes concluídos;
- `STATUS.md` não registra tarefa pendente (exceto as listadas como reabertas
  ainda em correção — nesse caso não delegar o validator);
- se superfície de UI = sim: o handoff do `test-engineer` já registra corrida
  Playwright; sem isso o orquestrador não delega o `feature-validator`.

Definition of Done:

- `VALIDATION.md` contém evidência para cada `AC-*`;
- se superfície de UI = sim: cada AC observável na UI cita cenário Playwright
  e a seção de comandos inclui `npx nx e2e web-e2e` (ou filtro) com resultado;
  evidência manual ou observação não substitui Playwright nesses ACs
  (ADR 0008) — ausência → **reprova**;
- se superfície de UI = não: evidência automatizada unitária/integração por AC;
- checklist de documentação do template de validação está completa;
- se Superfície de UI = sim: checklist de design do template está completa;
- contratos, ADRs, documentação e segurança transversal foram conferidos;
- não há pendência de comportamento, contrato ou arquitetura;
- `feature-validator` aprovou;
- o usuário decide push, PR e merge separadamente.

## Retrabalho

Quando `test-engineer` ou `feature-validator` reprova um ou mais `AC-*`:

1. O orquestrador atualiza o `STATUS.md`: lista **ACs reabertos** e **Tarefas
   reabertas** (a `T-*` original do PLAN ou uma T de correção já prevista);
   define a Próxima ação como re-delegar a correção.
2. Re-delega o agente da tarefa reaberta com escopo de arquivos do PLAN.
3. Após correção: reexecuta os testes/comandos do afetado; registra no handoff.
4. Se a reprova veio do validator: revalida só os ACs afetados (e transversais
   que dependam deles); demais ACs já aprovados permanecem, salvo regressão.
5. Commit da T de correção segue a regra de commit por T.

Não avançar de fase enquanto houver AC ou T reaberta pendente no STATUS.

## Regras anti-alucinação

Pare e pergunte ao usuário quando faltar decisão que altere comportamento,
contrato público, ownership de dados ou arquitetura. Não transforme hipótese em
requisito. Toda afirmação de conclusão deve apontar para arquivo, teste, comando
ou observação registrada.

Nunca avance apenas porque um arquivo existe. Verifique seu status, checklist,
aprovação canônica e consistência com o código. Em particular: nunca marque AC
de UI como aprovado só porque um spec Playwright existe; exige-se saída de
comando registrada no handoff e em `VALIDATION.md`.

## Delegação e paralelismo

O padrão é uma tarefa por vez. Preferir tarefas pequenas. No máximo duas
tarefas podem rodar em paralelo, e somente quando o `PLAN.md` mostrar:

- nenhuma dependência entre elas;
- conjuntos disjuntos de arquivos permitidos;
- contratos já aprovados;
- evidências que possam ser verificadas independentemente.

Tarefas que tocam o mesmo módulo ou contrato são sequenciais.

## Handoff obrigatório

Todo subagente encerra com:

```text
Tarefa: T-XX
Estado: concluída | bloqueada
Arquivos alterados: ...
ACs cobertos: ...
Testes executados: comando + resultado
Decisões registradas: IDs/links ou nenhuma
Pendências: ...
Próximo passo recomendado: ...
```

O handoff é copiado para `STATUS.md` (pelo subagente e/ou pelo orquestrador).
Um relato no chat não substitui esse estado versionado.

## Git e revisão

O fluxo de integração está em `.agents/skills/git-workflow/SKILL.md`.

- Após cada `T-*` com handoff `concluída` e testes da tarefa verdes, o
  `sdd-orchestrator` faz o commit Conventional Commits **sem** nova aprovação
  do usuário, antes de delegar a próxima T.
- Push, criação de PR e merge exigem aprovação explícita e separada do usuário.
- Após o PR, a review consultiva do `code-reviewer` (quando pedida) publica o
  parecer como comentário no PR via `gh` — não como arquivo no repositório.

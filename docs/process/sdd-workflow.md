# Fluxo SDD canônico

Este documento é a fonte de verdade do processo **Spec → Plano →
Implementação → Validação**. `AGENTS.md`, agentes e skills devem apontar para
ele, sem duplicar regras.

## Estado mínimo de uma feature

Cada feature usa `docs/features/<feature>/`:

- `STATUS.md`: fase, próximo passo, bloqueios e último handoff.
- `SPEC.md`: comportamento e critérios `AC-*` aprovados.
- `PLAN.md`: tarefas `T-*`, dependências, escopo de arquivos e testes.
- `ARCHITECTURE-REVIEW.md`: obrigatório quando cruza serviços, dados ou
  mensageria.
- `VALIDATION.md`: evidências finais por critério.

O orquestrador lê primeiro `STATUS.md` e confirma seu conteúdo contra os demais
artefatos e o repositório. Se houver divergência, corrige o estado antes de
delegar.

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
- o usuário aprovou explicitamente a spec.

### 2. Plano

Definition of Ready:

- `SPEC.md` está aprovada;
- todos os `AC-*` estão estáveis.

Definition of Done:

- tarefas `T-*` mapeiam ACs, agente, arquivos, dependências, testes e evidência;
- o plano declara `Superfície de UI: sim|não` com justificativa (ADR 0008);
- se superfície de UI = sim: existe tarefa `T-*` de E2E Playwright, matriz
  `AC → cenário E2E` cobrindo todo AC observável na UI, e comando
  `npx nx e2e web-e2e` (ou filtro equivalente) como evidência esperada;
- contratos, ownership, riscos e trade-offs estão definidos;
- `ARCHITECTURE-REVIEW.md` está aprovada quando aplicável;
- não existe decisão bloqueante aberta;
- o usuário aprovou explicitamente o plano.

### 3. Implementação e testes

Definition of Ready:

- plano aprovado;
- branch `feature/<nome>` existente;
- tarefa delegada tem arquivos permitidos e dependências satisfeitas.

Definition of Done:

- todas as tarefas estão concluídas;
- contratos e ADRs previstos estão versionados;
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
- `STATUS.md` não registra tarefa pendente;
- se superfície de UI = sim: o handoff do `test-engineer` já registra corrida
  Playwright; sem isso o orquestrador não delega o `feature-validator`.

Definition of Done:

- `VALIDATION.md` contém evidência para cada `AC-*`;
- se superfície de UI = sim: cada AC observável na UI cita cenário Playwright
  e a seção de comandos inclui `npx nx e2e web-e2e` (ou filtro) com resultado;
  evidência manual ou observação não substitui Playwright nesses ACs
  (ADR 0008) — ausência → **reprova**;
- se superfície de UI = não: evidência automatizada unitária/integração por AC;
- contratos, ADRs, documentação e segurança transversal foram conferidos;
- não há pendência de comportamento, contrato ou arquitetura;
- `feature-validator` aprovou;
- o usuário decide push, PR e merge separadamente.

## Regras anti-alucinação

Pare e pergunte ao usuário quando faltar decisão que altere comportamento,
contrato público, ownership de dados ou arquitetura. Não transforme hipótese em
requisito. Toda afirmação de conclusão deve apontar para arquivo, teste, comando
ou observação registrada.

Nunca avance apenas porque um arquivo existe. Verifique seu status, checklist,
aprovação e consistência com o código. Em particular: nunca marque AC de UI
como aprovado só porque um spec Playwright existe; exige-se saída de comando
registrada no handoff e em `VALIDATION.md`.

## Delegação e paralelismo

O padrão é uma tarefa por vez. No máximo duas tarefas podem rodar em paralelo,
e somente quando o `PLAN.md` mostrar:

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

O handoff é copiado para `STATUS.md`. Um relato no chat não substitui esse
estado versionado.

## Git e revisão

O fluxo de integração está em `.agents/skills/git-workflow/SKILL.md`. Commits
podem ser feitos por tarefa/coerência; gates são comprovados pelos artefatos
acima, não pela quantidade de commits. Push, criação de PR e merge exigem
aprovação explícita e separada do usuário.

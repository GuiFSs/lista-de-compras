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
- suíte proporcional ao risco está verde.

### 4. Validação

Definition of Ready:

- implementação e testes concluídos;
- `STATUS.md` não registra tarefa pendente.

Definition of Done:

- `VALIDATION.md` contém evidência para cada `AC-*`;
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
aprovação e consistência com o código.

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

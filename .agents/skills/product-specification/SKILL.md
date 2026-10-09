---
name: product-specification
description: Refine and document a Lista de Compras feature before implementation, including only decisions already confirmed with the user.
---

# Especificação de produto

Use esta skill quando uma feature de produto estiver sendo descoberta ou detalhada.

1. Leia `docs/process/sdd-workflow.md`, `docs/product/initial-scope.md`, o guia
   de design (`docs/design/GUIA-DESIGN.md`, incl. §4 Composição) e as ADRs
   relacionadas. Se a feature tiver UI, use a skill `ui-design` ao preencher
   Design e UX.
2. Crie `docs/features/<feature>/SPEC.md` e `STATUS.md` a partir dos templates.
   Registre objetivo, fora de escopo, fluxo, regras e critérios `AC-*`
   verificáveis. Em Design e UX: declare o **tipo de tela** e a **hierarquia
   do primeiro viewport** (não basta “seguir o guia”).
3. Diferencie fatos confirmados de decisões em aberto. Não preencha lacunas por conta própria.
4. Faça perguntas somente quando forem necessárias para tornar o comportamento implementável.
5. Se a resposta alterar uma decisão de arquitetura, crie ou atualize uma ADR; caso contrário, mantenha a decisão na especificação da feature.
6. Não aprove a spec com decisão bloqueante aberta. O gate só fecha com a frase
   canônica `Aprovado pelo usuário em YYYY-MM-DD` no `SPEC.md` e o handoff em
   `STATUS.md`.

Não use esta skill para implementar a feature nem para escolher tecnologias já decididas.

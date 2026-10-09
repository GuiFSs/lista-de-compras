# Especificação — <nome da feature>

**Status:** Rascunho | Pronta para aprovação | Aprovada
**Última atualização:** AAAA-MM-DD
**Aprovação do usuário:** pendente | `Aprovado pelo usuário em AAAA-MM-DD`

## Objetivo

<O que a feature resolve e para quem.>

## Fontes e rastreabilidade

- Escopo: <seção de `docs/product/initial-scope.md`>
- ADRs: <links ou "nenhuma">
- Design: `docs/design/GUIA-DESIGN.md`

## Fora de escopo

- <comportamentos explicitamente não incluídos>

## Fluxo principal

1. ...

## Regras de negócio

- **RN-01:** ...

## Estados relevantes

- Carregando / vazio / erro / sucesso (os 4 são obrigatórios — guia de design)

## Design e UX

- Padrões seguidos: `docs/design/GUIA-DESIGN.md`
- Componentes/tokens usados: <botões, campos, listas, sheets...>
- Comportamento mobile: <bottom nav, ações no polegar, etc.>

## Critérios de aceite

- [ ] **AC-01:** Dado <contexto>, quando <ação>, então <resultado observável>.
- [ ] **AC-02:** ...

## Contratos afetados

- HTTP: <método, path, request, response e erros; ou "nenhum">
- Eventos: <nome, versão, produtor, consumidores, payload e idempotência; ou "nenhum">

## Decisões em aberto

| ID | Questão | Tipo | Responsável | Estado |
| --- | --- | --- | --- | --- |
| D-01 | ... | bloqueante / não bloqueante | usuário / time | aberta / resolvida |

> Uma decisão bloqueante aberta impede a aprovação da spec e o início do plano.

## Gate da spec

- [ ] Objetivo, fluxo, regras e fora de escopo estão claros.
- [ ] Critérios `AC-*` são verificáveis e não prescrevem implementação.
- [ ] Contratos afetados estão identificados.
- [ ] Não há decisão bloqueante aberta.
- [ ] Artefato contém a frase canônica `Aprovado pelo usuário em YYYY-MM-DD`.

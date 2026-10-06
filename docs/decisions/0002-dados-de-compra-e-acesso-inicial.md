# ADR 0002 — Dados de compra e acesso inicial

**Status:** Aceita  
**Data:** 2026-10-06

## Decisões

- A credencial de acesso inicial usará nome de usuário e senha.
- Não haverá fluxo de cadastro na primeira versão.
- A credencial inicial será criada por seed no banco do serviço de autenticação para desenvolvimento local.
- A senha não deve ser persistida em texto puro nem incluída em arquivos versionados.
- A unidade do item será escolhida em um conjunto padronizado no front-end.
- As unidades iniciais são: `unidade`, `kg`, `g`, `L`, `ml`, `pacote` e `caixa`.
- A quantidade planejada e a quantidade efetivamente comprada podem divergir.
- Antes de concluir uma compra com quantidades divergentes, a pessoa deve receber um aviso e confirmar a operação.
- Todos os valores monetários serão em real brasileiro (R$).
- Preço por unidade é obrigatório para marcar um item como comprado.
- Quantidade efetivamente comprada e unidade também são obrigatórias para marcar um item como comprado.
- O mercado é obrigatório ao concluir uma compra.
- A data da compra começa com a data atual e pode ser alterada.
- A normalização do nome do item ignora maiúsculas e minúsculas, mas não trata nomes diferentes como sinônimos.
- Itens da lista ativa podem ser editados e excluídos.
- É possível concluir uma compra sem itens comprados; não haverá evento de preço nesse caso e os itens da lista permanecerão ativos.

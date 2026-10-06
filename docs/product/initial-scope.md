# Escopo inicial do produto

## Objetivo

Permitir que uma família mantenha uma lista de compras compartilhada e consulte o menor preço já pago por cada item.

## Pessoas usuárias

- O proprietário da conta e sua esposa.
- No início, ambos usarão o mesmo login.

## Lista de compras

- Existe uma única lista de compras ativa por vez.
- Um item é identificado pelo nome, sem diferenciar maiúsculas de minúsculas.
- Não é permitido adicionar o mesmo item duas vezes. O sistema deve perguntar se a pessoa quer somar a quantidade à do item existente.
- O nome é obrigatório.
- Quantidade, unidade e preço planejado são opcionais.
- A unidade deve ser escolhida em uma lista padronizada na interface; não haverá digitação livre de unidade. As opções iniciais são: `unidade`, `kg`, `g`, `L`, `ml`, `pacote` e `caixa`.
- Durante a compra, um item pode ser marcado como comprado.
- Para marcar um item como comprado, quantidade efetivamente comprada, unidade e preço por unidade são obrigatórios.
- A quantidade realmente comprada pode ser diferente da planejada. O sistema deve avisar a pessoa antes de confirmar essa diferença.
- Ao concluir a compra, somente os itens marcados como comprados são enviados ao histórico.
- Itens não comprados permanecem na lista para a próxima compra.
- É permitido concluir uma compra sem itens marcados como comprados; nesse caso, nenhum registro é enviado ao histórico e os itens permanecem na lista.
- Itens ainda presentes na lista ativa podem ser editados ou excluídos.

## Histórico de preços

- Um registro de compra contém mercado em texto livre, data, quantidade efetivamente comprada, unidade e preço por unidade.
- A comparação de itens no histórico não diferencia maiúsculas de minúsculas. Assim, `cebola`, `Cebola` e `CEBOLA` são o mesmo item; nomes diferentes, como `cebola branca`, permanecem itens distintos.
- A moeda é exclusivamente real brasileiro (R$).
- Para marcar um item como comprado, é obrigatório informar seu preço por unidade.
- O mercado é obrigatório ao concluir uma compra.
- A data da compra é preenchida inicialmente com a data atual, mas pode ser editada.
- A primeira consulta de histórico mostrará somente o menor preço já pago por item.
- O histórico terá uma tela para rever cada compra concluída, incluindo data, mercado e itens comprados.
- A consulta de menor preço permitirá pesquisar por nome de item e também listar todos os itens comprados com o menor preço de cada um.
- Evoluções como média, último preço, tendência e comparação entre mercados ficam fora do escopo inicial.

## Autenticação

- Há uma tela de login com nome de usuário e senha.
- Não haverá cadastro na primeira versão. Uma conta inicial será semeada no banco de autenticação para uso local.
- A autenticação usará JWT.
- O microserviço de autenticação será implementado no projeto.
- Segurança é um requisito, mesmo que o primeiro fluxo de autenticação seja básico. A senha semeada não poderá ser guardada em texto puro no código ou no banco.

## Plataformas e voz

- A interface será uma PWA instalável, mobile-first e também acessível em desktop.
- Entrada manual será incluída na base inicial.
- Entrada por voz, com envio de áudio e interpretação por Gemini, é essencial, mas será construída depois que a base estiver funcional.

# ADR 0012 — Gemini Vision para reconhecimento de nota fiscal

**Status:** Aceita
**Data:** 2026-10-29

## Contexto

- A feature `receipt-purchase` (`docs/features/receipt-purchase/SPEC.md`)
  precisa extrair mercado, data e linhas (nome, quantidade, unidade, preço
  por unidade) a partir de uma **foto** do cupom/nota do mercado.
- O escopo inicial do produto já prevê **Gemini** para entrada por voz
  (“depois da base”). A mesma família de API cobre **visão** (imagem → JSON).
- O usuário confirmou (2026-10-29): usar Gemini **se o tier for gratuito**;
  caso contrário, outra opção gratuita. A [Gemini Developer API](https://ai.google.dev/gemini-api/docs/pricing)
  oferece tier **Free** com input/output sem cobrança em modelos Flash
  (inclui imagem) — adequado ao uso familiar local, com rate limit.
- Domínio e casos de uso **não** podem depender do SDK Google (hexagonal /
  ADR 0001). A chave **não** pode ir à PWA nem ao git (AGENTS.md).

## Decisões

1. **Provedor:** Gemini Developer API (modelo Flash com visão disponível no
   free tier no momento da implementação — ex. `gemini-2.5-flash` ou
   sucessor Flash documentado no free tier). Configurável por env
   `SHOPPING_LIST_GEMINI_MODEL`.
2. **Onde vive a chamada:** adaptador no **`shopping-list-service`**
   (dono da lista e do apply). Porta de aplicação `ReceiptRecognizer`;
   implementação Gemini atrás da porta. Sem microserviço novo de IA nesta
   rodada (voz futura pode extrair a porta para lib/serviço compartilhado).
3. **Segredo:** `SHOPPING_LIST_GEMINI_API_KEY` (ou `GEMINI_API_KEY` alias)
   apenas em `.env` local / secrets de runtime; placeholder no
   `.env.example`; **nunca** no bundle da PWA.
4. **Imagem:** enviada pela PWA em multipart ao serviço; processada em
   memória e **descartada** após a resposta do reconhecedor (sem persistir
   arquivo nem blob no PostgreSQL).
5. **Saída estruturada:** o adaptador pede JSON alinhado ao contrato HTTP
   de recognize (mercado, data, lines). Unidades são normalizadas para
   `ITEM_UNITS`; valor não mapeável → `null` para revisão humana.
6. **Troca futura:** se o free tier deixar de existir ou a cota for
   insuficiente, substitui-se **somente** o adaptador (mesma porta), sem
   mudar domínio nem contratos da feature.

## Consequências

- A PWA nunca fala com Google; só com `/api/shopping-list/receipts/*`.
- Dependência operacional de rede + cota Gemini no recognize; falhas
  viram 502/503 com mensagem genérica à UI (lista intacta).
- Conteúdo enviado no free tier pode ser usado pela Google para melhorar
  produtos (política do tier Free) — aceitável para o uso local de estudo/
  família registrado na SPEC; se isso deixar de ser aceitável, troca de
  adaptador (decisão 6).
- Aprendizado: porta hexagonal + adaptador de IA sem contaminar o domínio.

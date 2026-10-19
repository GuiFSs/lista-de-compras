Tarefa: T-15
Estado: concluída

Arquivos alterados (todos dentro do escopo permitido — `features/shopping-list/data/**` + `state/**`):
- `apps/web/src/app/features/shopping-list/data/shopping-list-api.service.ts` (alterado: `checkout(request: CheckoutShoppingListRequest | null = null)` — POST tipado por `@lista/contracts`; sem argumento o corpo continua `null`, que é o aceito pelo backend quando há 0 comprados)
- `apps/web/src/app/features/shopping-list/state/shopping-list-store.ts` (alterado: `checkout(request?)` transporta o payload, aplica a lista devolvida e expõe o sinal novo `concluding`; single-flight preservado na chave `'checkout'` do `runMutation`/`singleFlight` existentes)
- `apps/web/src/app/features/shopping-list/state/shopping-list-store.spec.ts` (alterado: o teste antigo de checkout virou um `describe` com 6 specs — payload do contrato, RN-09 sem comprados, single-flight, 400 de mercado, 400 de data futura e falha preservando o digitado)
- Nada em `core/shopping-list/**` (nenhuma mudança era necessária: base URL `http://localhost:3000` e rota `/api/shopping-list/checkout` não mudaram) e nada fora do escopo permitido.

ACs cobertos (camada de dados — a exibição é T-17/T-22):
- **AC-03/AC-04 (transporte):** o corpo do POST é exatamente `{ market, purchaseDate }` do contrato (spec com `toEqual` de literal, não de constante do teste); o 400 do serviço chega como mensagem do envelope **pronta para exibição** — `"Mercado é obrigatório"` e `"Data da compra não pode ser futura"` conferidos literalmente, via `mutationError` e via `message` do outcome, sem tradução nem prefixo no cliente.
- **AC-05 (camada):** falha **não descarta o digitado** — o spec congela o payload (`Object.freeze`) e prova que a camada não reescreve nem limpa o objeto do formulário, e que a nova tentativa reenvia exatamente o mesmo payload; a lista **não** remove itens "no fantasma" (400 → nenhuma releitura; queda de rede → releitura best-effort do serviço, sem inventar estado).
- **AC-07/RN-09:** com 0 comprados o corpo é omitido (`null`) e a lista volta como estava (spec carrega a lista, faz o checkout sem argumento e compara a lista aplicada com a de entrada). Confirmado no código da T-13 que o backend aceita essa forma: `readCheckoutInput` devolve `{ market: undefined, purchaseDate: undefined }` e `planPurchaseCompletion` só valida mercado/data quando há ≥1 comprado (`removed.length === 0` → `no-purchased-items`).
- **AC-20:** single-flight — dois toques no CTA compartilham **1 requisição** (`http.expectNone` após o flush, ambos os `await` resolvendo `{ kind: 'ok' }`) e o sinal `concluding` fica `true` durante a chamada e volta a `false` no fim, inclusive em falha.
- **AC-15:** mensagem visível + digitado preservado + nova tentativa possível estão na camada (estado exposto); o sheet aberto/toast é da T-17.
- **AC-18/AC-21 (não regridem):** o POST segue em `http://localhost:3000/api/shopping-list/checkout`, com `Authorization` anexado pelo interceptor de auth (URL `localhost`) — mesmo caminho dos demais métodos; nenhuma base nova foi criada nesta T.

Testes executados (comando + resultado):
- `npx nx test web --skip-nx-cache` → **23 arquivos, 232/232 testes verdes**. Delta da T-15: 225 → 230 (+5: 1 teste antigo de checkout virou 6). Os +2 restantes no momento da execução vêm de outra tarefa em paralelo no mesmo worktree (`layout/bottom-nav`, T-16 — arquivos que não toquei); `git status` mostra as duas frentes separadas por arquivo.
- `npx nx lint web --skip-nx-cache` → **All files pass linting** (0 problemas; nenhum `any`).
- `npx nx build web --skip-nx-cache` → **verde** (`Application bundle generation complete`, bundle + lazy chunks gerados).

Decisoes registradas:
- **"Sucesso recarrega a lista" = aplicar a resposta do POST**, sem GET extra: o contrato da T-13 devolve a lista ativa completa (com ou sem comprados) e o store nunca recombina estado (RN-19) — um refetch seria uma segunda ida à rede pelo mesmo dado. O spec fixa isso com `http.expectNone(BASE_URL)`. (Para quem vem de React: é um `setState(listaDaResposta)` depois do `await` do submit; o "estado novo" já chegou no retorno do próprio POST.)
- **O payload atravessa a camada sem transformação (sem `trim` no cliente):** o serviço trimma o mercado (`validateCheckoutInput`) e a camada não reescreve o digitado — se o cliente normalizasse, o "preservado" do AC-05 deixaria de ser o que a pessoa vê no campo.
- **`concluding` é um sinal dedicado** (em vez de reusar `saving()`): `saving` é o contador de mutações (marcar comprado, excluir, editar…), então o rótulo `Concluindo…` (T-17) só pode refletir conclusão; o single-flight continua na chave `'checkout'`, sem novo mecanismo. (Angular: `signal` privado + `asReadonly()` exposto é o equivalente a `useState` cujo setter fica encapsulado no serviço; `computed` = `useMemo` — por isso `saving` é `computed` e `concluding` é `signal`.)
- **400 devolve a mensagem canônica do envelope** (`apiErrorMessage` reusado de `data/api-error.ts`) sem mapear código → campo: a validação local por campo é da T-17; aqui a mensagem chega pronta para o toast/área do formulário.
- **Queda de rede na conclusão = releitura best-effort** (padrão AC-23 já existente): o "fantasma" que o AC-05 proíbe é tirar item da lista sem confirmação; reler o serviço apenas espelha o estado real.
- **Domínio/contrato intocados:** nenhuma dependência nova, `libs/contracts` e backend não foram tocados; nenhum ADR novo (decisões são de camada de dados, dentro do contrato já aprovado na T-02).
- **Sem spec próprio do serviço HTTP:** no shopping-list o wire é provado pelos specs do store (o único `*.spec.ts` do projeto que testa HTTP direto é o do `core/price-history`, criado na T-14). Criar `data/shopping-list-api.service.spec.ts` só para o checkout duplicaria as mesmas 3 asserções; se a T-21 (auditoria web) quiser separar, é barato.

Nota de composição (para T-17 — esta T não toca template/estilo, então `ui-design` não foi aplicada aqui):
- O sheet é "formulário de app em bottom sheet": título + resumo (quantos saem/permanecem) + campos **Mercado\*** e **Data\*** agrupados por whitespace + CTA `primary` no terço inferior, com cancelar visível; sem campos quando `purchasedCount() === 0` (RN-09).
- Estados de botão: `concluding()` → rótulo `Concluindo…` e `disabled`; a mensagem do 400 entra no mesmo lugar da validação local do campo (marca/apoio), com o digitado intacto — o erro mora no campo/área de conteúdo ou no toast, nunca só no console (RN-13).

Pendencias:
- `apps/web/src/app/features/shopping-list/checkout-sheet.ts` (arquivo da T-17) ainda chama `store.checkout()` **sem payload** — compila e passa (o parâmetro é opcional), mas é a T-17 que adiciona Mercado/Data, passa `{ market, purchaseDate }` e troca `store.saving()` por `store.concluding()` no rótulo de progresso; o spec `checkout-sheet.spec.ts` ("não pede mercado nem data", AC-21) também é da T-17 atualizar.
- Nenhuma pendência de comportamento, contrato ou arquitetura dentro do escopo. `STATUS.md` não foi editado (é do orquestrador) e nenhum comando git foi executado.

Próximo passo recomendado: onda 9 — **T-17** (checkout sheet: campos Mercado/Data, validação local, `{ market, purchaseDate }` no `store.checkout(...)`, rótulo via `concluding`, sem campos com 0 comprados), com T-16 já concluída; depois T-18/T-19 (telas) e T-22 (E2E Playwright do checkout: "confirmar com mercado/data válidos", "duplo toque → 1 requisição", "falha preserva o digitado").

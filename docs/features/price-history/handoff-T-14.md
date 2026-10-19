Tarefa: T-14
Estado: concluída

Arquivos alterados (todos novos, dentro do escopo permitido):
- apps/web/src/app/core/price-history/price-history-config.ts (novo: `DEFAULT_PRICE_HISTORY_API_BASE_URL = 'http://localhost:3002'` — ADR 0010; `PRICE_HISTORY_API_PATH = '/api/price-history'`; token injetável `PRICE_HISTORY_API_BASE_URL` com factory, nome igual ao da ADR 0010 §3; helper `priceHistoryUrl()` — espelho do padrão de `core/shopping-list`)
- apps/web/src/app/core/price-history/price-history-api.service.ts (novo: `listPurchases()` → `GET /api/price-history/purchases`, `getPurchase(id)` → `GET .../purchases/{id}`, `getLowestPrices(q?)` → `GET .../lowest-prices` com `HttpParams` `q` só quando a busca não é vazia; `Authorization`/401 ficam com o `authInterceptor` existente)
- apps/web/src/app/core/price-history/price-history-api.service.spec.ts (novo: URL literal `http://localhost:3002/api/price-history/*` + `Authorization: Bearer`; sem sessão = sem header; 401 → logout + `/login` com returnUrl; token de base sobrescrevível)
- apps/web/src/app/core/price-history/index.ts (novo: barrel config + serviço)
- apps/web/src/app/features/price-history/data/index.ts (novo: superfície de dados da feature — re-exporta `PriceHistoryApiService` para o store/telas dependerem só de `features/price-history/data`)
- apps/web/src/app/features/price-history/state/price-history-store.ts (novo: store signals com 3 seções em estado composto `{status, data, error}` — `purchases`, `detail` (+`selectedId`), `lowestPrices` (+`query`); `loadPurchases()`, `loadPurchase(id?)`, `loadLowestPrices(query?)`, `clearPurchase()`; guarda de sequência por seção = última carga vence)
- apps/web/src/app/features/price-history/state/price-history-store.spec.ts (novo: 13 specs de estados/refetch/pass-through)
- apps/web/src/app/features/price-history/state/index.ts (novo: barrel do store + tipos)

ACs cobertos:
- AC-21 (camada de dados): spec prova URL exata `http://localhost:3002/api/price-history/*` (base literal, não montada pelo teste) e header `Authorization` anexado pelo interceptor (URL contém `localhost`); base configurável via token (critério de saída §3 da ADR 0010).
- AC-18: spec de integração do serviço com `authInterceptor` + `Router`: 401 do histórico → `session.logout()` (storage limpo) + `router.navigate(['/login'], { returnUrl })`. No store, 401 vira erro de carga reemitido — mesmo comportamento do store da lista (sem redirect próprio).
- AC-14: specs do store — falha (500/rede/404) → `status 'error'` + mensagem do envelope; nova chamada do mesmo `load*` refaz o GET (lista; detalhe sem argumento refaz o id selecionado; menores preços sem termo refaz a MESMA query).
- AC-12/AC-13 (camada): estado inicial `loading` antes da primeira resposta (base do skeleton); resposta vazia chega como `loaded` com `data: []` (distinto de loading/erro — a tela escolhe o empty state).
- AC-06/AC-11: lista e detalhe aplicam o payload do serviço sem reordenar nem recontar (data/mercado/itemCount/itens idênticos ao contrato).
- AC-08/AC-09/AC-10: consumo puro da API — agregação/menor preço/nome de exibição passam adiante idênticos (`lowestUnitPrice` chega pronto, ex. 7,5); busca vai como query `q` ao serviço (nenhum filtro/normalização no cliente).
- AC-01/AC-02: **não observáveis nesta T** (nav/rotas são T-16; telas T-18/T-19) — aqui fica pronta a camada de dados que elas consomem.

Testes executados:
- `npx nx test web --skip-nx-cache` → 23 arquivos, 225 testes, 0 falhas (21 arquivos pré-existentes + os 2 novos; 20 testes novos: 7 no spec do serviço, 13 no spec do store)
- `npx nx lint web --skip-nx-cache` → All files pass linting (0 problemas; nenhum `any`)
- `npx nx build web --skip-nx-cache` → verde (`contracts:build` + `web:build:production`, bundle gerado, 352.55 kB iniciais)

Decisoes registradas:
- `PRICE_HISTORY_API_BASE_URL` é **token injetável com factory** (padrão do projeto espelhado de `SHOPPING_LIST_API_BASE_URL`) e o literal `DEFAULT_PRICE_HISTORY_API_BASE_URL = 'http://localhost:3002'` num constante própria — a ADR 0010 §3 fala em "`PRICE_HISTORY_API_BASE_URL` sai da configuração da PWA" na migração para o gateway; o nome foi mantido igual para achar o ponto de saída.
- Serviço HTTP em `core/price-history/` (literal do item 2 da delegação) com a feature consumindo via barrel `features/price-history/data` — mantém o import `from '../data'` idêntico ao do store da lista e concentra a superfície de dados da feature numa pasta.
- Store único (`providedIn: 'root'`) com três seções em **estado composto** `{status, data, error}` (+ `selectedId` no detalhe, + `query` em menores preços): snapshot atômico por seção, sem set de 3 sinais dessincronizados; `data` preservado durante reload da lista (mesmo comportamento do `ShoppingListStore`), detalhe sempre parte do zero.
- `loadPurchase()` e `loadLowestPrices()` **sem argumento repetem a última seleção/busca** — é o refetch do AC-14; `''` explícita em `query` volta à lista completa.
- Guarda de sequência por seção (última carga vence) em vez de `singleFlight` da lista: busca enquanto digita gera cargas sobrepostas com URLs diferentes e a resposta antiga não pode sobrescrever a nova (spec "com buscas sobrepostas, a última resposta vence").
- Sem lógica de domínio no cliente: ordenação, normalização, agregação de menor preço e filtro de busca são do `price-history-service` (RN-06…RN-08) — o store só aplica `response.purchases` / `response.items` (specs com `toEqual` idêntico ao contrato).
- Reuso de `apiErrorMessage` via import de `features/shopping-list/data` (helper genérico de envelope `{statusCode, message}`): duplicar o mapeamento ou movê-lo para `core/http` ficaria fora do escopo de arquivos da T — candidato a extração se o usuário pedir.

Pendencias:
- Nenhuma dentro do escopo da T-14. Não toquei `STATUS.md`, `app.routes.ts`, `layout/`, checkout sheet, `libs/contracts` nem backend (conforme delegação); commit fica com o orquestrador.
- `features/price-history/data/` contém só o barrel — o serviço mora em `core/price-history/` (item 2 da delegação); se o orquestrador preferir o espelho exato do shopping-list (serviço em `data/`), é mover 1 arquivo + ajustar 2 imports.
- Composição para as telas (T-18/T-19 — sem superfície visual nesta T, `ui-design` não se aplica): `status === 'loading'` → skeleton no formato do conteúdo; `status === 'error'` → erro visível + "Tentar novamente" chamando o mesmo `load*`; `status === 'loaded'` com `data` vazio → empty state rico (AC-12); `lowestPrices().query` espelha a busca ativa para a tela reexibir o termo.

Proximo passo recomendado: onda 8 do PLAN — T-15 (API/store do checkout) ∥ T-16 (bottom nav + rotas); depois T-17, e T-18/T-19 (telas Histórico e Menor preço) que consomem este store.

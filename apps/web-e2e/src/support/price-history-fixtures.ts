// Dados das jornadas de Histórico/Menor preço (PLAN T-22/T-16). Os valores seguem
// o contrato HTTP já agregado/agrupado pelo serviço: aqui não há cálculo de
// domínio — o agrupamento por mercado (mercados A→Z, itens A→Z), a ordenação do
// histórico (mais recente primeiro) e o menor preço já resolvido vêm prontos
// (RN-05/RN-12). O fake só filtra a busca, como o serviço (RN-10).
import type {
  SeedLowestPriceByItem,
  SeedLowestPrice,
  SeedPurchase,
  SeedPurchaseItem,
} from './price-history-fake-api';
import type { LowestPriceMarketGroup } from '@lista/contracts';

/**
 * Dois registros de café com preços diferentes. A agregação (dois → o menor) é
 * do serviço (RN-02/RN-12) e tem prova unitária; a jornada prova que a tela
 * exibe o **menor** (`CafePrices.lowest`) e não o outro.
 */
export const CAFE_PRICES = { highest: 10, lowest: 7.5 } as const;

const MARKET_CENTRAL_ITEMS: readonly SeedPurchaseItem[] = [
  { name: 'Arroz', quantity: 2, unit: 'unidade', unitPrice: 25.9 },
  { name: 'Feijão', quantity: 1, unit: 'pacote', unitPrice: 8.4 },
];

/**
 * Compras concluídas na ordem do serviço: a mais recente primeiro (RN-08). As
 * datas são fixas para a asserção de exibição (`DD/MM/AAAA`) ser determinística.
 */
export const PURCHASES: readonly SeedPurchase[] = [
  {
    id: 'compra-2',
    market: 'Mercado Central',
    purchaseDate: '2026-10-17',
    items: MARKET_CENTRAL_ITEMS,
    createdAt: '2026-10-17T18:30:00.000Z',
  },
  {
    id: 'compra-1',
    market: 'Feira do bairro',
    purchaseDate: '2026-10-10',
    items: [{ name: 'Café', quantity: 1, unit: 'pacote', unitPrice: CAFE_PRICES.lowest }],
    createdAt: '2026-10-10T12:05:00.000Z',
  },
];

/**
 * Menores preços agrupados por mercado, na ordem do serviço (RN-05): mercados
 * A→Z (`Feira do bairro` antes de `Mercado Central`) e itens A→Z por
 * `nameNormalized` dentro do grupo. O café vale `CAFE_PRICES.lowest` porque é o
 * **menor** dos dois registros (AC-03).
 */
export const LOWEST_PRICES: readonly LowestPriceMarketGroup[] = [
  {
    market: 'Feira do bairro',
    items: [
      {
        name: 'Café',
        nameNormalized: 'cafe',
        lowestUnitPrice: CAFE_PRICES.lowest,
        market: 'Feira do bairro',
        purchaseDate: '2026-10-10',
        quantity: 1,
        unit: 'pacote',
      },
    ],
  },
  {
    market: 'Mercado Central',
    items: [
      {
        name: 'Arroz',
        nameNormalized: 'arroz',
        lowestUnitPrice: 25.9,
        market: 'Mercado Central',
        purchaseDate: '2026-10-17',
        quantity: 2,
        unit: 'unidade',
      },
    ],
  },
];

/** Uma compra recém-concluída na lista, pronta para simular o consumo (AC-06). */
export function completedPurchase(
  id: string,
  market: string,
  purchaseDate: string,
): SeedPurchase {
  return {
    id,
    market,
    purchaseDate,
    items: [{ name: 'Leite', quantity: 1, unit: 'L', unitPrice: 6.5 }],
    createdAt: `${purchaseDate}T20:00:00.000Z`,
  };
}

/**
 * Dois registros reais do **mesmo** café com grafias e preços diferentes
 * (AC-03/AC-09): `café` a R$ 10,00 e `cafe` a R$ 7,50. O serviço devolve um
 * único item agregado com o menor (`CAFE_LOWEST`); a jornada prova que a tela
 * exibe **R$ 7,50** e não o último/preço médio.
 */
export const TWO_CAFE_PURCHASES: readonly SeedPurchase[] = [
  {
    id: 'compra-cafe-baixa',
    market: 'Feira do bairro',
    purchaseDate: '2026-10-10',
    items: [{ name: 'cafe', quantity: 1, unit: 'pacote', unitPrice: CAFE_PRICES.lowest }],
    createdAt: '2026-10-10T12:05:00.000Z',
  },
  {
    id: 'compra-cafe-alta',
    market: 'Mercado Central',
    purchaseDate: '2026-09-28',
    items: [{ name: 'Café', quantity: 1, unit: 'pacote', unitPrice: CAFE_PRICES.highest }],
    createdAt: '2026-09-28T09:00:00.000Z',
  },
];

/**
 * Resposta do serviço para os dois registros de café acima: **um** único item
 * agregado no grupo do mercado vencedor (Feira do bairro), com os metadados da
 * compra de R$ 7,50 (AC-03).
 */
export const CAFE_LOWEST: readonly LowestPriceMarketGroup[] = [
  {
    market: 'Feira do bairro',
    items: [
      {
        name: 'Café',
        nameNormalized: 'cafe',
        lowestUnitPrice: CAFE_PRICES.lowest,
        market: 'Feira do bairro',
        purchaseDate: '2026-10-10',
        quantity: 1,
        unit: 'pacote',
      },
    ],
  },
];

/**
 * Empate de preço do mesmo item em datas distintas (AC-04): o serviço credita a
 * compra **mais recente**; a jornada prova que a linha mostra o mercado/data da
 * compra de 17/10 e não a de 01/10, e que a recarga repete o mesmo resultado.
 */
export const EMPATE_LOWEST: readonly LowestPriceMarketGroup[] = [
  {
    market: 'Mercado Central',
    items: [
      {
        name: 'Tomate',
        nameNormalized: 'tomate',
        lowestUnitPrice: 4.99,
        market: 'Mercado Central',
        purchaseDate: '2026-10-17',
        quantity: 3,
        unit: 'kg',
      },
    ],
  },
];

/**
 * Lista mínima e **group-ordered** usada nas jornadas de busca: `cafe` no grupo
 * A→Z inicial (`Feira do bairro`) e `arroz` no seguinte (`Mercado Central`),
 * de modo que filtrar por `cafe` mantém o agrupamento e remove o outro grupo.
 */
export const SEARCH_LOWEST: readonly LowestPriceMarketGroup[] = [
  {
    market: 'Feira do bairro',
    items: [
      {
        name: 'Café',
        nameNormalized: 'cafe',
        lowestUnitPrice: CAFE_PRICES.lowest,
        market: 'Feira do bairro',
        purchaseDate: '2026-10-10',
        quantity: 1,
        unit: 'pacote',
      },
    ],
  },
  {
    market: 'Mercado Central',
    items: [
      {
        name: 'Arroz',
        nameNormalized: 'arroz',
        lowestUnitPrice: 25.9,
        market: 'Mercado Central',
        purchaseDate: '2026-10-17',
        quantity: 2,
        unit: 'unidade',
      },
      {
        name: 'Tomate',
        nameNormalized: 'tomate',
        lowestUnitPrice: 9.9,
        market: 'Mercado Central',
        purchaseDate: '2026-10-17',
        quantity: 3,
        unit: 'kg',
      },
    ],
  },
];

/**
 * Drill-down do café em 3 mercados (RN-06), em ordem A→Z de mercado (AC-06).
 * A chave (no fake) é o `nameNormalized` — o fake normaliza o `{item}` decodificado
 * antes de procurar, como o serviço (R-1), então `/menor-preco/cafe` e
 * `/menor-preco/caf%C3%A9` resolvem a mesma entrada.
 */
export const CAFE_BY_MARKET: SeedLowestPriceByItem = {
  name: 'Café',
  nameNormalized: 'cafe',
  markets: [
    {
      market: 'Atacadão',
      lowestUnitPrice: 6.5,
      purchaseDate: '2026-10-01',
      quantity: 1,
      unit: 'pacote',
    },
    {
      market: 'Feira do bairro',
      lowestUnitPrice: 7.5,
      purchaseDate: '2026-10-10',
      quantity: 1,
      unit: 'pacote',
    },
    {
      market: 'Mercado Central',
      lowestUnitPrice: 9.2,
      purchaseDate: '2026-10-17',
      quantity: 2,
      unit: 'pacote',
    },
  ],
};

/**
 * Drill-down do tomate com **duas compras no mesmo mercado** (AC-07): a linha do
 * Mercado Central credita a compra de R$ 6,00 (a menor), não a de R$ 9,00.
 */
export const TOMATE_BY_MARKET: SeedLowestPriceByItem = {
  name: 'Tomate',
  nameNormalized: 'tomate',
  markets: [
    {
      market: 'Mercado Central',
      lowestUnitPrice: 6,
      purchaseDate: '2026-10-15',
      quantity: 2,
      unit: 'kg',
    },
  ],
};

/** Item presente em um único mercado (AC-08): a tela mostra uma linha só. */
export const ARROZ_BY_MARKET: SeedLowestPriceByItem = {
  name: 'Arroz',
  nameNormalized: 'arroz',
  markets: [
    {
      market: 'Mercado Central',
      lowestUnitPrice: 25.9,
      purchaseDate: '2026-10-17',
      quantity: 2,
      unit: 'unidade',
    },
  ],
};

/**
 * Item com `/` no nome (round-trip R-2). O `nameNormalized` é `leite/acucar`
 * (acentos removidos pela normalização — RN-02/RN-09), então o link da lista é
 * `encodeURIComponent(nameNormalized)` → `leite%2Facucar` (a barra vira `%2F`, um
 * único segmento). A URL com o **nome cru** (`leite%2Fa%C3%A7%C3%BAcar`) também
 * resolve, porque o serviço normaliza o parâmetro (R-1) — as duas provas ficam na
 * jornada.
 */
export const LEITE_ACUCAR_NAME_NORMALIZED = 'leite/acucar';
/** Nome cru do item (com acento e barra), como o serviço o recebe na borda. */
export const LEITE_ACUCAR_RAW_NAME = 'leite/açúcar';
/** Segmento gerado pelo link da lista: `encodeURIComponent(nameNormalized)`. */
export const LEITE_ACUCAR_URL_SEGMENT = encodeURIComponent(LEITE_ACUCAR_NAME_NORMALIZED);
/** Segmento de uma URL digitada/antiga com o nome cru percent-encoded (R-2). */
export const LEITE_ACUCAR_RAW_URL_SEGMENT = encodeURIComponent(LEITE_ACUCAR_RAW_NAME);

export const LEITE_ACUCAR_BY_MARKET: SeedLowestPriceByItem = {
  name: 'Leite/Açúcar',
  nameNormalized: LEITE_ACUCAR_NAME_NORMALIZED,
  markets: [
    {
      market: 'Mercado Central',
      lowestUnitPrice: 5.4,
      purchaseDate: '2026-10-12',
      quantity: 1,
      unit: 'pacote',
    },
  ],
};

/** Linha de lista para o item com `/` (prova o link percent-encoded — R-2). */
export const LEITE_ACUCAR_LOWEST: readonly LowestPriceMarketGroup[] = [
  {
    market: 'Mercado Central',
    items: [
      {
        name: 'Leite/Açúcar',
        nameNormalized: LEITE_ACUCAR_NAME_NORMALIZED,
        lowestUnitPrice: 5.4,
        market: 'Mercado Central',
        purchaseDate: '2026-10-12',
        quantity: 1,
        unit: 'pacote',
      },
    ],
  },
];

/** Aliases nomeados que as jornadas novas importam sem repetir literais. */
export type { SeedLowestPrice, SeedLowestPriceByItem };

/**
 * Parâmetro `{item}` **decodificado** de `Café` — o que o roteador da PWA entrega
 * ao store depois de decodificar `/menor-preco/cafe` (o `nameNormalized` real) ou
 * `/menor-preco/caf%C3%A9` (nome cru). É a chave com que as jornadas semeiam o
 * drill-down no fake, que normaliza antes de buscar (R-1).
 */
export const CAFE_ITEM_PARAM = 'cafe';

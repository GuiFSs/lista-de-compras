// Dados das jornadas de Histórico/Menor preço (PLAN T-22). Os valores seguem o
// contrato HTTP já agregado pelo serviço: aqui não há cálculo de domínio — a
// ordenação é a do serviço (RN-08: mais recente primeiro; RN-07: nome
// normalizado asc) e o `lowestUnitPrice` é o mínimo já resolvido (RN-06).
import type {
  SeedLowestPrice,
  SeedPurchase,
  SeedPurchaseItem,
} from './price-history-fake-api';

/**
 * Dois registros de café com preços diferentes. A agregação (dois → o menor) é
 * do serviço (RN-06/RN-08) e tem prova unitária; a jornada prova que a tela
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
 * Menores preços na ordem do serviço (`nameNormalized` asc — RN-07). O café
 * vale `CAFE_PRICES.lowest` porque é o **menor** dos dois registros (AC-10).
 */
export const LOWEST_PRICES: readonly SeedLowestPrice[] = [
  { name: 'Arroz', nameNormalized: 'arroz', lowestUnitPrice: 25.9 },
  { name: 'Café', nameNormalized: 'cafe', lowestUnitPrice: CAFE_PRICES.lowest },
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
 * (AC-08/AC-10): `café` a R$ 10,00 e `cafe` a R$ 7,50. O serviço devolve um
 * único item agregado com o menor (`CafeLowest`); a jornada prova que a tela
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

/** Resposta do serviço para os dois registros de café acima (agregada, RN-06). */
export const CAFE_LOWEST: readonly SeedLowestPrice[] = [
  { name: 'Café', nameNormalized: 'cafe', lowestUnitPrice: CAFE_PRICES.lowest },
];

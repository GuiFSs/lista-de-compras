// Contrato do price-history-service servido em memória para as jornadas de UI
// (PLAN T-22/T-16): o E2E é hermético — nada de Docker, banco, broker ou JWT
// real. Os tipos vêm de `@lista/contracts` para a paridade com o serviço ser
// verificada pelo compilador, não por texto solto no teste.
import type { Page, Route } from '@playwright/test';
import {
  ItemUnit,
  LowestPriceByMarketLine,
  LowestPriceByMarketResponse,
  LowestPriceItem,
  LowestPriceMarketGroup,
  LowestPricesResponse,
  PurchaseDetailResponse,
  PurchaseListItem,
  PurchaseListResponse,
} from '@lista/contracts';

/** Prefixo do contrato consumido pela PWA (ADR 0010/0011). */
const API_PREFIX = '/api/price-history';

/**
 * Casa a base `/api/price-history` **e** todos os sub-caminhos
 * (`/purchases`, `/purchases/:id`, `/lowest-prices`, `/lowest-prices/:item`). Um
 * glob terminado no prefixo seria ancorado no fim da URL e deixaria as operações
 * sem interceptação.
 */
export const PRICE_HISTORY_ROUTE = /\/api\/price-history(?:\/|$)/;

/** Item de uma compra concluída (contrato `PurchaseItem`). */
export interface SeedPurchaseItem {
  name: string;
  quantity: number;
  unit: ItemUnit;
  /** Preço por unidade em R$ */
  unitPrice: number;
}

/**
 * Compra já persistida no histórico — ou seja, cujo evento de conclusão já foi
 * consumido (CD-06). O `id` é o `completionId` do checkout.
 */
export interface SeedPurchase {
  id: string;
  market: string;
  /** `YYYY-MM-DD` */
  purchaseDate: string;
  items: readonly SeedPurchaseItem[];
  /** ISO-8601; default = ordem de seed. */
  createdAt?: string;
}

/**
 * Compra vencedora de um item, como o serviço a devolve na linha da lista
 * principal (RN-02/RN-03/RN-04). O fake não recalcula nada: a agregação é do
 * serviço (RN-12) e tem prova unitária; aqui o resultado entra pronto.
 */
export type SeedLowestPrice = LowestPriceItem;

/** Resposta do drill-down: uma linha por mercado (RN-06/RN-12), já ordenada. */
export type SeedLowestPriceByItem = LowestPriceByMarketResponse;

export interface PriceHistoryFakeApiOptions {
  /** Já na ordem do serviço (mais recente primeiro — RN-08). */
  purchases?: readonly SeedPurchase[];
  /** Já agrupada e ordenada pelo serviço (RN-05): mercados A→Z, itens A→Z. */
  lowestPrices?: readonly LowestPriceMarketGroup[];
  /**
   * Drill-down por item, com a chave = o segmento `{item}` **decodificado**, do
   * mesmo jeito que ele chega após `decodeURIComponent` na borda. O `{item}` da
   * rota é `encodeURIComponent(nameNormalized)` (`caf%C3%A9`, `leite%2Fa%C3%A7%C3%BAcar`);
   * o fake decodifica o segmento antes de procurar aqui, como o Fastify faz
   * (round-trip R-2). Ex.: chave `'café'` para `/menor-preco/caf%C3%A9`.
   */
  lowestPricesByItem?: Readonly<Record<string, SeedLowestPriceByItem>>;
  /** Atraso por resposta (ms) — permite observar o skeleton (AC-13). */
  delayMs?: number;
  /** Já nasce respondendo 401 em tudo — jornada de sessão inválida (AC-18). */
  unauthorized?: boolean;
}

/** Requisição que chegou à API falsa, na ordem — prova do contrato (ADR 0010/0011). */
export interface RecordedRequest {
  method: string;
  /** URL completa — prova a base `http://localhost:3002` (AC-21). */
  url: string;
  path: string;
  authorization: string | null;
  /** Query `q` da busca dos menores preços (AC-09); `null` quando ausente. */
  query: string | null;
}

interface PendingFailure {
  method: string;
  pathSuffix: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Mesma normalização do serviço (RN-06/CD-05): trim + sem acentos + minúsculas. */
function normalizeName(name: string): string {
  return name
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function readQuery(route: Route): string | null {
  return new URL(route.request().url()).searchParams.get('q');
}

function toListItem(purchase: SeedPurchase): PurchaseListItem {
  return {
    id: purchase.id,
    market: purchase.market,
    purchaseDate: purchase.purchaseDate,
    itemCount: purchase.items.length,
    createdAt: purchase.createdAt ?? new Date(Date.UTC(2026, 0, 1, 12, 0)).toISOString(),
  };
}

function toDetail(purchase: SeedPurchase): PurchaseDetailResponse {
  return {
    id: purchase.id,
    market: purchase.market,
    purchaseDate: purchase.purchaseDate,
    items: purchase.items.map((item) => ({ ...item })),
    createdAt: purchase.createdAt ?? new Date(Date.UTC(2026, 0, 1, 12, 0)).toISOString(),
  };
}

/**
 * Serviço de histórico em memória. Exige `Authorization: Bearer` em toda
 * operação (o interceptor da PWA anexa o token — ADR 0007/0010/0011), devolve a
 * lista na ordem semeada (a ordenação é do serviço — RN-08) e **filtra** a busca
 * dos menores preços pela mesma normalização do serviço (RN-05/RN-10) sobre os
 * grupos recebidos, mantendo o agrupamento/ordenação como o serviço os entrega.
 */
export class PriceHistoryFakeApi {
  private readonly purchases: SeedPurchase[] = [];
  private readonly lowestPrices: LowestPriceMarketGroup[] = [];
  private readonly lowestPricesByItem: Record<string, SeedLowestPriceByItem> = {};
  private readonly recorded: RecordedRequest[] = [];
  private readonly failures: PendingFailure[] = [];
  private readonly delayMs: number;
  private loadFailure = false;
  private unauthorized = false;

  constructor(options: PriceHistoryFakeApiOptions = {}) {
    this.delayMs = options.delayMs ?? 0;
    this.unauthorized = options.unauthorized ?? false;
    this.purchases.push(...(options.purchases ?? []));
    this.lowestPrices.push(...(options.lowestPrices ?? []));
    Object.assign(this.lowestPricesByItem, options.lowestPricesByItem ?? {});
  }

  async mount(page: Page): Promise<void> {
    await page.route(PRICE_HISTORY_ROUTE, async (route) => {
      await this.handle(route);
    });
  }

  /** Requisições recebidas, na ordem. */
  requests(): readonly RecordedRequest[] {
    return [...this.recorded];
  }

  /** Quantas requisições do método casaram o sufixo de caminho ('' = todas). */
  countRequests(method: string, pathSuffix = ''): number {
    return this.recorded.filter(
      (request) => request.method === method && request.path.endsWith(pathSuffix),
    ).length;
  }

  /**
   * Simula o **consumo do evento**: a compra passa a existir no histórico
   * (AC-06/CD-06). O E2E é hermético, então o "consumo" é o fake ganhar a
   * compra — a prova de broker real fica na integração dos serviços (T-09).
   */
  addPurchase(purchase: SeedPurchase): void {
    this.purchases.push(purchase);
  }

  /**
   * Faz a próxima requisição que casar falhar como erro de rede (status 0 no
   * navegador): prova os caminhos de falha de AC-14/AC-15.
   */
  failNext(method: string, pathSuffix = ''): void {
    this.failures.push({ method, pathSuffix });
  }

  /** Enquanto ligado, toda leitura do histórico falha como erro de rede (AC-14). */
  setLoadFailure(fail: boolean): void {
    this.loadFailure = fail;
  }

  /** Enquanto ligado, toda operação responde 401 (AC-18). */
  setUnauthorized(fail: boolean): void {
    this.unauthorized = fail;
  }

  private shouldFail(method: string, path: string): boolean {
    if (this.loadFailure && method === 'GET') return true;

    const index = this.failures.findIndex(
      (failure) => failure.method === method && path.endsWith(failure.pathSuffix),
    );
    if (index === -1) return false;
    this.failures.splice(index, 1);
    return true;
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname;
    const authorization = request.headers()['authorization'] ?? null;

    this.recorded.push({
      method,
      url: request.url(),
      path,
      authorization,
      query: readQuery(route),
    });

    if (this.shouldFail(method, path)) {
      await route.abort('failed');
      return;
    }

    // Mesma ordem da borda do serviço: sessão ausente/inválida vira 401
    // uniforme antes de qualquer regra de negócio (ADR 0007).
    if (this.unauthorized || authorization === null || !authorization.startsWith('Bearer ')) {
      await this.fulfill(route, 401, { statusCode: 401, message: 'Não autorizado' });
      return;
    }

    // O router decodifica **por segmento** antes de chegar aqui; por isso o
    // `pathname` do navegador já traz a barra de `leite%2Fa%C3%A7%C3%BAcar`
    // decodificada como `leite/açúcar` (round-trip R-2).
    const rawSegments = path
      .slice(path.indexOf(API_PREFIX) + API_PREFIX.length)
      .split('/')
      .filter((segment) => segment !== '');
    const segments = rawSegments.map((segment) => decodeURIComponent(segment));

    const handled = await this.dispatch(route, method, segments);
    if (handled) return;

    await route.fallback();
  }

  /** Roteia as 4 operações do contrato; `false` = caminho desconhecido. */
  private async dispatch(route: Route, method: string, segments: string[]): Promise<boolean> {
    if (method === 'GET' && segments.length === 1 && segments[0] === 'purchases') {
      const body: PurchaseListResponse = {
        purchases: this.purchases.map((purchase) => toListItem(purchase)),
      };
      await this.fulfill(route, 200, body);
      return true;
    }

    if (method === 'GET' && segments.length === 2 && segments[0] === 'purchases') {
      const found = this.purchases.find((purchase) => purchase.id === segments[1]);
      if (found === undefined) {
        await this.fulfill(route, 404, { statusCode: 404, message: 'Compra não encontrada' });
        return true;
      }
      await this.fulfill(route, 200, toDetail(found));
      return true;
    }

    if (method === 'GET' && segments.length === 1 && segments[0] === 'lowest-prices') {
      await this.fulfill(route, 200, this.lowestPricesResponse(readQuery(route) ?? ''));
      return true;
    }

    // `lowest-prices/{item}` é sub-recurso: só casa com 2 segmentos (a rota
    // `?q=` acima fica em 1). O `{item}` chega aqui já decodificado e é
    // **normalizado** antes da busca, como o caso de uso do serviço faz (R-1):
    // `caf%C3%A9` → `café` → `cafe`, `leite%2Fa%C3%A7%C3%BAcar` → `leite/acucar`.
    if (method === 'GET' && segments.length === 2 && segments[0] === 'lowest-prices') {
      const item = normalizeName(segments[1]);
      const response = this.lowestPricesByItem[item];
      if (response === undefined) {
        await this.fulfill(route, 404, {
          statusCode: 404,
          message: 'Item não encontrado no histórico',
        });
        return true;
      }
      await this.fulfill(route, 200, cloneByItem(response));
      return true;
    }

    return false;
  }

  /**
   * Busca do serviço (RN-10): substring do termo normalizado no nome normalizado,
   * dentro de cada grupo, preservando a ordem recebida. Grupo sem item que casa
   * sai do resultado — o serviço só devolve grupos não vazios (CD-09).
   */
  private lowestPricesResponse(term: string): LowestPricesResponse {
    const normalizedTerm = normalizeName(term);
    const markets =
      normalizedTerm === ''
        ? this.lowestPrices
        : this.lowestPrices
            .map((group) => ({
              market: group.market,
              items: group.items.filter((item) =>
                item.nameNormalized.includes(normalizedTerm),
              ),
            }))
            .filter((group) => group.items.length > 0);
    return { markets: markets.map(cloneGroup) };
  }

  private async fulfill(route: Route, status: number, body: unknown): Promise<void> {
    if (this.delayMs > 0) await delay(this.delayMs);
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  }
}

function cloneGroup(group: LowestPriceMarketGroup): LowestPriceMarketGroup {
  return { market: group.market, items: group.items.map((item) => ({ ...item })) };
}

function cloneByItem(response: SeedLowestPriceByItem): LowestPriceByMarketResponse {
  return {
    name: response.name,
    nameNormalized: response.nameNormalized,
    markets: response.markets.map((line) => ({ ...line }) satisfies LowestPriceByMarketLine),
  };
}

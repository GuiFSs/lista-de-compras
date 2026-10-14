// Contrato da lista de compras servido em memória para as jornadas de UI
// (PLAN T-17): o E2E é hermético — nada de Docker, banco ou chaves. Os tipos
// vêm de `@lista/contracts` para a paridade com o serviço ser verificada pelo
// compilador, não por texto solto no teste.
import type { Page, Route } from '@playwright/test';
import {
  CreateShoppingListItemRequest,
  DuplicateItemErrorResponse,
  DuplicateResolution,
  ITEM_UNITS,
  ItemUnit,
  MarkItemPurchasedRequest,
  PurchasedDetails,
  ShoppingListItem,
  ShoppingListResponse,
  UpdateShoppingListItemRequest,
} from '@lista/contracts';

/** Prefixo do contrato consumido pela PWA (ADR 0009). */
const API_PREFIX = '/api/shopping-list';

/**
 * Casa a base `/api/shopping-list` **e** todos os sub-caminhos (`/items`,
 * `/items/:id/purchase`, `/checkout`…). Um glob terminado no prefixo seria
 * ancorado no fim da URL e deixaria as 7 operações sem interceptação.
 */
export const SHOPPING_LIST_ROUTE = /\/api\/shopping-list(?:\/|$)/;

/** Estado interno de um item da lista ativa. */
interface ItemRecord {
  id: string;
  name: string;
  nameNormalized: string;
  plannedQuantity: number | null;
  unit: ItemUnit | null;
  plannedPrice: number | null;
  purchasedQuantity: number | null;
  purchasedUnit: ItemUnit | null;
  unitPrice: number | null;
  purchasedAt: string | null;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Item pré-carregado no store em memória antes da primeira navegação. */
export interface SeedItem {
  name: string;
  plannedQuantity?: number | null;
  unit?: ItemUnit | null;
  plannedPrice?: number | null;
  /** Presente ⇒ o item já está comprado (segue na lista ativa). */
  purchased?: { quantity: number; unit: ItemUnit; unitPrice: number } | null;
}

export interface FakeApiOptions {
  seeds?: readonly SeedItem[];
  /** Atraso por resposta (ms) — permite observar estados transitórios (AC-02/AC-26). */
  delayMs?: number;
}

/** Requisição que chegou à API falsa, na ordem — prova do contrato (ADR 0009). */
export interface RecordedRequest {
  method: string;
  /** URL completa — prova que a PWA chama a base direta do serviço (ADR 0009). */
  url: string;
  path: string;
  authorization: string | null;
  body: unknown;
}

interface PendingFailure {
  method: string;
  pathSuffix: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Mesma normalização do serviço (RN-02): trim + sem acentos + minúsculas. */
function normalizeName(name: string): string {
  return name
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Lê o corpo JSON sem explodir quando a requisição não tem corpo. */
function readBody(route: Route): unknown {
  try {
    return route.request().postDataJSON() as unknown;
  } catch {
    return null;
  }
}

function seedToRecord(seed: SeedItem, index: number): ItemRecord {
  // Data base fixa: a ordem pendentes→comprados (AC-18) fica determinística.
  const createdAt = new Date(Date.UTC(2026, 0, 1, 12, 0, index)).toISOString();
  return {
    id: `seed-${index + 1}`,
    name: seed.name,
    nameNormalized: normalizeName(seed.name),
    plannedQuantity: seed.plannedQuantity ?? null,
    unit: seed.unit ?? null,
    plannedPrice: seed.plannedPrice ?? null,
    purchasedQuantity: seed.purchased?.quantity ?? null,
    purchasedUnit: seed.purchased?.unit ?? null,
    unitPrice: seed.purchased?.unitPrice ?? null,
    purchasedAt: seed.purchased ? createdAt : null,
    removedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

/** Resposta da lista ativa: pendentes primeiro, depois comprados (RN-18). */
function toResponse(items: readonly ItemRecord[]): ShoppingListResponse {
  const pending: ShoppingListItem[] = [];
  const purchased: ShoppingListItem[] = [];

  for (const item of items) {
    if (item.removedAt !== null) continue;

    if (item.purchasedAt !== null) {
      const purchasedDetails: PurchasedDetails = {
        quantity: item.purchasedQuantity ?? 0,
        unit: item.purchasedUnit ?? ITEM_UNITS[0],
        unitPrice: item.unitPrice ?? 0,
        purchasedAt: item.purchasedAt,
      };
      purchased.push({
        id: item.id,
        name: item.name,
        plannedQuantity: item.plannedQuantity,
        unit: item.unit,
        plannedPrice: item.plannedPrice,
        purchased: purchasedDetails,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
      continue;
    }

    pending.push({
      id: item.id,
      name: item.name,
      plannedQuantity: item.plannedQuantity,
      unit: item.unit,
      plannedPrice: item.plannedPrice,
      purchased: null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }

  pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  purchased.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { items: [...pending, ...purchased] };
}

/**
 * Serviço de lista em memória. Exige `Authorization: Bearer` em toda operação
 * (o interceptor da PWA anexa o token — ADR 0006/0009), devolve sempre a lista
 * ativa completa depois de mutar (RN-19) e mantém o estado entre recargas da
 * PWA (AC-24).
 */
export class ShoppingListFakeApi {
  private readonly items: ItemRecord[] = [];
  private readonly recorded: RecordedRequest[] = [];
  private readonly failures: PendingFailure[] = [];
  private readonly delayMs: number;
  private nextId = 1;
  private loadFailure = false;

  constructor(options: FakeApiOptions = {}) {
    this.delayMs = options.delayMs ?? 0;
    for (const [index, seed] of (options.seeds ?? []).entries()) {
      this.items.push(seedToRecord(seed, index));
    }
  }

  async mount(page: Page): Promise<void> {
    await page.route(SHOPPING_LIST_ROUTE, async (route) => {
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
   * Faz a próxima requisição que casar falhar como erro de rede (status 0 no
   * navegador): prova os caminhos de falha de AC-22/AC-23.
   */
  failNext(method: string, pathSuffix = ''): void {
    this.failures.push({ method, pathSuffix });
  }

  /** Enquanto ligado, toda leitura da lista falha como erro de rede (AC-22). */
  setLoadFailure(fail: boolean): void {
    this.loadFailure = fail;
  }

  private shouldFail(method: string, path: string): boolean {
    const isListRead = method === 'GET' && path.endsWith(API_PREFIX);
    if (this.loadFailure && isListRead) return true;

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
      body: readBody(route),
    });

    if (this.shouldFail(method, path)) {
      await route.abort('failed');
      return;
    }

    if (authorization === null || !authorization.startsWith('Bearer ')) {
      await this.fulfill(route, 401, { statusCode: 401, message: 'Não autorizado' });
      return;
    }

    const segments = path
      .slice(path.indexOf(API_PREFIX) + API_PREFIX.length)
      .split('/')
      .filter((segment) => segment !== '');

    try {
      const handled = await this.dispatch(route, method, segments);
      if (handled) return;
    } catch {
      await this.fulfill(route, 500, { statusCode: 500, message: 'Erro interno' });
      return;
    }

    await route.fallback();
  }

  /** Roteia as 8 operações do contrato; `false` = caminho desconhecido. */
  private async dispatch(route: Route, method: string, segments: string[]): Promise<boolean> {
    if (segments.length === 0) {
      if (method !== 'GET') return false;
      await this.fulfill(route, 200, toResponse(this.items));
      return true;
    }

    if (segments.length === 1 && segments[0] === 'items' && method === 'POST') {
      await this.create(route);
      return true;
    }

    if (segments.length === 1 && segments[0] === 'checkout' && method === 'POST') {
      await this.checkout(route);
      return true;
    }

    if (segments.length === 3 && segments[0] === 'items') {
      const id = segments[1];
      const action = segments[2];
      if (action === 'purchase' && (method === 'PUT' || method === 'DELETE')) {
        await this.purchase(route, method, id);
        return true;
      }
      if (action === 'restore' && method === 'POST') {
        await this.restore(route, id);
        return true;
      }
      return false;
    }

    if (segments.length === 2 && segments[0] === 'items') {
      const id = segments[1];
      if (method === 'PATCH') {
        await this.update(route, id);
        return true;
      }
      if (method === 'DELETE') {
        await this.remove(route, id);
        return true;
      }
      return false;
    }

    return false;
  }

  private async create(route: Route): Promise<void> {
    const body = readBody(route) as CreateShoppingListItemRequest;
    const name = (body.name ?? '').trim();
    if (name === '') {
      await this.fulfill(route, 400, {
        statusCode: 400,
        message: 'Nome do item é obrigatório',
      });
      return;
    }

    const existing = this.activeByName(normalizeName(name));
    const resolution: DuplicateResolution = body.duplicateResolution ?? 'reject';

    if (existing !== undefined) {
      // Criação com duplicata é fluxo (AC-07): soma quando a PWA confirma,
      // senão 409 canônico com `duplicateOf` — nunca um segundo item.
      if (resolution === 'sum-planned-quantity') {
        if (typeof body.plannedQuantity === 'number' && body.plannedQuantity > 0) {
          existing.plannedQuantity = (existing.plannedQuantity ?? 0) + body.plannedQuantity;
        }
        existing.updatedAt = nowIso();
        await this.fulfill(route, 200, toResponse(this.items));
        return;
      }
      await this.rejectDuplicate(route, existing);
      return;
    }

    const created: ItemRecord = {
      id: `item-${this.nextId++}`,
      name,
      nameNormalized: normalizeName(name),
      plannedQuantity: body.plannedQuantity ?? null,
      unit: body.unit ?? null,
      plannedPrice: body.plannedPrice ?? null,
      purchasedQuantity: null,
      purchasedUnit: null,
      unitPrice: null,
      purchasedAt: null,
      removedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.items.push(created);
    await this.fulfill(route, 201, toResponse(this.items));
  }

  private async update(route: Route, id: string): Promise<void> {
    const body = readBody(route) as UpdateShoppingListItemRequest;
    const found = this.activeById(id);
    if (found === undefined) {
      await this.notFound(route);
      return;
    }

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (name === '') {
        await this.fulfill(route, 400, {
          statusCode: 400,
          message: 'Nome do item é obrigatório',
        });
        return;
      }
      const collision = this.activeByName(normalizeName(name));
      // Na edição o 409 é terminal (CD-13): nada é somado e nada é aplicado.
      if (collision !== undefined && collision.id !== id) {
        await this.rejectDuplicate(route, collision);
        return;
      }
      found.name = name;
      found.nameNormalized = normalizeName(name);
    }
    if (body.plannedQuantity !== undefined) found.plannedQuantity = body.plannedQuantity;
    if (body.unit !== undefined) found.unit = body.unit;
    if (body.plannedPrice !== undefined) found.plannedPrice = body.plannedPrice;
    found.updatedAt = nowIso();

    await this.fulfill(route, 200, toResponse(this.items));
  }

  private async remove(route: Route, id: string): Promise<void> {
    const found = this.activeById(id);
    if (found !== undefined) {
      // Exclusão com Desfazer é soft delete (RN-08): a linha sai da lista ativa
      // e o nome fica livre para reuso.
      found.removedAt = nowIso();
      found.updatedAt = nowIso();
    }
    await this.fulfill(route, 200, toResponse(this.items));
  }

  private async restore(route: Route, id: string): Promise<void> {
    const found = this.items.find((item) => item.id === id);
    if (found === undefined) {
      await this.notFound(route);
      return;
    }
    const collision = this.activeByName(found.nameNormalized);
    if (collision !== undefined && collision.id !== id) {
      await this.rejectDuplicate(route, collision);
      return;
    }
    found.removedAt = null;
    found.updatedAt = nowIso();
    await this.fulfill(route, 200, toResponse(this.items));
  }

  private async purchase(route: Route, method: string, id: string): Promise<void> {
    const found = this.activeById(id);
    if (found === undefined) {
      await this.notFound(route);
      return;
    }

    if (method === 'DELETE') {
      found.purchasedQuantity = null;
      found.purchasedUnit = null;
      found.unitPrice = null;
      found.purchasedAt = null;
      found.updatedAt = nowIso();
      await this.fulfill(route, 200, toResponse(this.items));
      return;
    }

    const body = readBody(route) as MarkItemPurchasedRequest;
    if (
      typeof body.purchasedQuantity !== 'number' ||
      body.purchasedQuantity <= 0 ||
      !ITEM_UNITS.includes(body.unit) ||
      typeof body.unitPrice !== 'number' ||
      body.unitPrice < 0
    ) {
      await this.fulfill(route, 400, { statusCode: 400, message: 'Quantidade inválida' });
      return;
    }

    found.purchasedQuantity = body.purchasedQuantity;
    found.purchasedUnit = body.unit;
    found.unitPrice = body.unitPrice;
    found.purchasedAt = nowIso();
    found.updatedAt = nowIso();
    await this.fulfill(route, 200, toResponse(this.items));
  }

  private async checkout(route: Route): Promise<void> {
    const now = nowIso();
    // A conclusão remove **só** os comprados (AC-19); sem comprados, nada muda.
    for (const item of this.items) {
      if (item.removedAt === null && item.purchasedAt !== null) {
        item.removedAt = now;
        item.updatedAt = now;
      }
    }
    await this.fulfill(route, 200, toResponse(this.items));
  }

  private activeById(id: string): ItemRecord | undefined {
    return this.items.find((item) => item.id === id && item.removedAt === null);
  }

  private activeByName(nameNormalized: string): ItemRecord | undefined {
    return this.items.find(
      (item) => item.removedAt === null && item.nameNormalized === nameNormalized,
    );
  }

  private async notFound(route: Route): Promise<void> {
    await this.fulfill(route, 404, { statusCode: 404, message: 'Item não encontrado' });
  }

  private async rejectDuplicate(route: Route, existing: ItemRecord): Promise<void> {
    const body: DuplicateItemErrorResponse = {
      statusCode: 409,
      message: 'Já existe um item com esse nome',
      error: 'duplicate-item-name',
      duplicateOf: { id: existing.id, name: existing.name },
    };
    await this.fulfill(route, 409, body);
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

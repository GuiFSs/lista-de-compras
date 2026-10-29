import { ITEM_UNITS, type ItemUnit } from '@lista/contracts';
import type {
  ReceiptImageInput,
  ReceiptRecognizerResult,
  RecognizedReceiptDraft,
  RecognizedReceiptLineDraft,
} from '../../application/ports/receipt-recognizer.port';
import { ReceiptRecognizer } from '../../application/ports/receipt-recognizer.port';

const DEFAULT_MODEL = 'gemini-2.5-flash';

const UNIT_SET = new Set<string>(ITEM_UNITS);

const SYSTEM_PROMPT = `Você lê cupons fiscais / notas de supermercado do Brasil.
Responda APENAS com JSON válido (sem markdown) neste formato:
{"market":string|null,"purchaseDate":"YYYY-MM-DD"|null,"lines":[{"name":string|null,"quantity":number|null,"unit":string|null,"unitPrice":number|null,"lineTotal":number|null}]}
Regras:
- market: nome do estabelecimento se legível.
- purchaseDate: data da compra se legível; senão null.
- name: nome do produto legível (expanda abreviações comuns quando óbvio).
- quantity: quantidade comprada (>0).
- unit: somente um de: unidade, kg, g, L, ml, pacote, caixa. Se não souber, null.
- unitPrice: preço por unidade em reais (número). Se só houver total da linha e quantity, unitPrice = lineTotal/quantity.
- lineTotal: total da linha se apareceu; pode ser null.
- Ignore totais gerais, impostos e pagamentos que não sejam itens.
- Moeda é sempre R$.`;

export interface GeminiReceiptRecognizerOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Adaptador Gemini Vision (ADR 0012). Chave só via opções/env — nunca na PWA.
 */
export class GeminiReceiptRecognizer extends ReceiptRecognizer {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GeminiReceiptRecognizerOptions) {
    super();
    this.apiKey = options.apiKey.trim();
    this.model = (options.model ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async recognize(image: ReceiptImageInput): Promise<ReceiptRecognizerResult> {
    if (this.apiKey.length === 0) {
      return { ok: false, error: 'misconfigured' };
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(this.model)}:generateContent` +
      `?key=${encodeURIComponent(this.apiKey)}`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inline_data: {
                mime_type: image.mimeType,
                data: image.bytes.toString('base64'),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    };

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      return { ok: false, error: 'unavailable' };
    }

    if (!response.ok) {
      return { ok: false, error: 'unavailable' };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, error: 'unavailable' };
    }

    const text = extractText(payload);
    if (text === null) {
      return { ok: false, error: 'unreadable' };
    }

    try {
      const parsed: unknown = JSON.parse(stripCodeFence(text));
      return { ok: true, receipt: normalizeDraft(parsed) };
    } catch {
      return { ok: false, error: 'unreadable' };
    }
  }
}

function extractText(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const first = candidates[0];
  if (typeof first !== 'object' || first === null) return null;
  const content = (first as { content?: unknown }).content;
  if (typeof content !== 'object' || content === null) return null;
  const parts = (content as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return null;
  const texts: string[] = [];
  for (const part of parts) {
    if (typeof part === 'object' && part !== null) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === 'string') texts.push(text);
    }
  }
  const joined = texts.join('\n').trim();
  return joined.length > 0 ? joined : null;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  return match?.[1]?.trim() ?? trimmed;
}

function normalizeDraft(raw: unknown): RecognizedReceiptDraft {
  if (typeof raw !== 'object' || raw === null) {
    return { market: null, purchaseDate: null, lines: [] };
  }
  const obj = raw as Record<string, unknown>;
  const linesRaw = Array.isArray(obj['lines']) ? obj['lines'] : [];
  return {
    market: readOptionalString(obj['market']),
    purchaseDate: readOptionalDate(obj['purchaseDate']),
    lines: linesRaw.map(normalizeLine),
  };
}

function normalizeLine(raw: unknown): RecognizedReceiptLineDraft {
  if (typeof raw !== 'object' || raw === null) {
    return { name: null, quantity: null, unit: null, unitPrice: null };
  }
  const obj = raw as Record<string, unknown>;
  const quantity = readOptionalPositiveNumber(obj['quantity']);
  let unitPrice = readOptionalNonNegativeNumber(obj['unitPrice']);
  const lineTotal = readOptionalNonNegativeNumber(obj['lineTotal']);
  if (
    unitPrice === null &&
    lineTotal !== null &&
    quantity !== null &&
    quantity > 0
  ) {
    unitPrice = roundMoney(lineTotal / quantity);
  }
  return {
    name: readOptionalString(obj['name']),
    quantity,
    unit: readOptionalUnit(obj['unit']),
    unitPrice,
  };
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readOptionalDate(value: unknown): string | null {
  const text = readOptionalString(value);
  if (text === null) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function readOptionalPositiveNumber(value: unknown): number | null {
  const n = toFiniteNumber(value);
  return n !== null && n > 0 ? n : null;
}

function readOptionalNonNegativeNumber(value: unknown): number | null {
  const n = toFiniteNumber(value);
  return n !== null && n >= 0 ? n : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    if (normalized.length === 0) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readOptionalUnit(value: unknown): ItemUnit | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return UNIT_SET.has(trimmed) ? (trimmed as ItemUnit) : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

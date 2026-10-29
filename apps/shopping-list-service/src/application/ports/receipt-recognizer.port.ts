import type { ItemUnit } from '@lista/contracts';

/** Imagem da nota em memória — descartada após o recognize (RN-11). */
export interface ReceiptImageInput {
  bytes: Buffer;
  mimeType: string;
}

export interface RecognizedReceiptLineDraft {
  name: string | null;
  quantity: number | null;
  unit: ItemUnit | null;
  unitPrice: number | null;
}

export interface RecognizedReceiptDraft {
  market: string | null;
  purchaseDate: string | null;
  lines: RecognizedReceiptLineDraft[];
}

export type ReceiptRecognizerFailure =
  | 'unreadable'
  | 'unavailable'
  | 'misconfigured';

export type ReceiptRecognizerResult =
  | { ok: true; receipt: RecognizedReceiptDraft }
  | { ok: false; error: ReceiptRecognizerFailure };

/**
 * Porta de reconhecimento de nota (ADR 0012). Domínio/casos de uso não
 * conhecem Gemini — só esta interface.
 */
export abstract class ReceiptRecognizer {
  abstract recognize(image: ReceiptImageInput): Promise<ReceiptRecognizerResult>;
}

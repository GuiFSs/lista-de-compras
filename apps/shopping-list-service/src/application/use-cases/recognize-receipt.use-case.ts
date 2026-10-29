import {
  RECEIPT_IMAGE_MAX_BYTES,
  RECEIPT_IMAGE_MIME_TYPES,
  type RecognizeReceiptResponse,
} from '@lista/contracts';
import type { ReceiptRecognizer } from '../ports/receipt-recognizer.port';

export interface RecognizeReceiptCommand {
  bytes: Buffer;
  mimeType: string;
}

export type RecognizeReceiptError =
  | 'image-required'
  | 'image-type-invalid'
  | 'image-too-large'
  | 'recognizer-unreadable'
  | 'recognizer-unavailable'
  | 'recognizer-misconfigured';

export type RecognizeReceiptResult =
  | { ok: true; receipt: RecognizeReceiptResponse }
  | { ok: false; error: RecognizeReceiptError };

const ACCEPTED_MIME = new Set<string>(RECEIPT_IMAGE_MIME_TYPES);

export class RecognizeReceiptUseCase {
  constructor(private readonly recognizer: ReceiptRecognizer) {}

  async execute(
    command: RecognizeReceiptCommand,
  ): Promise<RecognizeReceiptResult> {
    if (!Buffer.isBuffer(command.bytes) || command.bytes.length === 0) {
      return { ok: false, error: 'image-required' };
    }
    if (command.bytes.length > RECEIPT_IMAGE_MAX_BYTES) {
      return { ok: false, error: 'image-too-large' };
    }
    const mime = command.mimeType.trim().toLowerCase();
    if (!ACCEPTED_MIME.has(mime)) {
      return { ok: false, error: 'image-type-invalid' };
    }

    const result = await this.recognizer.recognize({
      bytes: command.bytes,
      mimeType: mime,
    });
    if (!result.ok) {
      if (result.error === 'unreadable') {
        return { ok: false, error: 'recognizer-unreadable' };
      }
      if (result.error === 'misconfigured') {
        return { ok: false, error: 'recognizer-misconfigured' };
      }
      return { ok: false, error: 'recognizer-unavailable' };
    }

    return {
      ok: true,
      receipt: {
        market: result.receipt.market,
        purchaseDate: result.receipt.purchaseDate,
        lines: result.receipt.lines.map((line) => ({
          name: line.name,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
        })),
      },
    };
  }
}

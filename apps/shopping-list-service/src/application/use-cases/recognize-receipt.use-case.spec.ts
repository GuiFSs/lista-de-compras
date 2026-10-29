import type {
  ReceiptImageInput,
  ReceiptRecognizerResult,
} from '../ports/receipt-recognizer.port';
import { ReceiptRecognizer } from '../ports/receipt-recognizer.port';
import { RecognizeReceiptUseCase } from './recognize-receipt.use-case';

class FakeRecognizer extends ReceiptRecognizer {
  constructor(private readonly result: ReceiptRecognizerResult) {
    super();
  }

  async recognize(_image: ReceiptImageInput): Promise<ReceiptRecognizerResult> {
    return this.result;
  }
}

describe('RecognizeReceiptUseCase', () => {
  it('rejeita imagem ausente', async () => {
    const useCase = new RecognizeReceiptUseCase(
      new FakeRecognizer({
        ok: true,
        receipt: { market: null, purchaseDate: null, lines: [] },
      }),
    );
    const result = await useCase.execute({
      bytes: Buffer.alloc(0),
      mimeType: 'image/jpeg',
    });
    expect(result).toEqual({ ok: false, error: 'image-required' });
  });

  it('rejeita tipo inválido', async () => {
    const useCase = new RecognizeReceiptUseCase(
      new FakeRecognizer({
        ok: true,
        receipt: { market: null, purchaseDate: null, lines: [] },
      }),
    );
    const result = await useCase.execute({
      bytes: Buffer.from('x'),
      mimeType: 'application/pdf',
    });
    expect(result).toEqual({ ok: false, error: 'image-type-invalid' });
  });

  it('rejeita imagem grande demais (AC-12 defesa)', async () => {
    const useCase = new RecognizeReceiptUseCase(
      new FakeRecognizer({
        ok: true,
        receipt: { market: null, purchaseDate: null, lines: [] },
      }),
    );
    const result = await useCase.execute({
      bytes: Buffer.alloc(8 * 1024 * 1024 + 1),
      mimeType: 'image/jpeg',
    });
    expect(result).toEqual({ ok: false, error: 'image-too-large' });
  });

  it('propaga falha do reconhecedor sem alterar lista', async () => {
    const useCase = new RecognizeReceiptUseCase(
      new FakeRecognizer({ ok: false, error: 'unavailable' }),
    );
    const result = await useCase.execute({
      bytes: Buffer.from('img'),
      mimeType: 'image/png',
    });
    expect(result).toEqual({ ok: false, error: 'recognizer-unavailable' });
  });

  it('devolve o rascunho reconhecido', async () => {
    const useCase = new RecognizeReceiptUseCase(
      new FakeRecognizer({
        ok: true,
        receipt: {
          market: 'Mercado X',
          purchaseDate: '2026-10-28',
          lines: [
            {
              name: 'Arroz',
              quantity: 1,
              unit: 'kg',
              unitPrice: 4.5,
            },
          ],
        },
      }),
    );
    const result = await useCase.execute({
      bytes: Buffer.from('img'),
      mimeType: 'image/webp',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.receipt.market).toBe('Mercado X');
    expect(result.receipt.lines).toHaveLength(1);
  });
});

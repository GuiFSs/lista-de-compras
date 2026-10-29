import { GeminiReceiptRecognizer } from './gemini-receipt-recognizer';

describe('GeminiReceiptRecognizer', () => {
  it('misconfigured sem API key', async () => {
    const recognizer = new GeminiReceiptRecognizer({ apiKey: '' });
    const result = await recognizer.recognize({
      bytes: Buffer.from('x'),
      mimeType: 'image/jpeg',
    });
    expect(result).toEqual({ ok: false, error: 'misconfigured' });
  });

  it('parseia JSON do modelo e deriva unitPrice do total da linha', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      market: 'Extra',
                      purchaseDate: '2026-10-28',
                      lines: [
                        {
                          name: 'Banana',
                          quantity: 2,
                          unit: 'kg',
                          unitPrice: null,
                          lineTotal: 9.9,
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    const recognizer = new GeminiReceiptRecognizer({
      apiKey: 'test-key',
      fetchImpl,
    });
    const result = await recognizer.recognize({
      bytes: Buffer.from('img'),
      mimeType: 'image/png',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.receipt.market).toBe('Extra');
    expect(result.receipt.lines[0]?.unitPrice).toBe(4.95);
  });

  it('unavailable quando a API falha', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response('nope', { status: 503 });
    const recognizer = new GeminiReceiptRecognizer({
      apiKey: 'test-key',
      fetchImpl,
    });
    const result = await recognizer.recognize({
      bytes: Buffer.from('img'),
      mimeType: 'image/jpeg',
    });
    expect(result).toEqual({ ok: false, error: 'unavailable' });
  });
});

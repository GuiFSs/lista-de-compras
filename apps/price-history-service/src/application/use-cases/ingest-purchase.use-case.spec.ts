import { describe, expect, it } from 'vitest';
import { IngestPurchaseUseCase } from './ingest-purchase.use-case';
import { InMemoryPurchaseRepository } from './testing/in-memory-purchase-repository';
import { uuid } from './testing/purchase-fixtures';

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function validPayload() {
  return {
    completionId: uuid(1),
    market: '  Padaria Central  ',
    purchaseDate: '2026-10-10',
    items: [
      { name: ' Café ', quantity: 2, unit: 'kg', unitPrice: 19.9 },
      { name: 'Arroz', quantity: 1, unit: 'pacote', unitPrice: 8.5 },
    ],
  };
}

describe('IngestPurchaseUseCase (RN-02/RN-05/RN-11; AC-16)', () => {
  it('persiste a compra do payload válido com nome normalizado (RN-06)', async () => {
    const repository = new InMemoryPurchaseRepository();
    const useCase = new IngestPurchaseUseCase(repository);

    const result = await useCase.execute(validPayload());

    expect(result).toEqual({ ok: true, id: uuid(1), created: true });
    const stored = repository.stored(uuid(1));
    expect(stored).toMatchObject({
      id: uuid(1),
      market: 'Padaria Central',
      purchaseDate: '2026-10-10',
      items: [
        {
          name: 'Café',
          nameNormalized: 'cafe',
          quantity: 2,
          unit: 'kg',
          unitPrice: 19.9,
        },
        {
          name: 'Arroz',
          nameNormalized: 'arroz',
          quantity: 1,
          unit: 'pacote',
          unitPrice: 8.5,
        },
      ],
    });
    expect(stored?.createdAt).toMatch(ISO_8601);
  });

  it('payload inválido devolve o erro de validação e não grava nada', async () => {
    const repository = new InMemoryPurchaseRepository();
    const useCase = new IngestPurchaseUseCase(repository);

    const result = await useCase.execute({ ...validPayload(), market: '   ' });

    expect(result).toEqual({ ok: false, error: 'market-required' });
    expect(repository.count()).toBe(0);
  });

  it('recusa o payload pelo primeiro campo inválido, como o domínio (RN-05)', async () => {
    const repository = new InMemoryPurchaseRepository();
    const useCase = new IngestPurchaseUseCase(repository);

    await expect(
      useCase.execute({ ...validPayload(), completionId: 'não-uuid' }),
    ).resolves.toEqual({ ok: false, error: 'completion-id-invalid' });
    expect(repository.count()).toBe(0);
  });

  it('reentrega do mesmo completionId não cria segundo registro (AC-16)', async () => {
    const repository = new InMemoryPurchaseRepository();
    const useCase = new IngestPurchaseUseCase(repository);
    const payload = validPayload();

    const first = await useCase.execute(payload);
    const second = await useCase.execute({
      ...payload,
      market: 'Outro mercado',
    });

    expect(first).toEqual({ ok: true, id: uuid(1), created: true });
    expect(second).toEqual({ ok: true, id: uuid(1), created: false });
    expect(repository.count()).toBe(1);
    // A primeira entrega é a que fica: a reentrega não altera nem mercado nem itens.
    expect(repository.stored(uuid(1))?.market).toBe('Padaria Central');
    expect(repository.stored(uuid(1))?.items).toHaveLength(2);
  });

  it('falha do repositório propaga — a borda AMQP decide nack/requeue (T-09)', async () => {
    class FailingRepository extends InMemoryPurchaseRepository {
      override async insert(): Promise<boolean> {
        throw new Error('conexão perdida com o Postgres');
      }
    }
    const useCase = new IngestPurchaseUseCase(new FailingRepository());

    await expect(useCase.execute(validPayload())).rejects.toThrow(
      'conexão perdida com o Postgres',
    );
  });
});

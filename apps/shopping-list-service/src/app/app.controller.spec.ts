import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { signTestJwt } from '../test-fixtures/jwt-test-utils';

describe('AppModule (smoke do setup)', () => {
  it('resolve o DI do NestJS e responde via adaptador Fastify', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // A rota `/api` agora é protegida pelo guard global (AC-15/ADR 0007):
    // o smoke envia um JWT válido assinado com o par de teste (o mesmo que
    // o auth-service usaria em produção com as chaves do `.env`).
    const token = await signTestJwt();
    const response = await app.inject({
      method: 'GET',
      url: '/api',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: 'Hello API' });

    await app.close();
  });

  it('expõe o AppController como adaptador de entrada', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    const controller = moduleRef.get(AppController);
    expect(controller.getData()).toEqual({ message: 'Hello API' });
  });
});
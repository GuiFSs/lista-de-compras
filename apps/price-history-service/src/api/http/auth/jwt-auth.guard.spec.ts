import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../../../app/app.module';
import { Public } from './public.decorator';
import { signTestJwt } from '../../../test-fixtures/jwt-test-utils';

@Controller('public-test')
class PublicTestController {
  @Public()
  @Get()
  getPublic() {
    return { ok: true };
  }
}

const UNAUTHORIZED_BODY = { statusCode: 401, message: 'Não autorizado' };

describe('JwtAuthGuard (APP_GUARD global — ADR 0007)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [PublicTestController],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 uniforme com token ausente', async () => {
    const response = await app.inject({ method: 'GET', url: '/api' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual(UNAUTHORIZED_BODY);
  });

  it('401 uniforme com token inválido', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api',
      headers: { authorization: 'Bearer nao.eh.um.jwt' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual(UNAUTHORIZED_BODY);
  });

  it('401 uniforme com header Authorization malformado', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api',
      headers: { authorization: 'Basic abc123' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual(UNAUTHORIZED_BODY);
  });

  it('401 uniforme com token expirado', async () => {
    const expired = await signTestJwt({
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api',
      headers: { authorization: `Bearer ${expired}` },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual(UNAUTHORIZED_BODY);
  });

  it('401 uniforme com iss divergente', async () => {
    const token = await signTestJwt({ issuer: 'servico-malicioso' });
    const response = await app.inject({
      method: 'GET',
      url: '/api',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual(UNAUTHORIZED_BODY);
  });

  it('200 com JWT válido (mesma chave pública do auth)', async () => {
    const token = await signTestJwt();
    const response = await app.inject({
      method: 'GET',
      url: '/api',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: 'Hello API' });
  });

  it('rota @Public() ignora o guard', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/public-test',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});

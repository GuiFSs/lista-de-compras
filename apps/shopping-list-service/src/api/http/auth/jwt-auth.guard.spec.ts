// Integração do guard global de JWT (AC-15/RN12 — ADR 0007).
//
// Requisição DIRETA ao shopping-list-service (sem gateway), via `inject` do
// adaptador Fastify:
// - sem token / token inválido / expirado → 401 uniforme
//   `{ statusCode: 401, message: "Não autorizado" }`, SEM distinguir motivo;
// - com JWT válido (assinado com o par de teste, o mesmo do auth-service)
//   → 200 na rota atual (`/api`);
// - rota anotada com `@Public()` (test-only — v1 não tem rota pública real)
//   ignora o guard e responde 200 sem token (🟡-2).
import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../../../app/app.module';
import { Public } from './public.decorator';
import { signTestJwt } from '../../../test-fixtures/jwt-test-utils';

// Rota pública de teste: prova o mecanismo `@Public()` sem criar rota
// pública de verdade no serviço (na v1 nenhuma rota usa — 🟡-2).
@Controller('public-test')
class PublicTestController {
  @Public()
  @Get()
  getPublic() {
    return { ok: true };
  }
}

const UNAUTHORIZED_BODY = { statusCode: 401, message: 'Não autorizado' };

describe('JwtAuthGuard (APP_GUARD global — AC-15)', () => {
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

  it('401 uniforme com token ausente (rota /api protegida)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual(UNAUTHORIZED_BODY);
  });

  it('401 uniforme com token inválido (malformado)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api',
      headers: { authorization: 'Bearer nao.eh.um.jwt' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual(UNAUTHORIZED_BODY);
  });

  it('401 uniforme com header Authorization malformado (sem Bearer)', async () => {
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

  it('401 uniforme com token de outro emissor (iss divergente)', async () => {
    const token = await signTestJwt({ issuer: 'servico-malicioso' });
    const response = await app.inject({
      method: 'GET',
      url: '/api',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual(UNAUTHORIZED_BODY);
  });

  it('200 com JWT válido emitido com o par de chaves do auth (AC-15)', async () => {
    const token = await signTestJwt();
    const response = await app.inject({
      method: 'GET',
      url: '/api',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: 'Hello API' });
  });

  it('rota anotada com @Public() ignora o guard (200 sem token)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/public-test',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
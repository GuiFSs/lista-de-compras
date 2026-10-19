import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import {
  DEFAULT_CORS_ORIGINS,
  GLOBAL_PREFIX,
  configureApp,
  parseCorsOrigins,
} from './configure-app';
import { signTestJwt } from '../test-fixtures/jwt-test-utils';

describe('configureApp (config / CORS stub)', () => {
  it('parseCorsOrigins: fallback e CSV', () => {
    expect(parseCorsOrigins(undefined)).toEqual([DEFAULT_CORS_ORIGINS]);
    expect(parseCorsOrigins('')).toEqual([DEFAULT_CORS_ORIGINS]);
    expect(parseCorsOrigins('http://a.local, http://b.local')).toEqual([
      'http://a.local',
      'http://b.local',
    ]);
  });

  it('aplica prefixo api e lê PRICE_HISTORY_API_PORT do ConfigService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const config = app.get(ConfigService);
    expect(config.get('PRICE_HISTORY_API_PORT')).toBe('3002');
    expect(config.get('PRICE_HISTORY_DATABASE_URL')).toContain('price_history');

    const token = await signTestJwt();
    const response = await app.inject({
      method: 'GET',
      url: `/${GLOBAL_PREFIX}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);

    await app.close();
  });
});

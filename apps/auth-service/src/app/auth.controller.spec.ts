// Testes de integração do `POST /api/auth/login` via Fastify `inject` (T6).
//
// Cobertura exigida pela T6 (PLAN.md "Estratégia de testes"):
// - 200 com o shape exato do contrato (T3) e claims do JWT (RN11/AC-13);
// - 400 para payload inválido (RN1) com o envelope canônico (T3/🟠-1);
// - 401 genérico — usuário inexistente == senha errada (RN7/AC-03);
// - 500 com envelope canônico sem detalhes; detalhe apenas em log (AC-10);
// - CORS/preflight da origem da PWA (ADR 0006);
// - senha NUNCA em response nem em log (AC-10, verificável).
//
// O usuário real só existirá com o seed (T8): aqui o 200 usa um harness com
// repositório fake em memória (overrideProvider) — não depende do banco nem
// do seed. Dois apps são montados: um com repo fake de sucesso (contrato) e
// outro com repo que lança (500), ambos com configureApp idêntico à produção.
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { decodeJwt } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { configureApp, LOGIN_ROUTE } from './configure-app';
import { User } from '../domain/user';
import { UserRepository } from '../application/ports/user-repository.port';
import { LoginRateLimiter } from '../application/ports/login-rate-limiter.port';
import { BcryptPasswordHasher } from '../infrastructure/auth/password-hasher';
import { MemoryRateLimiter } from '../infrastructure/memory-rate-limiter';

const USERNAME = 'usuario-teste';
const PASSWORD = 'senha-secreta-de-teste';
const USER_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const LOGIN_400_BODY = {
  statusCode: 400,
  message: 'Nome de usuário e senha são obrigatórios',
};
const LOGIN_401_BODY = { statusCode: 401, message: 'Credenciais inválidas' };

/** Gravador de logs para verificar AC-10 (senha/nome de usuário fora dos logs). */
const capturedLogs: unknown[][] = [];
const recordingLogger = {
  log: (...args: unknown[]) => capturedLogs.push(args),
  error: (...args: unknown[]) => capturedLogs.push(args),
  warn: (...args: unknown[]) => capturedLogs.push(args),
  debug: (...args: unknown[]) => capturedLogs.push(args),
  verbose: (...args: unknown[]) => capturedLogs.push(args),
  fatal: (...args: unknown[]) => capturedLogs.push(args),
};

/** Repositório fake em memória — substitui o adaptador Drizzle no harness. */
class InMemoryUserRepository extends UserRepository {
  constructor(private readonly users: Map<string, User>) {
    super();
  }
  async findByUsername(username: string): Promise<User | null> {
    return this.users.get(username) ?? null;
  }
}

/** Repositório que lança — simula falha não prevista (ex.: banco indisponível). */
class FailingUserRepository extends UserRepository {
  async findByUsername(_username: string): Promise<User | null> {
    throw new Error('falha simulada no banco de dados (0xDEADBEEF)');
  }
}

describe('POST /api/auth/login — integração via inject (T6)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    // Captura TODOS os logs do servidor para as asserções de AC-10.
    Logger.overrideLogger(recordingLogger);

    // Hash no MESMO custo de teste usado pelos adaptadores (test-setup);
    // o usuário fake existe só neste harness (o seed real é a T8).
    const cost = Number(process.env['AUTH_PASSWORD_HASH_COST'] ?? 4);
    const passwordHash = await new BcryptPasswordHasher(cost).hash(PASSWORD);
    const user: User = {
      id: USER_ID,
      username: USERNAME,
      passwordHash,
      createdAt: new Date(),
      updatedAt: null,
    };
    const userRepository = new InMemoryUserRepository(
      new Map([[USERNAME, user]]),
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UserRepository)
      .useValue(userRepository)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    // Restaura o logger padrão do Nest (não vazar silêncio p/ outros specs —
    // o Vitest roda arquivos em processos separados, mas a higiene fica).
    Logger.overrideLogger([]);
  });

  it('200 — shape exato do contrato e claims do JWT (RN5/RN11/AC-02)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: LOGIN_ROUTE,
      payload: { username: USERNAME, password: PASSWORD },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Shape exato do `LoginSuccessResponse` (T3): sem campos extras.
    expect(Object.keys(body).sort()).toEqual([
      'accessToken',
      'expiresIn',
      'tokenType',
    ]);
    expect(body.tokenType).toBe('Bearer');
    expect(body.expiresIn).toBe(86400);
    expect(typeof body.accessToken).toBe('string');
    expect(body.accessToken.length).toBeGreaterThan(0);

    // Claims mínimas (ADR 0007): sub uuid · iss · exp = iat + 86400.
    const claims = decodeJwt(body.accessToken as string);
    expect(claims.sub).toBe(USER_ID);
    expect(claims.iss).toBe('auth-service');
    expect(claims.iat).toBeTypeOf('number');
    expect(claims.exp).toBeTypeOf('number');
    expect(claims.exp! - claims.iat!).toBe(86400);

    // AC-10: a resposta não contém a senha.
    expect(JSON.stringify(body)).not.toContain(PASSWORD);
  });

  const invalidPayloads: Array<[string, unknown]> = [
    ['sem corpo', undefined],
    ['username ausente', { password: PASSWORD }],
    ['password ausente', { username: USERNAME }],
    ['corpo vazio', {}],
    ['username vazio', { username: '', password: PASSWORD }],
    ['password vazia', { username: USERNAME, password: '' }],
    ['username só espaços', { username: '   ', password: PASSWORD }],
    ['username não-string', { username: 123, password: PASSWORD }],
    ['password não-string', { username: USERNAME, password: ['x'] }],
  ];

  it.each(invalidPayloads)(
    '400 — payload inválido (%s) usa o envelope canônico (RN1/🟠-1)',
    async (_label, payload) => {
      const res = await app.inject({
        method: 'POST',
        url: LOGIN_ROUTE,
        payload: payload as Record<string, unknown> | undefined,
      });

      expect(res.statusCode).toBe(400);
      // Envelope ÚNICO: statusCode+message garantidos e SEM `error` na
      // resposta da PWA (shape exato, sem chave extra).
      expect(res.json()).toEqual(LOGIN_400_BODY);
      expect(Object.keys(res.json()).sort()).toEqual(['message', 'statusCode']);
    },
  );

  it('400 — JSON malformado no corpo também usa o envelope canônico', async () => {
    const res = await app.inject({
      method: 'POST',
      url: LOGIN_ROUTE,
      headers: { 'content-type': 'application/json' },
      payload: '{username:',
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual(LOGIN_400_BODY);
  });

  it('401 genérico — usuário inexistente == senha errada (RN7/AC-03)', async () => {
    const unknownUser = await app.inject({
      method: 'POST',
      url: LOGIN_ROUTE,
      payload: { username: 'nao-existe', password: 'qualquer-coisa' },
    });
    const wrongPassword = await app.inject({
      method: 'POST',
      url: LOGIN_ROUTE,
      payload: { username: USERNAME, password: 'senha-errada' },
    });

    expect(unknownUser.statusCode).toBe(401);
    expect(wrongPassword.statusCode).toBe(401);
    // A resposta NÃO distingue os dois casos (mesmo shape/mensagem).
    expect(unknownUser.json()).toEqual(LOGIN_401_BODY);
    expect(wrongPassword.json()).toEqual(LOGIN_401_BODY);
    expect(Object.keys(unknownUser.json()).sort()).toEqual([
      'message',
      'statusCode',
    ]);

    // AC-10/AC-03: nada de senha (nem a errada) ou nome de usuário no corpo.
    const bodies = `${JSON.stringify(unknownUser.json())}${JSON.stringify(
      wrongPassword.json(),
    )}`;
    expect(bodies).not.toContain(PASSWORD);
    expect(bodies).not.toContain('senha-errada');
    expect(bodies).not.toContain(USERNAME);
  });

  it('CORS — preflight da origem da PWA é aceito (ADR 0006)', async () => {
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: LOGIN_ROUTE,
      headers: {
        origin: 'http://localhost:4200',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type, authorization',
      },
    });

    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(
      'http://localhost:4200',
    );
    const allowMethods = String(
      preflight.headers['access-control-allow-methods'],
    )
      .toUpperCase()
      .split(',')
      .map((method) => method.trim());
    expect(allowMethods).toEqual(expect.arrayContaining(['POST', 'OPTIONS']));
    const allowHeaders = String(
      preflight.headers['access-control-allow-headers'],
    )
      .toUpperCase()
      .split(',')
      .map((header) => header.trim());
    expect(allowHeaders).toEqual(
      expect.arrayContaining(['CONTENT-TYPE', 'AUTHORIZATION']),
    );
  });

  it('CORS — origem permitida recebe header; origem desconhecida não (ADR 0006)', async () => {
    const allowed = await app.inject({
      method: 'POST',
      url: LOGIN_ROUTE,
      headers: { origin: 'http://localhost:4200' },
      payload: { username: USERNAME, password: PASSWORD },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://localhost:4200',
    );

    const denied = await app.inject({
      method: 'POST',
      url: LOGIN_ROUTE,
      headers: { origin: 'https://evil.example' },
      payload: { username: USERNAME, password: PASSWORD },
    });
    // O plugin não emite CORS para origem fora da lista (browser bloqueia).
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('AC-10 — nenhum log das respostas 200/400/401 contém a senha', () => {
    expect(JSON.stringify(capturedLogs)).not.toContain(PASSWORD);
    expect(JSON.stringify(capturedLogs)).not.toContain(USERNAME);
  });
});

describe('POST /api/auth/login — 500 erro interno (T6)', () => {
  let app500: NestFastifyApplication;

  beforeAll(async () => {
    // Captura TODOS os logs do servidor para as asserções de AC-10.
    Logger.overrideLogger(recordingLogger);
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UserRepository)
      .useValue(new FailingUserRepository())
      .compile();

    app500 = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await configureApp(app500);
    await app500.init();
    await app500.getHttpAdapter().getInstance().ready();
  });

  // Garante que o logger de captura está ativo imediatamente antes
  // de cada teste (o afterAll do describe anterior pode resetar o
  // logger global entre os describes).
  beforeEach(() => {
    Logger.overrideLogger(recordingLogger);
    capturedLogs.length = 0;
  });

  afterAll(async () => {
    await app500.close();
  });

  it('500 — envelope canônico genérico, sem detalhes nem credenciais', async () => {
    const res = await app500.inject({
      method: 'POST',
      url: LOGIN_ROUTE,
      payload: { username: USERNAME, password: PASSWORD },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ statusCode: 500, message: 'Erro interno' });
    expect(Object.keys(res.json()).sort()).toEqual(['message', 'statusCode']);

    // Corpo 500 NUNCA expõe detalhes internos nem credenciais (AC-10).
    const body = JSON.stringify(res.json());
    expect(body).not.toContain('falha simulada');
    expect(body).not.toContain(PASSWORD);
    expect(body).not.toContain(USERNAME);

    // O detalhe do erro interno existe APENAS no log do servidor (AC-10),
    // e mesmo o log não contém credenciais.
    const allLogs = JSON.stringify(capturedLogs);
    expect(allLogs).toContain('falha simulada no banco de dados');
    expect(allLogs).not.toContain(PASSWORD);
    expect(allLogs).not.toContain(USERNAME);
  });
});

describe('POST /api/auth/login — rate limit (T7/AC-14)', () => {
  let rateLimitedApp: NestFastifyApplication;
  let now = 1_000;

  beforeAll(async () => {
    const cost = Number(process.env['AUTH_PASSWORD_HASH_COST'] ?? 4);
    const passwordHash = await new BcryptPasswordHasher(cost).hash(PASSWORD);
    const user: User = {
      id: USER_ID,
      username: USERNAME,
      passwordHash,
      createdAt: new Date(),
      updatedAt: null,
    };
    const userRepository = new InMemoryUserRepository(
      new Map([[USERNAME, user]]),
    );
    const limiter = new MemoryRateLimiter({
      maxFailures: 2,
      windowMs: 60_000,
      clock: () => now,
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UserRepository)
      .useValue(userRepository)
      .overrideProvider(LoginRateLimiter)
      .useValue(limiter)
      .compile();

    rateLimitedApp = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await configureApp(rateLimitedApp);
    await rateLimitedApp.init();
    await rateLimitedApp.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await rateLimitedApp.close();
  });

  it('bloqueia até credenciais corretas e libera após a janela', async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const failure = await rateLimitedApp.inject({
        method: 'POST',
        url: LOGIN_ROUTE,
        payload: {
          username: attempt === 0 ? 'nao-existe' : USERNAME,
          password: 'incorreta',
        },
      });
      expect(failure.statusCode).toBe(401);
    }

    const blocked = await rateLimitedApp.inject({
      method: 'POST',
      url: LOGIN_ROUTE,
      payload: { username: USERNAME, password: PASSWORD },
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual({
      statusCode: 429,
      message: 'Muitas tentativas de login. Aguarde e tente novamente.',
    });
    expect(blocked.headers['retry-after']).toBe('60');

    now += 60_000;
    const recovered = await rateLimitedApp.inject({
      method: 'POST',
      url: LOGIN_ROUTE,
      payload: { username: USERNAME, password: PASSWORD },
    });
    expect(recovered.statusCode).toBe(200);
  });
});

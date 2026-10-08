import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { UserRepository } from '../application/ports/user-repository.port';
import { PasswordHasher } from '../application/ports/password-hasher.port';
import { TokenSigner } from '../application/ports/token-signer.port';
import { BcryptPasswordHasher } from '../infrastructure/auth/password-hasher';
import { JoseTokenSigner } from '../infrastructure/auth/token-signer';
import { DrizzleUserRepository } from '../infrastructure/persistence/drizzle/repository/user.repository';

describe('AppModule (smoke do setup — harness de DI real)', () => {
  it('compila o AppModule e resolve as portas com os adaptadores concretos', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    // Mesma configuração de produção (prefixo `api` + CORS + envelope de
    // erro): prova que o grafo de DI inteiro resolve com o plugin CORS.
    await configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Cada port do domínio/aplicação deve estar ligada ao adaptador
    // concreto da infraestrutura — prova que o grafo de DI inteiro
    // (ConfigModule global + Drizzle + bcryptjs + jose) resolve.
    const repository = moduleRef.get(UserRepository);
    const hasher = moduleRef.get(PasswordHasher);
    const signer = moduleRef.get(TokenSigner);

    expect(repository).toBeInstanceOf(DrizzleUserRepository);
    expect(hasher).toBeInstanceOf(BcryptPasswordHasher);
    expect(signer).toBeInstanceOf(JoseTokenSigner);

    await app.close();
  });
});
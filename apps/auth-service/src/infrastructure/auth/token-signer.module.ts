import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenSigner } from '../../application/ports/token-signer.port';
import { JoseTokenSigner, createJoseTokenSigner } from './token-signer';

/**
 * Wiring do port TokenSigner para o adaptador JoseTokenSigner (RS256).
 * Lê AUTH_JWT_PRIVATE_KEY_B64 (base64 single-line — ADR 0007) e
 * AUTH_JWT_ISSUER (default `auth-service`). A chave privada só existe
 * no `.env` local gitignored; nunca em arquivo versionado (AC7).
 */
@Module({
  providers: [
    {
      provide: TokenSigner,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Promise<JoseTokenSigner> =>
        createJoseTokenSigner(
          config.getOrThrow<string>('AUTH_JWT_PRIVATE_KEY_B64'),
          config.get<string>('AUTH_JWT_ISSUER') ?? 'auth-service',
        ),
    },
  ],
  exports: [TokenSigner],
})
export class TokenSignerModule {}
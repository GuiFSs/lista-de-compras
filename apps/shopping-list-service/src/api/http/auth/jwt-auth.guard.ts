// Guard global de autenticação da borda HTTP (RN12/AC15 — ADR 0007).
//
// É APENAS o plug que conecta o verificador framework-free de
// `@lista/shared/jwt` ao NestJS: não contém lógica de validação. Extrai o
// token do header `Authorization: Bearer <jwt>`, valida localmente com a
// chave pública RS256 (`AUTH_JWT_PUBLIC_KEY_B64`) e o `iss` esperado
// (`AUTH_JWT_ISSUER`), e mapeia QUALQUER falha para o 401 uniforme
// `{ statusCode: 401, message: "Não autorizado" }` — sem distinguir o
// motivo (ausente, inválido, expirado, assinatura ou `iss` errado).
//
// Registrado como APP_GUARD global (toda rota passa por ele). Rotas futuras
// públicas usam o decorator `@Public()` (metadata — 🟡-2); na v1 nenhuma
// rota usa.
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { extractBearerToken, verifyJwt } from '@lista/shared/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string } }>();
    const token = extractBearerToken(request.headers?.authorization);

    try {
      await verifyJwt({
        token: token ?? '',
        publicKey: this.config.getOrThrow<string>('AUTH_JWT_PUBLIC_KEY_B64'),
        issuer: this.config.get<string>('AUTH_JWT_ISSUER') ?? 'auth-service',
      });
      return true;
    } catch {
      // 401 uniforme (ADR 0007): o motivo NUNCA é distinguido na resposta;
      // vai para o log do servidor, se necessário, nunca para o cliente.
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Não autorizado',
      });
    }
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}
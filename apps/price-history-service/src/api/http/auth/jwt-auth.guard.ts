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

/**
 * Plug Nest do verificador framework-free `@lista/shared/jwt` (ADR 0007).
 * Qualquer falha → 401 uniforme, sem distinguir o motivo.
 */
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

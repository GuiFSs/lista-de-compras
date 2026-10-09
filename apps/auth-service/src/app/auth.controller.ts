import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import type {
  ApiErrorResponse,
  LoginRequest,
  LoginSuccessResponse,
} from '@lista/contracts';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import {
  LOGIN_400_MESSAGE,
  LOGIN_401_MESSAGE,
  LOGIN_429_MESSAGE,
  LOGIN_500_MESSAGE,
} from './login-messages';

/** Parse do body: string JSON → objeto; malformado → 400 canônico. */
function parseBody(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Nome de usuário e senha são obrigatórios',
      } as const);
    }
  }
  if (typeof body === 'object' && body !== null) {
    return body;
  }
  throw new BadRequestException({
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Nome de usuário e senha são obrigatórios',
  } as const);
}

function canonicalError(statusCode: number, message: string): ApiErrorResponse {
  return { statusCode, message };
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: FastifyRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<LoginSuccessResponse> {
    const parsedBody = parseBody(body);

    if (!isValidLoginRequest(parsedBody)) {
      throw new BadRequestException(
        canonicalError(HttpStatus.BAD_REQUEST, LOGIN_400_MESSAGE),
      );
    }

    try {
      const username = (parsedBody as LoginRequest).username;
      const password = (parsedBody as LoginRequest).password;

      const result = await this.loginUseCase.execute({
        username,
        password,
        // v1 local: chave do rate limiter = IP (sem proxy).
        clientId: req.ip,
      });

      if (!result.ok) {
        if (result.reason === 'rate-limited') {
          // Header no reply + HttpException: evita send() manual com passthrough.
          const retryAfter = result.retryAfterSeconds ?? 0;
          res.header('Retry-After', String(Math.ceil(retryAfter)));
          throw new HttpException(
            canonicalError(HttpStatus.TOO_MANY_REQUESTS, LOGIN_429_MESSAGE),
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        throw new UnauthorizedException(
          canonicalError(HttpStatus.UNAUTHORIZED, LOGIN_401_MESSAGE),
        );
      }

      return {
        accessToken: result.accessToken,
        tokenType: 'Bearer',
        expiresIn: result.expiresIn,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Detalhes só no log; corpo 500 genérico (sem credenciais).
      this.logger.error(
        'Falha inesperada no login',
        error instanceof Error ? (error.stack ?? error.message) : String(error),
      );
      throw new InternalServerErrorException(
        canonicalError(HttpStatus.INTERNAL_SERVER_ERROR, LOGIN_500_MESSAGE),
      );
    }
  }
}

function isValidLoginRequest(body: unknown): body is LoginRequest {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.username === 'string' &&
    candidate.username.trim().length > 0 &&
    typeof candidate.password === 'string' &&
    candidate.password.trim().length > 0
  );
}

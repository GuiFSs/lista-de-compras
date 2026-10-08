// Controller de entrada do login — adaptação HTTP na borda (hexagonal).
//
// O domínio (LoginUseCase) não conhece HTTP/Nest; este controller traduz:
// - request `LoginRequest` de @lista/contracts (validação RN1 no servidor);
// - resultado do caso de uso → status/body do contrato (T3);
// - o envelope de erro canônico `ApiErrorResponse` é SEMPRE o de
//   @lista/contracts (statusCode/message garantidos; error ausente/opcional
//   e nunca dependido pela PWA — 🟠-1); mensagens PT genéricas (RN7/AC3);
// - o corpo do 500 é sempre { statusCode: 500, message: "Erro interno" },
//   sem detalhes; detalhes internos vão apenas para o log do servidor, sem
//   credenciais (AC10).
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

/** Tenta fazer parse do corpo como JSON. Se for string, tenta JSON.parse.
 * Se falhar, lança BadRequestException para o filtro global converter
 * para o envelope canônico (T3/🟠-1). Se já for objeto, retorna como está. */
function parseBody(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      // JSON malformado: lança BadRequestException para o filtro global
      // transformar no envelope canônico (T3/🟠-1).
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Nome de usuário e senha são obrigatórios',
      } as const);
    }
  }
  if (typeof body === 'object' && body !== null) {
    return body;
  }
  // Tipo inválido (número, array, undefined, etc.)
  throw new BadRequestException({
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Nome de usuário e senha são obrigatórios',
  } as const);
}

/** Envelope canônico de erro (T3/🟠-1): statusCode + message garantidos,
 * error ausente (opcional no tipo, nunca presente aqui — a PWA não depende). */
function canonicalError(statusCode: number, message: string): ApiErrorResponse {
  return { statusCode, message };
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly loginUseCase: LoginUseCase) {}

  /** `POST /api/auth/login` — público, emitido 200 com o JWT (RN5/RN11). */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: FastifyRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<LoginSuccessResponse> {
    // RN1: validação no servidor — campos obrigatórios, strings não vazias
    // (a PWA já valida antes de enviar — AC6). Corpo inválido → 400 canônico.
    // O corpo pode vir como string (Fastify inject com JSON malformado) ou
    // objeto (Fastify parseado). Parseamos aqui para garantir o envelope
    // canônico de erro consistente (T3/🟠-1).
    const parsedBody = parseBody(body);

    // RN1: validação no servidor — campos obrigatórios, strings não vazias
    // (a PWA já valida antes de enviar — AC6). Corpo inválido → 400 canônico.
    if (!isValidLoginRequest(parsedBody)) {
      throw new BadRequestException(
        canonicalError(HttpStatus.BAD_REQUEST, LOGIN_400_MESSAGE),
      );
    }

    try {
      // Extrair username e password do corpo parseado
      const username = (parsedBody as LoginRequest).username;
      const password = (parsedBody as LoginRequest).password;

      const result = await this.loginUseCase.execute({
        username,
        password,
        // Chave do rate limiter na v1 = IP (sem proxy — PLAN.md; T7).
        clientId: req.ip,
      });

      if (!result.ok) {
        if (result.reason === 'rate-limited') {
          // T7: retornar 429 com envelope canônico + header Retry-After.
          const retryAfter = result.retryAfterSeconds ?? 0;
          res.status(429);
          res.header('Retry-After', String(Math.ceil(retryAfter)));
          res.status(429).send({ statusCode: 429, message: LOGIN_429_MESSAGE } as any);
          return {} as LoginSuccessResponse;
        }
        // RN7/AC3: 401 genérico — igual para usuário inexistente e senha
        // errada; não indica campo nem expõe dado sensível.
        throw new UnauthorizedException(
          canonicalError(HttpStatus.UNAUTHORIZED, LOGIN_401_MESSAGE),
        );
      }

      // Contrato 200 (T3): tokenType sempre "Bearer", expiresIn = 86400 (RN11).
      return {
        accessToken: result.accessToken,
        tokenType: 'Bearer',
        expiresIn: result.expiresIn,
      };
    } catch (error) {
      // Erros de negócio (400/401/500) já lançados: repassa sem logar.
      if (error instanceof HttpException) {
        throw error;
      }
      // AC10: detalhes internos só em log (sem credenciais); corpo 500 genérico.
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

/** Valida o payload de transporte (RN1): objeto com strings não vazias. */
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

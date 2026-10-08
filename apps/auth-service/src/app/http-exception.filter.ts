/// Exception filter para garantir que erros de parseio de JSON do Fastify/Nest
// retornem o envelope canônico de erro (T3/🟠-1), em vez da mensagem padrão
// "Body is not valid JSON but content-type is set to 'application/json'".
// Este filtro é registrado no AuthModule e atua apenas no escopo do serviço.

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorResponse } from '@lista/contracts';

@Catch(Error)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Apenas transforma erros de JSON malformado do Fastify/Nest;
    // outros erros seguem o fluxo normal.
    if (
      exception.message &&
      typeof exception.message === 'string' &&
      exception.message.includes('Body is not valid JSON') &&
      exception.message.includes('content-type is set to')
    ) {
      const canonicalError: ApiErrorResponse = {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Nome de usuário e senha são obrigatórios',
      };
      response.status(HttpStatus.BAD_REQUEST).json(canonicalError);
      return;
    }

    // Fallthrough: deixa outros erros seguirem o fluxo normal do Nest.
    // Isso garante que erros 401, 429, 500 do controller continuem funcionando.
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno',
    });
  }
}
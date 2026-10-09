// Decorator `@Public()` — marca rotas que ignoram o guard de JWT (🟡-2).
//
// O guard global (`JwtAuthGuard`/APP_GUARD) nasce com este suporte para
// rotas públicas futuras (healthcheck etc.). Na v1 NENHUMA rota usa:
// todas as rotas do shopping-list-service exigem token válido (AC-15).
import { SetMetadata } from '@nestjs/common';

/** Chave de metadata lida pelo guard (Reflector). */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca a rota como pública: o `JwtAuthGuard` deixa passar sem token.
 * Aplicar no handler (ou no controller inteiro).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
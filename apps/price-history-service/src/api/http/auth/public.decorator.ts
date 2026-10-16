import { SetMetadata } from '@nestjs/common';

/** Chave de metadata lida pelo guard (Reflector). */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca a rota como pública: o `JwtAuthGuard` deixa passar sem token.
 * Na v1 nenhuma rota de negócio usa (todas exigem JWT).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

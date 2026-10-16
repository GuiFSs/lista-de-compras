import { Module } from '@nestjs/common';
import { drizzleProvider } from './drizzle.provider';

/**
 * Adaptador de persistência. O Pool é criado na inicialização do módulo,
 * mas o Postgres só é contatado na primeira query.
 */
@Module({
  providers: [drizzleProvider],
  exports: [drizzleProvider],
})
export class DrizzleModule {}

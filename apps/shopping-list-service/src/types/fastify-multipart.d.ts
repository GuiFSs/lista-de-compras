import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    file(): Promise<
      | {
          mimetype: string;
          toBuffer(): Promise<Buffer>;
        }
      | undefined
    >;
  }
}

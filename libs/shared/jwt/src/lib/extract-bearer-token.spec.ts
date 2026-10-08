import { describe, expect, it } from 'vitest';
import { extractBearerToken } from './extract-bearer-token';

const JWT = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.abc123';

describe('extractBearerToken', () => {
  it('extrai o JWT de um header `Authorization: Bearer <jwt>`', () => {
    expect(extractBearerToken(`Bearer ${JWT}`)).toBe(JWT);
  });

  it('aceita o esquema em minúsculas (RFC 7235 §5.1 — case-insensitive)', () => {
    expect(extractBearerToken(`bearer ${JWT}`)).toBe(JWT);
  });

  it('tolera espaços ao redor do valor do header', () => {
    expect(extractBearerToken(`  Bearer ${JWT}  `)).toBe(JWT);
  });

  it('retorna null com header ausente', () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
  });

  it('retorna null com header vazio', () => {
    expect(extractBearerToken('')).toBeNull();
  });

  it('retorna null quando só existe o esquema (sem token)', () => {
    expect(extractBearerToken('Bearer')).toBeNull();
    expect(extractBearerToken('Bearer ')).toBeNull();
  });

  it('retorna null para esquema diferente (não é Bearer)', () => {
    expect(extractBearerToken('Basic abc123')).toBeNull();
  });

  it('retorna null para token malformado (com espaços)', () => {
    expect(extractBearerToken('Bearer a b c')).toBeNull();
  });
});
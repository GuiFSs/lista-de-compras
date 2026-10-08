#!/usr/bin/env node
/**
 * Gera o par de chaves RS256 usado pelo auth-service (JWT) e grava/atualiza
 * AUTH_JWT_PRIVATE_KEY_B64 / AUTH_JWT_PUBLIC_KEY_B64 no `.env` LOCAL.
 *
 * - Base64 single-line: evita PEM multilinha dentro do `.env` (PLAN T4/ADR 0007).
 * - Só escreve no `.env` (gitignored). Nunca em `.env.example` nem outro
 *   arquivo versionado.
 * - NUNCA imprime o material das chaves no stdout/logs: a saída é apenas uma
 *   confirmação não sensível (🟡-6 do parecer de arquitetura).
 * - Sem dependências: usa apenas `node:crypto` (generateKeyPairSync — RS256
 *   exige RSA; SPKI/PKCS8 em PEM) e o parser de `.env` abaixo.
 */
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

// Segurança adicional: o alvo tem que ser exatamente o `.env` da raiz.
if (!existsSync(envPath) || dirname(envPath) !== root) {
  console.error('[auth:keys] .env não encontrado na raiz do projeto.');
  console.error('[auth:keys] Rode primeiro: cp .env.example .env');
  process.exit(1);
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const toBase64SingleLine = (pem) => Buffer.from(pem, 'utf8').toString('base64');
const privateKeyB64 = toBase64SingleLine(privateKey);
const publicKeyB64 = toBase64SingleLine(publicKey);

// Atualiza as duas variáveis preservando o restante do `.env`
// (inclusive comentários, ordem e o EOL original do arquivo).
const raw = readFileSync(envPath, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);
if (lines.at(-1) === '') {
  lines.pop();
}

const setVar = (name, value) => {
  const index = lines.findIndex((line) => line.startsWith(`${name}=`));
  if (index >= 0) {
    lines[index] = `${name}=${value}`;
  } else {
    lines.push(`${name}=${value}`);
  }
};

setVar('AUTH_JWT_PRIVATE_KEY_B64', privateKeyB64);
setVar('AUTH_JWT_PUBLIC_KEY_B64', publicKeyB64);
writeFileSync(envPath, lines.join(eol) + eol, 'utf8');

// Somente confirmação não sensível — nunca os valores das chaves (🟡-6).
console.log('[auth:keys] Par de chaves RS256 gerado e gravado no .env local.');
console.log('[auth:keys] Variáveis atualizadas: AUTH_JWT_PRIVATE_KEY_B64, AUTH_JWT_PUBLIC_KEY_B64');
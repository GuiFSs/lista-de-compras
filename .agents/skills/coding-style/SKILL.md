---
name: coding-style
description: >-
  Estilo de código moderado do Lista de Compras — comentários úteis sem
  narrativa, nomes claros, sem `any`. Use ao implementar ou revisar TypeScript
  (apps, libs, testes) e quando o usuário pedir limpeza de comentários ou estilo.
---

# Estilo de código (moderado)

Aplique esta skill em toda implementação (`backend-dev`, `angular-dev`,
`feature-delivery`) e como referência de higiene no `code-review`.

## Princípio

Código legível por **nomes, tipos e estrutura**. Comentários explicam o
**porquê** ou um detalhe não óbvio — não recontam o fluxo da SPEC/PLAN nem a
linha seguinte.

Didática do projeto (comparações Angular×React, hexagonal, ADRs) fica no
**chat, handoff, ADR ou `docs/lessons/`** — nunca como prefácio de arquivo.

## Comentários — o que manter

- Motivo de segurança ou anti-abuso (timing, open redirect, rate limit).
- Trade-off ou restrição de plataforma (interop CJS/ESM, hydrate antes do guard).
- JSDoc curto em API pública ambígua (ports, contratos HTTP exportados, opções
  com default não óbvio).
- Marcadores úteis: `TODO`/`FIXME` com contexto; `eslint-disable` com justificativa.

## Comentários — o que remover / não escrever

- Prefácio que resume SPEC, PLAN, AC ou “fluxo em N passos”.
- Narrativa do óbvio (`// permite a navegação` antes de `return true`).
- Repetir “sem NestJS/banco/HTTP (ADR 0001)” em cada barrel ou entidade.
- JSDoc que só repete o nome (`/** Entrada do login. */` em `LoginCommand`).
- Numeração de passos (`// 1. … // 2. …`) espelhando o código.

## Exemplos

### Prefácio → comentário pontual

```typescript
// ❌
// LoginGuard — se já tem sessão, redireciona; senão mostra login.
// Fluxo: 1) … 2) … 3) sanitizeReturnUrl evita open redirect …

// ✅
export const loginGuard: CanActivateFn = (route) => {
  // …
  // Apenas paths internos absolutos — evita open redirect.
  const returnUrl = sanitizeReturnUrl(route.queryParams['returnUrl']) ?? '/';
  return router.parseUrl(returnUrl);
};
```

### JSDoc útil vs redundante

```typescript
// ❌
/** Entrada do caso de uso — comando de login. */
export interface LoginCommand { … }

// ✅ — só onde o significado não está no nome
export interface LoginCommand {
  username: string;
  password: string;
  /** Id do cliente no rate limiter (ex.: IP na v1 local). */
  clientId: string;
}
```

### Porquê de segurança (manter)

```typescript
// ✅ — timing e anti-enumeração não são óbvios no código
if (!user) {
  // Mesmo custo de verify + rate limit que senha errada (RN7 / anti-enumeração).
  const dummyHash = await this.passwordHasher.hash(dummySecret);
  await this.passwordHasher.verify(command.password, dummyHash);
  // …
}
```

## Outras regras (já no projeto)

- Nunca `any` — use `unknown` + narrowing, genéricos ou tipos de domínio
  (`AGENTS.md` / ESLint).
- Domínio e use cases sem framework, banco ou HTTP.
- Sem código morto comentado nem `console.log` de debug no commit.

## Checklist rápido antes do handoff

1. Algum comentário só repete o que o código já diz? Remova.
2. Há bloco de 5+ linhas no topo recontando a feature? Tire; deixe ADR/SPEC.
3. O “porquê” não óbvio (segurança, interop, hydrate) está comentado? Mantenha.
4. Ports/contratos públicos ambíguos têm JSDoc curto? Ok.

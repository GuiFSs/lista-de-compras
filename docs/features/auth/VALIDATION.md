# Validação — Autenticação

**Spec:** `docs/features/auth/SPEC.md`
**Plano:** `docs/features/auth/PLAN.md`
**Data:** 2026-10-08
**Resultado:** Aprovada

## Evidências por critério

| AC | Estado | Evidência |
| --- | --- | --- |
| AC-01 | aprovado | guard/web unitário e Playwright redirecionam sessão ausente para login sem shell |
| AC-02 | aprovado | integração do auth-service valida JWT; login real com conta semeada retornou token de 24h |
| AC-03 | aprovado | auth-service e LoginComponent cobrem 401 genérico; E2E exibe a mensagem |
| AC-04 | aprovado | unitário e E2E provam botão desabilitado, progresso e uma única request |
| AC-05 | aprovado | unitário e E2E provam erro visível, campos preservados e nova tentativa |
| AC-06 | aprovado | unitário e E2E provam validação local sem request |
| AC-07 | aprovado | busca pela senha local nos arquivos versionados retornou zero resultados |
| AC-08 | aprovado | migração + seed executados duas vezes; banco confirmou hash; login real passou |
| AC-09 | aprovado | busca em rotas/links da PWA não encontrou cadastro ou registro |
| AC-10 | aprovado | testes do controller verificam respostas/logs; senha é `type=password` |
| AC-11 | aprovado | E2E em 360px/tema escuro confirma layout e alvo de toque de 44px |
| AC-12 | aprovado | guards unitários e E2E preservam deep link e recarga |
| AC-13 | aprovado | SessionService e E2E comprovam localStorage, expiração e logout |
| AC-14 | aprovado | unitário do limiter, integração 429/janela e E2E da mensagem passaram |
| AC-15 | aprovado | 17 testes JWT e 9 testes do shopping-list-service cobrem borda local |

## Verificações transversais

- [x] Contratos HTTP/eventos refletem a implementação.
- [x] ADRs 0006 e 0007 estão versionadas.
- [x] Documentação da feature está atualizada.
- [x] Testes planejados foram executados e os resultados estão registrados.
- [x] Nenhum segredo ou credencial local está versionado.

## Pendências

- Nenhuma. O smoke test de permissões do OpenCode 1.18.35 carregou os 15
  agentes e aprovou as regras críticas de allow/ask/deny.

## Comandos executados

```text
npx nx test auth-service
# 3 arquivos, 22 testes aprovados

npx nx test web
# 5 arquivos, 23 testes aprovados

npx nx test jwt
# 2 arquivos, 17 testes aprovados

npx nx test shopping-list-service
# 2 arquivos, 9 testes aprovados

npx nx e2e web-e2e
# 6 testes Playwright aprovados em Chromium

npx nx run-many -t lint,typecheck,build --parallel=2
# 23 targets aprovados em 8 projetos

npm run auth:seed && npm run auth:seed
# migração aplicada; seed inserido e depois atualizado sem erro

SELECT username, password_hash <> '<senha-local>' AND length(password_hash) > 20
FROM users WHERE username = 'lista';
# lista|t

POST /api/auth/login com a conta semeada
# 200; accessToken presente; expiresIn=86400
```

## Parecer

Os quinze critérios possuem evidência automatizada ou operacional registrada.
Contratos, ADRs, arquitetura, segurança de credenciais e qualidade técnica foram
verificados. A feature está tecnicamente aprovada para decisão de push/PR.

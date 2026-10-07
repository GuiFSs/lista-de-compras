# Lições do setup inicial — 2026-10-07

**Contexto:** registro didático dos problemas encontrados e corrigidos durante os
gates do setup descrito na [ADR 0004](../decisions/0004-setup-do-front-do-back-e-do-e2e.md).

Este documento **não é uma ADR**: decisões arquiteturais ficam em
`docs/decisions/`. Aqui ficam os aprendizados transferíveis — o tipo de armadilha
que vai se repetir em features futuras. Cada item segue **sintoma → causa →
correção → lição**.

---

## 1. Build verde, aplicação em branco

- **Sintoma:** `build` e `lint` passavam, mas o dev server respondia 404 em `/`
  e o build de produção gerava um HTML sem JavaScript.
- **Causa:** o scaffold gerou o app com stack diferente do aceito na ADR 0003
  (Analog + Vite em vez de `@angular/build`), que exige `index.html` no root e
  não injeta o bootstrap do Angular.
- **Correção:** restaurar o stack da ADR e **validar o render real no navegador**
  (h1 presente, console sem erros), não apenas o exit code.
- **Lição:** geradores de scaffold nem sempre respeitam a ADR — conferir o stack
  contra a decisão logo no primeiro gate. "Build passou" não é evidência de que
  a aplicação roda; a validação visual faz parte do gate.

## 2. tsconfig incompatível desde a geração

- **Sintoma:** `tsc` falhava com `TS5110` (`module` diferente de `NodeNext` com
  `moduleResolution: NodeNext`) e `TS1343` (`import.meta` exige módulo moderno).
- **Causa:** os projetos gerados traziam `"module": "commonjs"` sobrepondo o
  `tsconfig.base.json`, que fixa `nodenext` — além de opções soltas como
  `inlineSources` sem `inlineSourceMap`.
- **Correção:** remover os overrides e deixar `module: nodenext` herdado do base
  nas libs e no projeto e2e.
- **Lição:** em monorepo, opções de compilador têm uma só fonte
  (`tsconfig.base.json`); override local só quando há motivo documentado. Rodar
  `typecheck` logo após gerar projetos — o build do Angular/webpack nem sempre
  expõe esses erros.

## 3. Peer deps mascaradas: Fastify 12 com Nest 11

- **Sintoma:** instalar `@nestjs/platform-fastify` na versão mais nova quebrou a
  injeção de dependência em runtime.
- **Causa:** os pacotes do ecossistema Nest precisam estar alinhados na mesma
  major; e o `npm install --legacy-peer-deps` (necessário pelo bug `edgesOut` do
  npm 10.9.2) suprime os avisos de incompatibilidade.
- **Correção:** fixar `@nestjs/platform-fastify@^11`, alinhado ao `@nestjs/core@11`.
- **Lição:** com `--legacy-peer-deps`, o instalador **não** é o guarda. Pacotes
  do mesmo ecossistema (Nest, Angular, Nx) devem ser conferidos à mão na mesma
  major antes de commitar.

## 4. Testes que "passavam" sem rodar

- **Sintoma:** o target `test` do backend saía verde sem executar nenhum teste.
- **Causa:** o `root` do Vitest apontava para a raiz do monorepo (herdado do
  scaffold), o glob não encontrava nenhum spec, e `--passWithNoTests` escondia o
  silêncio.
- **Correção:** `vitest.config.mts` com `root: import.meta.dirname`, setup com
  `reflect-metadata`, remoção do `--passWithNoTests` e um smoke test (DI do Nest
  + adaptador Fastify via `inject`).
- **Lição:** verde sem execução é pior que vermelho. Remova `passWithNoTests`
  em suítes que obrigatoriamente têm testes, e escreva o primeiro teste justamente
  para provar que o harness funciona.

## 5. `PORT` no `.env` sequestrou o dev server do Angular

- **Sintoma:** o `nx e2e` travava esperando `http://localhost:4200`; o servidor
  subia na porta 3000, sem nenhum erro na saída.
- **Causa:** o Nx carrega o `.env` da raiz para **todos** os targets, e o
  `@angular/build:dev-server` trata `process.env.PORT` como a própria porta —
  sobrescrevendo até a opção `port` explícita
  (`node_modules/@angular/build/src/builders/dev-server/options.js`, linhas 75–83).
- **Correção:** renomear para `API_PORT` (commit `0231da3`) e documentar o porquê
  no `.env.example`.
- **Lição:** em monorepo, o ambiente é um namespace global compartilhado por
  todas as tools. Convenções como `PORT` e `NODE_ENV` são de propriedade da
  ferramenta que as lê — sempre prefixe variáveis de serviço (`API_`, `AUTH_`).

## 6. Target de servidor sem `continuous: true`

- **Sintoma:** mesmo com a porta certa, o run do Nx morria em silêncio depois de
  subir o `web:serve` — o target `e2e--wait-for-webserver` nunca começava.
- **Causa:** `web:serve` era um target **explícito** em `project.json` sem a flag
  `continuous: true`. Sem ela, o Nx aguarda o task **terminar** antes de rodar os
  dependentes — e um dev server nunca termina. Targets *inferidos* por plugin
  recebem a flag automaticamente; os explícitos, não.
- **Correção:** marcar `serve` como `continuous: true` (o `serve` do backend já
  vinha do gerador com a flag).
- **Lição:** todo target que sobe servidor de dev precisa da flag. Quando um run
  do Nx "tranca sem erro", desconfie de espera infinita (continuidade/readiness),
  não de crash — a saída para diagnosticar é `nx show project <proj> --json`,
  olhando `dependsOn` e `continuous`.

## 7. Erro fantasma depois da correção: estado incremental obsoleto

- **Sintoma:** o `typecheck` continuava acusando `TS1343` mesmo depois de o
  `module` já estar `nodenext` (confirmado com `tsc --showConfig`).
- **Causa:** estado incremental (`tsbuildinfo` em `dist/out-tsc`) gravado pela
  execução anterior, quando a config ainda estava errada.
- **Correção:** limpar `dist/out-tsc` e rodar `tsc -b --force` — depois o target
  passou (o Nx até sinalizou o alvo como "flaky" por trocar de resultado).
- **Lição:** antes de reabrir uma investigação, elimine estado: `--force`,
  limpeza de `*.tsbuildinfo`, `nx reset`. Erro que persiste com a config já
  corrigida é suspeito de cache.

## 8. Workspace fora de sincronia após criar projeto

- **Sintoma:** o watch mode passou a falhar com "The workspace is out of sync"
  (`@nx/js:typescript-sync`).
- **Causa:** o generator mantém as `references` de projeto no tsconfig raiz;
  criar o `apps/web-e2e` deixou essa referência faltando.
- **Correção:** `npx nx sync` (adicionou `apps/web-e2e` às references).
- **Lição:** criar ou remover projetos sempre termina com `nx sync`. O recado
  aparece até no watch do backend — não é erro do serviço.

## 9. Timeouts de shell não matam a árvore de processos

- **Sintoma:** runs anteriores interrompidos por timeout deixaram
  `npx nx serve shopping-list-service` e um `run-executor.js` vivos; o
  `nx reset` falhava com `EPERM` em `.nx/workspace-data`.
- **Causa:** no Windows, matar o processo do shell não derruba os filhos; além
  disso o workspace vive dentro do OneDrive, que pode segurar locks de arquivo.
- **Correção:** identificar os órfãos (`Get-CimInstance Win32_Process` /
  `Get-NetTCPConnection -LocalPort <porta>`), encerrá-los e só então `nx reset`.
- **Lição:** antes de re-tentar um comando que "trancou", verifique portas e
  processos. Em monorepo, um `serve` órfão não só ocupa a porta: mantém lock de
  cache e distorce o diagnóstico do próximo run.

## 10. Artefatos de teste foram para o commit

- **Sintoma:** o commit do e2e levou junto `apps/web-e2e/test-output/` (relatório
  HTML do Playwright).
- **Causa:** o `.gitignore` não cobria a saída declarada nos `outputs` do target
  — `outputs` do Nx não implica ignore automático do git.
- **Correção:** regra `test-output/` no `.gitignore` + `git rm --cached` +
  `git commit --amend` (commit local, ainda não pushado).
- **Lição:** olhar o `git status` *antes* do commit é parte do gate; outputs de
  target são cache de execução, não conteúdo versionável.

---

## Padrões gerais

1. **Valide comportamento, não exit codes.** Os dois piores bugs do setup
   (tela em branco e e2e travado) tinham todos os comandos "verdes".
2. **Um harness verde precisa provar que executou.** Sem `passWithNoTests` e com
   pelo menos um teste que exercite o caminho real (DI, HTTP, banco).
3. **O ambiente é compartilhado.** `.env`, variáveis de processo e portas são
   namespace global em monorepo: prefixe tudo e desconfie de convenções.
4. **Targets explícitos ≠ inferidos.** O que o plugin do Nx faz sozinho
   (flags `continuous`, sync, port readiness) você precisa fazer à mão quando
   escreve `project.json` manualmente.
5. **Elimine estado antes de investigar.** Cache do Nx, `tsbuildinfo`, processos
   órfãos: quase todo "bug que não reproduz explicação" era estado velho.

## Ver também

- [ADR 0004 — setup do front, back e e2e](../decisions/0004-setup-do-front-do-back-e-do-e2e.md)
- [Plano de setup do SDD](../plans/2026-10-06-sdd-setup.md)
- `AGENTS.md` — regras de colaboração e ciclo SDD

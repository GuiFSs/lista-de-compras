# Plano técnico — Importar compra pela foto da nota

**Status:** Aprovado
**Spec:** `docs/features/receipt-purchase/SPEC.md`
**Última atualização:** 2026-10-29
**Aprovação do usuário:** Aprovado pelo usuário em 2026-10-29

## Contexto

A pessoa envia foto da nota; o `shopping-list-service` reconhece com Gemini
(ADR 0012), a PWA revisa linhas incompletas, o apply marca comprados com
**substituição** por nome normalizado e abre o checkout existente (histórico
inalterado). Spec aprovada em 2026-10-29 (CD-01…CD-04).

## Superfície de UI

- **Superfície de UI:** sim
- **Justificativa:** novos fluxos na aba Lista (captura, revisão, pré-fill do
  checkout) e ACs observáveis AC-01…AC-11, AC-14, AC-15 — ADR 0008 exige
  Playwright.

## Abordagem

1. Contratos HTTP em `libs/contracts` + ADR 0012/0013 já versionadas.
2. Porta `ReceiptRecognizer` + adaptador Gemini + use cases Recognize /
   Apply (replace + mark purchased) no shopping-list-service.
3. Controllers multipart/JSON, limites de upload, env no `.env.example`.
4. PWA: entrada Importar nota → revisão → apply → checkout prefilled.
5. Testes unit/integração com reconhecedor fake; E2E com mock HTTP do
   recognize/apply (sem chamar Gemini real na CI).

## Contratos

### `POST /api/shopping-list/receipts/recognize`

- Content-Type: `multipart/form-data`, campo `image` (file).
- Aceitar: `image/jpeg`, `image/png`, `image/webp`; tamanho máx. **8 MiB**.
- Response 200:

```ts
{
  market: string | null;
  purchaseDate: string | null; // YYYY-MM-DD
  lines: Array<{
    name: string | null;
    quantity: number | null;
    unit: ItemUnit | null;
    unitPrice: number | null;
  }>;
}
```

- Erros: 400 (tipo/ausência), 413 (tamanho), 401, 502/503 (reconhecedor).

### `POST /api/shopping-list/receipts/apply`

- Body JSON:

```ts
{
  market?: string | null;
  purchaseDate?: string | null;
  lines: Array<{
    name: string;
    quantity: number;
    unit: ItemUnit;
    unitPrice: number;
    include: boolean;
  }>;
}
```

- Só linhas com `include: true` e campos válidos (RN-06) são aplicadas.
- Response 200: `ShoppingListResponse` (lista completa).
- Erros: 400 validação; 401.

### Eventos

- Nenhum novo.

Arquivo: `libs/contracts/src/http/shopping-list.ts` (tipos + constantes de
upload se útil).

## Dados e ownership

- Lista / purchased: shopping-list-service.
- Sem tabela de receipts/imagens.
- Histórico: só checkout → evento → price-history.

## Revisão arquitetural

- Obrigatória: **sim** (integração externa Gemini + novos HTTP na borda da
  PWA).
- Parecer: `docs/features/receipt-purchase/ARCHITECTURE-REVIEW.md`
- Estado: **aprovada** (2026-10-29)

## Estratégia de testes

- Unitários: ApplyReceiptPurchase (replace/create/skip); normalização de
  unidade no adaptador (com HTTP Gemini mockado); validação de upload.
- Integração: recognize com `ReceiptRecognizer` fake; apply contra Postgres
  de teste.
- E2E Playwright: jornada com rotas HTTP mockadas (recognize/apply/
  checkout); sem Gemini real.

### Matriz AC ↔ E2E

| AC | Observável na UI? | Cenário Playwright | Evidência não-E2E |
| --- | --- | --- | --- |
| AC-01 | sim | `receipt-purchase.spec.ts` — importar abre fluxo e loading | — |
| AC-02 | sim | mesma jornada — revisão com linhas | — |
| AC-03 | sim | revisão — linha incompleta não aplica até completar | — |
| AC-04 | sim | apply — item existente substituído/comprado | unit Apply replace |
| AC-05 | sim | apply — item novo criado comprado | unit Apply create |
| AC-06 | sim | item fora da nota permanece | unit Apply skip |
| AC-07 | sim | checkout prefilled mercado/data | — |
| AC-08 | sim | checkout → lista limpa comprados (mock) | integração checkout existente |
| AC-09 | sim | cancelar checkout mantém comprados | — |
| AC-10 | sim | recognize 502 → erro, lista igual | — |
| AC-11 | sim | apply 400/500 preserva edição | — |
| AC-12 | não | — | unit/integração: sem persistência de arquivo |
| AC-13 | não | — | inspeção: chave só no serviço / env |
| AC-14 | sim | máscara BRL na revisão | — |
| AC-15 | sim | recognize sem linhas → empty state | — |

## Riscos e trade-offs

- Qualidade OCR de cupom BR → mitigado pela revisão (SPEC).
- Cota Gemini na CI → mock do port; E2E não chama Google.
- Ampliação ADR 0009 → ADR 0013 explícita.

## Tarefas

| ID | ACs | Agente | Descrição | Arquivos permitidos | Depende de | Testes/comandos | Evidência esperada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | AC-02, AC-13 | backend-dev | Tipos HTTP recognize/apply em contracts; export barrel | `libs/contracts/**` | — | `npx nx test contracts` (ou build/tsc do lib) | tipos compilam |
| T-02 | AC-04, AC-05, AC-06, AC-12 | backend-dev | Porta `ReceiptRecognizer`; use case Apply (replace/create); Recognize orquestra port; sem I/O Gemini real nos testes | `apps/shopping-list-service/src/domain/**`, `apps/shopping-list-service/src/application/**` | T-01 | `npx nx test shopping-list-service --testPathPattern=receipt` | unit Apply/Recognize verdes |
| T-03 | AC-01, AC-10, AC-12, AC-13 | backend-dev | Adaptador Gemini + fake; HTTP controllers multipart/JSON; env `.env.example`; wiring Nest | `apps/shopping-list-service/src/api/**`, `apps/shopping-list-service/src/infrastructure/**`, `.env.example`, `docker/**` se necessário | T-02 | `npx nx test shopping-list-service` | unit+controller verdes; chave só env |
| T-04 | AC-01…AC-11, AC-14, AC-15 | angular-dev | UI: entrada Importar nota, revisão, apply store/api, pré-fill checkout; tokens/guia | `apps/web/src/app/features/shopping-list/**`, `apps/web/src/app/**` se rotas/shared mínimos | T-01, T-03 | `npx nx test web --testPathPattern=receipt\|shopping-list` | unit UI verdes |
| T-05 | AC-01…AC-11, AC-14, AC-15 | test-engineer | E2E Playwright jornada receipt-purchase com mock HTTP | `apps/web-e2e/**` | T-04 | `npx nx e2e web-e2e --configuration=...` ou filtro `receipt-purchase` | suíte verde + matriz coberta |

Ordem: T-01 → T-02 → T-03 → T-04 → T-05 (sequencial).

## Decisões

- ADR 0012 — Gemini Vision
- ADR 0013 — exceção gateway receipts
- ARCHITECTURE-REVIEW aprovada

## Gate do plano

- [x] Todas as tarefas referenciam ao menos um `AC-*` ou justificam trabalho técnico.
- [x] Tarefas preferem escopo pequeno e cada uma declara comando de teste.
- [x] `Superfície de UI: sim|não` está declarada com justificativa.
- [x] Se UI = sim: matriz AC ↔ E2E completa e tarefa Playwright com comando.
- [x] Dependências, arquivos permitidos, testes e evidências estão explícitos.
- [x] Contratos e ownership estão definidos.
- [x] Revisão arquitetural foi concluída quando obrigatória.
- [x] Não há decisão de comportamento, contrato ou arquitetura em aberto.
- [x] Artefato contém a frase canônica `Aprovado pelo usuário em YYYY-MM-DD`.

Aprovado pelo usuário em 2026-10-29

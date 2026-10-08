# Validação — <nome da feature>

**Spec:** `docs/features/<feature>/SPEC.md`  
**Plano:** `docs/features/<feature>/PLAN.md`  
**Data:** AAAA-MM-DD  
**Resultado:** Aprovada | Reprovada | Bloqueada

## Evidências por critério

| AC | Estado | Evidência automatizada | Evidência manual/contrato | Observação |
| --- | --- | --- | --- | --- |
| AC-01 | aprovado / reprovado / bloqueado | comando + teste | passo/contrato | ... |

## Verificações transversais

- [ ] Contratos HTTP/eventos refletem a implementação.
- [ ] ADRs necessárias estão versionadas.
- [ ] Documentação da feature está atualizada.
- [ ] Testes planejados foram executados e os resultados estão registrados.
- [ ] Não há segredo ou credencial versionada.

## Pendências

- <AC, responsável e próximo passo; ou "nenhuma">

## Comandos executados

```text
<comando>
<resultado resumido e verificável>
```

## Parecer

<Aprovar somente quando todos os ACs estiverem comprovados e não houver
pendência de comportamento, contrato ou arquitetura.>

# ADR 0002 - Ledger de estoque e projecoes

Status: Aceito retroativamente.

## Contexto

O historico mostra `afbe7b5 docs: add inventory ledger redesign spec`, `4b7ddc0 Atualiza fluxos operacionais`, `cbedcd2 Amarra estoque central nas entregas` e migracao `20260425_create_estoque_ledger.sql`.

## Decisao

Representar movimentacoes de estoque como eventos/ledger com escopo central ou escola, origem, tipo de evento, delta, referencia e usuario snapshot. Projecoes e saldos operacionais derivam desses eventos e dos saldos atuais.

## Alternativas consideradas

- Atualizar apenas tabelas de saldo atual.
- Manter historicos separados por fluxo sem unificacao.
- Recalcular saldos exclusivamente por consultas agregadas sem evento canonico.

## Consequencias

- Positiva: melhora auditoria e rastreabilidade de recebimentos, transferencias, entregas e ajustes.
- Positiva: facilita sync offline e reconciliacao por origem/referencia.
- Negativa: exige idempotencia e cuidado para nao duplicar eventos.
- Risco: tipos compartilhados ainda divergem do uso real, por exemplo `transferencia`.

Confianca: CONFIRMADO para existencia; INFERIDO para alternativas.

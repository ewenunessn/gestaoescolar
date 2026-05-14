# Contract Product Ledger Design

## Goal

Make the contract balance module ledger-driven. `contrato_produtos` defines what was contracted, `contrato_produto_saldos` stores the current balance for fast reads, and `contrato_produto_ledger` stores every balance movement as immutable history.

## Current State

The backend already has two balance modes:

- Item balance: `contrato_produtos_saldos` and `contrato_produtos_saldos_historico`.
- Modality balance: `contrato_produtos_modalidades` and `contrato_produtos_modalidades_historico`.

Those structures update current balances directly and some flows remove history rows when reversing a consumption. That conflicts with the desired rule that history is never deleted and corrections must be represented by reverse movements.

## Target Data Model

`contrato_produto_saldos` is the current-balance table:

- `id`
- `contrato_produto_id`
- `modalidade_financeira_id`
- `saldo_inicial`
- `saldo_atual`
- `quantidade_consumida`
- `ativo`
- `created_at`
- `updated_at`

For simple item control, `modalidade_financeira_id` is null. For financial-modality control, the field is set.

`contrato_produto_ledger` is the immutable movement table:

- `id`
- `contrato_produto_id`
- `modalidade_financeira_id`
- `tipo_movimento`
- `direcao`
- `quantidade`
- `saldo_antes`
- `saldo_depois`
- `descricao`
- `origem_tipo`
- `origem_id`
- `movimento_referenciado_id`
- `criado_por`
- `criado_em`

Allowed movement types are `ENTRADA_CONTRATO`, `DISTRIBUICAO`, `SAIDA_CONSUMO`, `ESTORNO`, and `AJUSTE`.

## Behavior

Every balance change runs through one service. The service validates the contract product, locks the current balance row with `FOR UPDATE`, checks available balance, inserts a ledger row, updates the current balance, and commits the transaction.

The service never allows `saldo_atual < 0`. A failed validation rolls back the whole transaction.

Estorno inserts a positive ledger movement that references the original movement. It does not delete the original movement.

## Migration

Schema initialization creates the new canonical tables and backfills them from existing item and modality balance tables. Existing tables are retained during the transition to avoid destructive migration, but all new business logic reads and writes through the canonical tables.

The existing API response fields remain compatible with the frontend: `quantidade_inicial`, `quantidade_consumida`, and `quantidade_disponivel` are mapped from `saldo_inicial`, `quantidade_consumida`, and `saldo_atual`.

## Testing

Unit tests cover the pure movement math and validation first. Service-level tests use a fake transactional client to verify SQL flow, `FOR UPDATE` locking, negative-balance rejection, ledger insertion, and estorno behavior.

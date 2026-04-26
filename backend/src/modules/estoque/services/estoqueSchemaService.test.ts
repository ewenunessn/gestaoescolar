import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildEstoqueLedgerSchemaSql } from "./estoqueSchemaService";

describe("estoqueSchemaService", () => {
  it("defines the ledger tables and projections required by stock reads", () => {
    const sql = buildEstoqueLedgerSchemaSql();

    assert.match(sql, /CREATE TABLE IF NOT EXISTS estoque_eventos/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS estoque_operacao_escola/);
    assert.match(sql, /CREATE OR REPLACE VIEW vw_estoque_saldo_central/);
    assert.match(sql, /CREATE OR REPLACE VIEW vw_estoque_saldo_escola/);
  });
});

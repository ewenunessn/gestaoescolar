import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildEntregaIdempotencySchemaSql,
  normalizeClientOperationId,
  validateExistingOperationMatch,
} from "./entregaIdempotency";

describe("entregaIdempotency", () => {
  it("normalizes blank client operation ids to null", () => {
    assert.equal(normalizeClientOperationId(undefined), null);
    assert.equal(normalizeClientOperationId(null), null);
    assert.equal(normalizeClientOperationId("   "), null);
  });

  it("trims valid client operation ids", () => {
    assert.equal(normalizeClientOperationId("  entrega_123  "), "entrega_123");
  });

  it("rejects client operation ids that are too long", () => {
    assert.throws(() => normalizeClientOperationId("x".repeat(101)), {
      message: "client_operation_id deve ter no maximo 100 caracteres",
    });
  });

  it("rejects a reused client operation id for another delivery item", () => {
    assert.throws(
      () => validateExistingOperationMatch({ guia_produto_escola_id: 10 }, 11),
      { message: "client_operation_id ja foi usado em outro item de entrega" },
    );
  });

  it("defines the idempotency schema needed by delivery sync", () => {
    const sql = buildEntregaIdempotencySchemaSql();

    assert.match(sql, /historico_entregas/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS client_operation_id/);
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_historico_entregas_client_operation_id/);
  });
});

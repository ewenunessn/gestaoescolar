import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(process.cwd(), "backend/src/migrations/20260428_comprovante_fotos.sql");

describe("ComprovanteFoto migration", () => {
  it("creates one photo metadata row per comprovante with storage key uniqueness", () => {
    const sql = readFileSync(migrationPath, "utf8");

    assert.match(sql, /CREATE TABLE IF NOT EXISTS comprovante_fotos/);
    assert.match(sql, /comprovante_id INTEGER NOT NULL REFERENCES comprovantes_entrega\(id\) ON DELETE CASCADE/);
    assert.match(sql, /storage_key TEXT NOT NULL UNIQUE/);
    assert.match(sql, /UNIQUE \(comprovante_id\)/);
    assert.match(sql, /CHECK \(status IN \('pending', 'uploaded', 'expired'\)\)/);
  });

  it("indexes expiration for cleanup and active reads", () => {
    const sql = readFileSync(migrationPath, "utf8");

    assert.match(sql, /idx_comprovante_fotos_expires_at/);
    assert.match(sql, /idx_comprovante_fotos_status/);
  });
});

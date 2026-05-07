import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const source = readFileSync(join(process.cwd(), "backend/src/index.ts"), "utf8");
const vercelEntrypointSource = readFileSync(join(process.cwd(), "backend/api/index.js"), "utf8");

describe("production endpoint exposure", () => {
  it("does not expose environment debug endpoints", () => {
    assert.doesNotMatch(source, /app\.get\(["']\/debug-env["']/);
    assert.doesNotMatch(source, /JWT_SECRET_LENGTH/);
    assert.doesNotMatch(source, /ALL_JWT_VARS/);
  });

  it("does not write secret values or prefixes to Vercel logs", () => {
    assert.doesNotMatch(vercelEntrypointSource, /JWT_SECRET\.substring/);
    assert.doesNotMatch(vercelEntrypointSource, /process\.env\.JWT_SECRET\.[a-zA-Z]+/);
  });

  it("requires admin access for the database diagnostic endpoint", () => {
    assert.match(
      source,
      /app\.get\(["']\/api\/test-db["'],\s*authenticateToken,\s*requireAdmin,/,
    );
    assert.doesNotMatch(source, /database_test/);
  });
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("userRoutes controller boundaries", () => {
  it("keeps auth, profile and admin middleware concerns in separate modules", () => {
    const source = readFileSync(join(__dirname, "userRoutes.ts"), "utf8");

    assert.match(source, /controllers\/authController/);
    assert.match(source, /controllers\/meController/);
    assert.match(source, /middleware\/adminMiddleware/);
    assert.doesNotMatch(source, /controllers\/userController/);
    assert.doesNotMatch(source, /controllers\/adminUsuariosController/);
  });
});

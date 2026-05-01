import assert from "node:assert/strict";
import { describe, it } from "node:test";
import escolaPortalRoutes from "./escolaPortalRoutes";

function routePaths(): string[] {
  return escolaPortalRoutes.stack
    .map((item: any) => item.route?.path)
    .filter(Boolean);
}

describe("escolaPortalRoutes production contract", () => {
  it("does not expose token debug routes", () => {
    assert.equal(routePaths().includes("/debug-token"), false);
  });
});

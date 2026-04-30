import assert from "node:assert/strict";
import { describe, it } from "node:test";
import userRoutes from "./userRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = userRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("userRoutes auth contract", () => {
  it("uses JWT authentication for current user profile", () => {
    assert.deepEqual(routeMiddlewareNames("/me", "get").slice(0, 1), [
      "authenticateToken",
    ]);
  });

  it("uses JWT authentication for current user permissions", () => {
    assert.deepEqual(routeMiddlewareNames("/me/permissoes", "get").slice(0, 1), [
      "authenticateToken",
    ]);
  });
});

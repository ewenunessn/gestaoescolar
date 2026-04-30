import assert from "node:assert/strict";
import { describe, it } from "node:test";
import periodosRoutes from "./periodosRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = periodosRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("periodosRoutes authorization contract", () => {
  it("requires JWT authentication and period read permission for listing periods", () => {
    assert.deepEqual(routeMiddlewareNames("/", "get").slice(0, 2), [
      "authenticateToken",
      "requirePeriodosRead",
    ]);
  });

  it("requires JWT authentication and period write permission for creating periods", () => {
    assert.deepEqual(routeMiddlewareNames("/", "post").slice(0, 2), [
      "authenticateToken",
      "requirePeriodosWrite",
    ]);
  });

  it("keeps user period selection authenticated without admin period write permission", () => {
    assert.deepEqual(routeMiddlewareNames("/selecionar", "post").slice(0, 1), [
      "authenticateToken",
    ]);
  });
});

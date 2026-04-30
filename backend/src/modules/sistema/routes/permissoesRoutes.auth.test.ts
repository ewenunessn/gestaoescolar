import assert from "node:assert/strict";
import { describe, it } from "node:test";
import permissaoRoutes from "./permissoesRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = permissaoRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("permissoesRoutes auth contract", () => {
  it("requires JWT authentication and admin access for listing modules", () => {
    assert.deepEqual(routeMiddlewareNames("/modulos", "get").slice(0, 2), [
      "authenticateToken",
      "requireAdmin",
    ]);
  });

  it("requires JWT authentication and admin access for changing user permissions", () => {
    assert.deepEqual(routeMiddlewareNames("/usuario/:usuario_id", "put").slice(0, 2), [
      "authenticateToken",
      "requireAdmin",
    ]);
  });
});

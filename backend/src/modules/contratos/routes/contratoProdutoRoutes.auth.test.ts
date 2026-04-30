import assert from "node:assert/strict";
import { describe, it } from "node:test";
import contratoProdutoRoutes from "./contratoProdutoRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = contratoProdutoRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("contratoProdutoRoutes authorization contract", () => {
  it("requires JWT authentication and contract read permission for listing contract products", () => {
    assert.deepEqual(routeMiddlewareNames("/", "get").slice(0, 2), [
      "authenticateToken",
      "requireContratosRead",
    ]);
  });

  it("requires JWT authentication and contract write permission for creating contract products", () => {
    assert.deepEqual(routeMiddlewareNames("/", "post").slice(0, 2), [
      "authenticateToken",
      "requireContratosWrite",
    ]);
  });
});

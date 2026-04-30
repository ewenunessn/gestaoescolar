import assert from "node:assert/strict";
import { describe, it } from "node:test";
import tacoRoutes from "./tacoRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = tacoRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("tacoRoutes authorization contract", () => {
  it("requires product read permission for TACO search", () => {
    assert.deepEqual(routeMiddlewareNames("/buscar", "get").slice(0, 2), [
      "authenticateToken",
      "requireProdutosRead",
    ]);
  });
});

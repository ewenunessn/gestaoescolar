import assert from "node:assert/strict";
import { describe, it } from "node:test";
import unidadeMedidaRoutes from "./unidadeMedidaRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = unidadeMedidaRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("unidadeMedidaRoutes authorization contract", () => {
  it("requires product read permission for listing units", () => {
    assert.deepEqual(routeMiddlewareNames("/", "get").slice(0, 2), [
      "authenticateToken",
      "requireProdutosRead",
    ]);
  });

  it("requires product read permission for unit conversion helpers", () => {
    assert.deepEqual(routeMiddlewareNames("/converter", "post").slice(0, 2), [
      "authenticateToken",
      "requireProdutosRead",
    ]);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import produtoRoutes from "./produtoRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = produtoRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("produtoRoutes authorization contract", () => {
  it("requires product read permission for listing products", () => {
    assert.deepEqual(routeMiddlewareNames("/", "get").slice(0, 2), [
      "authenticateToken",
      "requireProdutosRead",
    ]);
  });

  it("requires product read permission for nutritional composition reads", () => {
    assert.deepEqual(routeMiddlewareNames("/:id/composicao-nutricional", "get").slice(0, 2), [
      "authenticateToken",
      "requireProdutosRead",
    ]);
  });

  it("requires product write permission for product creation", () => {
    assert.deepEqual(routeMiddlewareNames("/", "post").slice(0, 2), [
      "authenticateToken",
      "requireProdutosWrite",
    ]);
  });
});

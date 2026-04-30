import assert from "node:assert/strict";
import { describe, it } from "node:test";
import gruposIngredientesRoutes from "./gruposIngredientesRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = gruposIngredientesRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("gruposIngredientesRoutes authorization contract", () => {
  it("requires meal read permission for listing ingredient groups", () => {
    assert.deepEqual(routeMiddlewareNames("/", "get").slice(0, 2), [
      "authenticateToken",
      "requireRefeicoesRead",
    ]);
  });

  it("requires meal write permission for saving group items", () => {
    assert.deepEqual(routeMiddlewareNames("/:id/itens", "put").slice(0, 2), [
      "authenticateToken",
      "requireRefeicoesWrite",
    ]);
  });
});

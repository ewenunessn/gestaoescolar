import assert from "node:assert/strict";
import { describe, it } from "node:test";
import rotaRoutes from "./rotaRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = rotaRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("rotaRoutes authorization contract", () => {
  it("requires route read permission for listing delivery routes", () => {
    assert.deepEqual(routeMiddlewareNames("/rotas", "get").slice(0, 2), [
      "authenticateToken",
      "requireRotasRead",
    ]);
  });

  it("requires route write permission for creating delivery routes", () => {
    assert.deepEqual(routeMiddlewareNames("/rotas", "post").slice(0, 2), [
      "authenticateToken",
      "requireRotasWrite",
    ]);
  });

  it("requires route read permission for listing schools in a route", () => {
    assert.deepEqual(routeMiddlewareNames("/rotas/:rotaId/escolas", "get").slice(0, 2), [
      "authenticateToken",
      "requireRotasRead",
    ]);
  });

  it("requires route write permission for delivery planning changes", () => {
    assert.deepEqual(routeMiddlewareNames("/planejamentos", "post").slice(0, 2), [
      "authenticateToken",
      "requireRotasWrite",
    ]);
  });

  it("requires route read permission for auxiliary school availability checks", () => {
    assert.deepEqual(routeMiddlewareNames("/escolas-disponiveis", "get").slice(0, 2), [
      "authenticateToken",
      "requireRotasRead",
    ]);
  });
});

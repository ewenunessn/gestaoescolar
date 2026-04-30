import assert from "node:assert/strict";
import { describe, it } from "node:test";
import planejamentoComprasRoutes from "./planejamentoComprasRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = planejamentoComprasRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("planejamentoComprasRoutes authorization contract", () => {
  it("requires guide write permission for generating guides", () => {
    assert.deepEqual(routeMiddlewareNames("/gerar-guias", "post").slice(0, 2), [
      "authenticateToken",
      "requireGuiasWrite",
    ]);
  });

  it("requires purchase write permission for generating purchase orders from guides", () => {
    assert.deepEqual(routeMiddlewareNames("/gerar-pedido-da-guia", "post").slice(0, 2), [
      "authenticateToken",
      "requireComprasWrite",
    ]);
  });

  it("requires purchase read permission for listing planning jobs", () => {
    assert.deepEqual(routeMiddlewareNames("/jobs", "get").slice(0, 2), [
      "authenticateToken",
      "requireComprasRead",
    ]);
  });
});

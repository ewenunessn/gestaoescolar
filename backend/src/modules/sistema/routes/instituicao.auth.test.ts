import assert from "node:assert/strict";
import { describe, it } from "node:test";
import instituicaoRoutes from "./instituicao";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = instituicaoRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("instituicaoRoutes authorization contract", () => {
  it("keeps institution reads authenticated for operational PDF/report usage", () => {
    assert.deepEqual(routeMiddlewareNames("/", "get").slice(0, 1), [
      "authenticateToken",
    ]);
  });

  it("requires configuration write permission for updating institution data", () => {
    assert.deepEqual(routeMiddlewareNames("/", "put").slice(0, 2), [
      "authenticateToken",
      "requireConfiguracoesWrite",
    ]);
  });

  it("requires configuration write permission for saving PDF templates", () => {
    assert.deepEqual(routeMiddlewareNames("/templates/:nome", "put").slice(0, 2), [
      "authenticateToken",
      "requireConfiguracoesWrite",
    ]);
  });
});

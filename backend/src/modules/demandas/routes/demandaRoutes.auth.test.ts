import assert from "node:assert/strict";
import { describe, it } from "node:test";
import demandaRoutes from "./demandaRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = demandaRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("demandaRoutes authorization contract", () => {
  it("requires JWT authentication and guide read permission for listing demands", () => {
    assert.deepEqual(routeMiddlewareNames("/", "get").slice(0, 2), [
      "authenticateToken",
      "requireGuiasRead",
    ]);
  });

  it("requires JWT authentication and guide write permission for creating demands", () => {
    assert.deepEqual(routeMiddlewareNames("/", "post").slice(0, 2), [
      "authenticateToken",
      "requireGuiasWrite",
    ]);
  });

  it("requires JWT authentication and guide write permission for changing demand status", () => {
    assert.deepEqual(routeMiddlewareNames("/:id/status", "patch").slice(0, 2), [
      "authenticateToken",
      "requireGuiasWrite",
    ]);
  });
});

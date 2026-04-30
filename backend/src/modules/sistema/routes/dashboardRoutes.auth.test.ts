import assert from "node:assert/strict";
import { describe, it } from "node:test";
import dashboardRoutes from "./dashboardRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = dashboardRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("dashboardRoutes authorization contract", () => {
  it("requires dashboard read permission for dashboard stats", () => {
    assert.deepEqual(routeMiddlewareNames("/stats", "get").slice(0, 2), [
      "authenticateToken",
      "requireDashboardRead",
    ]);
  });
});

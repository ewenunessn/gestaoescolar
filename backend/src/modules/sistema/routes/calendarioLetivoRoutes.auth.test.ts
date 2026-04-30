import assert from "node:assert/strict";
import { describe, it } from "node:test";
import calendarioLetivoRoutes from "./calendarioLetivoRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = calendarioLetivoRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("calendarioLetivoRoutes authorization contract", () => {
  it("requires JWT authentication and calendar read permission for listing calendars", () => {
    assert.deepEqual(routeMiddlewareNames("/calendario-letivo", "get").slice(0, 2), [
      "authenticateToken",
      "requireCalendarioRead",
    ]);
  });

  it("requires JWT authentication and calendar write permission for creating calendars", () => {
    assert.deepEqual(routeMiddlewareNames("/calendario-letivo", "post").slice(0, 2), [
      "authenticateToken",
      "requireCalendarioWrite",
    ]);
  });

  it("requires JWT authentication and calendar write permission for creating events", () => {
    assert.deepEqual(routeMiddlewareNames("/eventos", "post").slice(0, 2), [
      "authenticateToken",
      "requireCalendarioWrite",
    ]);
  });
});

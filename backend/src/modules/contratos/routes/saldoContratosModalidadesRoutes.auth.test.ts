import assert from "node:assert/strict";
import { describe, it } from "node:test";
import saldoContratosModalidadesRoutes from "./saldoContratosModalidadesRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = saldoContratosModalidadesRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("saldoContratosModalidadesRoutes authorization contract", () => {
  it("requires JWT authentication and balance read permission for listing balances", () => {
    assert.deepEqual(routeMiddlewareNames("/", "get").slice(0, 2), [
      "authenticateToken",
      "requireSaldoContratosRead",
    ]);
  });

  it("requires JWT authentication and balance write permission for changing balances", () => {
    assert.deepEqual(routeMiddlewareNames("/", "post").slice(0, 2), [
      "authenticateToken",
      "requireSaldoContratosWrite",
    ]);
  });

  it("requires JWT authentication and balance read permission for balance history", () => {
    assert.deepEqual(routeMiddlewareNames("/:id/historico", "get").slice(0, 2), [
      "authenticateToken",
      "requireSaldoContratosRead",
    ]);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import solicitacoesAlimentosRoutes from "./solicitacoesAlimentosRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = solicitacoesAlimentosRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("solicitacoesAlimentosRoutes authorization contract", () => {
  it("keeps school portal solicitation reads authenticated without administrative RBAC", () => {
    assert.deepEqual(routeMiddlewareNames("/minhas", "get").slice(0, 1), [
      "authenticateToken",
    ]);
  });

  it("requires solicitation read permission for administrative listing", () => {
    assert.deepEqual(routeMiddlewareNames("/", "get").slice(0, 2), [
      "authenticateToken",
      "requireSolicitacoesRead",
    ]);
  });

  it("requires solicitation write permission for administrative item decisions", () => {
    assert.deepEqual(routeMiddlewareNames("/itens/:itemId/aceitar", "patch").slice(0, 2), [
      "authenticateToken",
      "requireSolicitacoesWrite",
    ]);
  });

  it("requires solicitation write permission for approving all pending items", () => {
    assert.deepEqual(routeMiddlewareNames("/:id/aprovar-tudo", "patch").slice(0, 2), [
      "authenticateToken",
      "requireSolicitacoesWrite",
    ]);
  });
});

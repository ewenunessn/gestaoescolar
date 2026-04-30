import assert from "node:assert/strict";
import { describe, it } from "node:test";
import refeicaoCalculosRoutes from "./refeicaoCalculosRoutes";

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = refeicaoCalculosRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || "<anonymous>");
}

describe("refeicaoCalculosRoutes authorization contract", () => {
  it("requires meal read permission for nutritional calculation preview", () => {
    assert.deepEqual(routeMiddlewareNames("/refeicoes/:id/calcular-nutricional", "post").slice(0, 2), [
      "authenticateToken",
      "requireRefeicoesRead",
    ]);
  });

  it("requires meal write permission for applying automatic calculations", () => {
    assert.deepEqual(routeMiddlewareNames("/refeicoes/:id/aplicar-calculos", "post").slice(0, 2), [
      "authenticateToken",
      "requireRefeicoesWrite",
    ]);
  });

  it("requires meal read permission for detailed ingredients", () => {
    assert.deepEqual(routeMiddlewareNames("/refeicoes/:id/ingredientes-detalhados", "get").slice(0, 2), [
      "authenticateToken",
      "requireRefeicoesRead",
    ]);
  });
});

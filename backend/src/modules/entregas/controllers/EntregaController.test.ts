import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getConfirmarEntregaErrorStatus, parseRotaIdsParam } from "./EntregaController";

describe("EntregaController", () => {
  it("maps delivery business rule errors to client errors", () => {
    assert.equal(
      getConfirmarEntregaErrorStatus(new Error("Saldo insuficiente para a movimentacao")),
      400,
    );
    assert.equal(
      getConfirmarEntregaErrorStatus(new Error("Quantidade a entregar (4) e maior que o saldo pendente (2)")),
      400,
    );
    assert.equal(
      getConfirmarEntregaErrorStatus(new Error("Item nao encontrado")),
      400,
    );
  });

  it("keeps unexpected delivery errors as server errors", () => {
    assert.equal(getConfirmarEntregaErrorStatus(new Error("connection terminated")), 500);
  });

  it("parses route ids for offline bundle filters", () => {
    assert.deepEqual(parseRotaIdsParam("1, 2,2,abc,0"), [1, 2]);
    assert.equal(parseRotaIdsParam("todas"), undefined);
    assert.equal(parseRotaIdsParam(undefined), undefined);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSaldoContratosCursorResponse } from "./saldoContratosModalidadesController";

describe("saldoContratosModalidades cursor response", () => {
  it("uses the required cursor pagination shape", () => {
    const response = buildSaldoContratosCursorResponse({
      items: [{ id: 1 }],
      pageSize: 20,
      offset: 40,
      hasMore: true,
      estatisticas: { total_itens: 1 },
    });

    assert.deepEqual(Object.keys(response), [
      "page_size",
      "next_cursor",
      "has_more",
      "items",
      "estatisticas",
    ]);
    assert.equal(response.page_size, 20);
    assert.equal(typeof response.next_cursor, "string");
    assert.equal(response.has_more, true);
    assert.deepEqual(response.items, [{ id: 1 }]);
  });
});

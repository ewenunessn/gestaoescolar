import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildComprasCursorResponse } from "./compraController";

describe("compraController cursor response", () => {
  it("uses the required cursor pagination shape", () => {
    const response = buildComprasCursorResponse({
      items: [{ id: 10 }],
      pageSize: 50,
      offset: 50,
      hasMore: true,
    });

    assert.equal(response.page_size, 50);
    assert.equal(typeof response.next_cursor, "string");
    assert.equal(response.has_more, true);
    assert.deepEqual(response.items, [{ id: 10 }]);
  });
});

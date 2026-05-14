import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getOrderBySQL } from "./pagination";

describe("pagination SQL helpers", () => {
  it("ignores client sort values when no allowlist is provided", () => {
    const sql = getOrderBySQL({
      page: 1,
      limit: 10,
      offset: 0,
      sort: "id; DROP TABLE usuarios; --",
      order: "DESC",
    });

    assert.equal(sql, "ORDER BY id DESC");
  });

  it("uses only explicitly allowed sort fields", () => {
    const sql = getOrderBySQL(
      {
        page: 1,
        limit: 10,
        offset: 0,
        sort: "nome",
        order: "ASC",
      },
      ["id", "nome"],
    );

    assert.equal(sql, "ORDER BY nome ASC");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildRomaneioRouteFilter,
  normalizeRomaneioRouteIds,
} from "./romaneioFilters";

describe("romaneioFilters", () => {
  it("normalizes legacy rota_id and comma-separated rota_ids", () => {
    assert.deepEqual(normalizeRomaneioRouteIds({ rota_id: "7" }), [7]);
    assert.deepEqual(normalizeRomaneioRouteIds({ rota_ids: "1,2,3" }), [1, 2, 3]);
  });

  it("deduplicates and ignores invalid route ids", () => {
    assert.deepEqual(
      normalizeRomaneioRouteIds({ rota_ids: ["2", "abc", "2", "-1", "4"] }),
      [2, 4],
    );
  });

  it("prefers explicit rota_ids but keeps rota_id compatibility", () => {
    assert.deepEqual(normalizeRomaneioRouteIds({ rota_id: "5", rota_ids: "1,2" }), [1, 2, 5]);
  });

  it("builds a parameterized ANY filter for selected routes", () => {
    const filter = buildRomaneioRouteFilter([1, 2], 4);

    assert.equal(filter.values.length, 1);
    assert.deepEqual(filter.values[0], [1, 2]);
    assert.match(filter.sql, /res\.rota_id = ANY\(\$4::int\[\]\)/);
  });

  it("does not add SQL when no routes are selected", () => {
    assert.deepEqual(buildRomaneioRouteFilter([], 3), { sql: "", values: [] });
  });
});

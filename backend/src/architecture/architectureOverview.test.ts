import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildArchitectureOverview } from "./architectureOverview";

describe("architectureOverview", () => {
  it("exposes BFF, cache, realtime and storage contracts", () => {
    const overview = buildArchitectureOverview();

    assert.ok(overview.bff.some((item) => item.prefix === "/bff/web"));
    assert.ok(overview.cache.dashboard);
    assert.ok(overview.realtime.some((item) => item.module === "entregas"));
    assert.deepEqual(overview.storage.providers, ["local", "s3", "supabase"]);
  });
});

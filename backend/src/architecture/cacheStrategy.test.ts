import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CACHE_STRATEGY_BY_MODULE, getCacheStrategy } from "./cacheStrategy";

describe("cacheStrategy", () => {
  it("declares explicit cache policy for high-read modules", () => {
    assert.deepEqual(getCacheStrategy("cardapios"), {
      caches: "Listas e refeicoes de cardapios ativos",
      ttlSeconds: 600,
      invalidatesOn: ["cardapios.write", "refeicoes.write"],
    });
    assert.equal(getCacheStrategy("estoque")?.ttlSeconds, 120);
    assert.equal(getCacheStrategy("dashboard")?.ttlSeconds, 300);
    assert.equal(getCacheStrategy("auth")?.ttlSeconds, "token-expiration");
    assert.equal(getCacheStrategy("nutricao")?.ttlSeconds, 3600);
  });

  it("does not expose an implicit default cache strategy", () => {
    assert.equal(getCacheStrategy("sistema"), undefined);
    assert.ok(Object.keys(CACHE_STRATEGY_BY_MODULE).length >= 5);
  });
});

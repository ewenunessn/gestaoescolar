import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CacheService, type CacheBackend } from "./cacheService";

class FakeCacheBackend implements CacheBackend {
  values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.values.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return Array.from(this.values.keys()).filter((key) => regex.test(key));
  }
}

describe("CacheService", () => {
  it("stores structured values through the configured backend", async () => {
    const backend = new FakeCacheBackend();
    const service = new CacheService(backend);

    await service.set("dashboard:resumo:web", { total: 3 }, 300);

    assert.deepEqual(await service.get("dashboard:resumo:web"), { total: 3 });
    assert.equal(backend.values.has("dashboard:resumo:web"), true);
  });

  it("invalidates entity keys and list keys through backend patterns", async () => {
    const backend = new FakeCacheBackend();
    const service = new CacheService(backend);

    await service.set("cardapios:12", { id: 12 });
    await service.set("cardapios:list:all:5:2026:true", [{ id: 12 }]);
    await service.set("produtos:12", { id: 12 });

    await service.invalidateEntity("cardapios", 12);

    assert.equal(await service.get("cardapios:12"), null);
    assert.equal(await service.get("cardapios:list:all:5:2026:true"), null);
    assert.deepEqual(await service.get("produtos:12"), { id: 12 });
  });
});

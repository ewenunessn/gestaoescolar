import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";

import { TokenBlacklistService } from "./tokenBlacklistService";

class FakeCache {
  values = new Map<string, { value: unknown; ttlSeconds: number }>();

  async get<T>(key: string): Promise<T | null> {
    return (this.values.get(key)?.value as T) ?? null;
  }

  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    this.values.set(key, { value: data, ttlSeconds });
  }
}

describe("TokenBlacklistService", () => {
  it("stores revoked tokens until their JWT expiration", async () => {
    const cache = new FakeCache();
    const service = new TokenBlacklistService(cache, () => 1_000);
    const token = jwt.sign({ sub: "user-1", exp: 1_120 }, "test-secret");

    await service.blacklist(token);

    const [entry] = Array.from(cache.values.values());
    assert.equal(entry.value, true);
    assert.equal(entry.ttlSeconds, 120);
    assert.equal(await service.isBlacklisted(token), true);
  });

  it("does not persist already expired tokens", async () => {
    const cache = new FakeCache();
    const service = new TokenBlacklistService(cache, () => 1_200);
    const token = jwt.sign({ sub: "user-1", exp: 1_120 }, "test-secret");

    await service.blacklist(token);

    assert.equal(cache.values.size, 0);
  });
});

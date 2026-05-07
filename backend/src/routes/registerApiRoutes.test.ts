import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { registerApiRoutes } from "./registerApiRoutes";

describe("registerApiRoutes", () => {
  it("can mount the existing API surface under a BFF prefix", () => {
    const mounted: string[] = [];
    const app = {
      use(prefix: string) {
        mounted.push(prefix);
      },
    };

    registerApiRoutes(app as any, "/bff/web");

    assert.ok(mounted.includes("/bff/web/auth"));
    assert.ok(mounted.includes("/bff/web/dashboard"));
    assert.ok(mounted.includes("/bff/web/entregas"));
    assert.ok(mounted.includes("/bff/web/chatbot"));
    assert.ok(mounted.includes("/bff/web"));
    assert.equal(mounted.includes("/api/auth"), false);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BFF_CHANNELS,
  getBffRouteDefinitions,
  resolveClientChannel,
} from "./clientChannel";

describe("clientChannel gateway helpers", () => {
  it("resolves the BFF client channel from the route prefix", () => {
    assert.equal(resolveClientChannel("/bff/web/dashboard/stats"), "web");
    assert.equal(resolveClientChannel("/bff/app/entregas/42"), "app");
    assert.equal(resolveClientChannel("/bff/portal/solicitacoes-alimentos"), "portal");
    assert.equal(resolveClientChannel("/bff/chatbot/message"), "chatbot");
  });

  it("falls back to api for legacy API routes and rejects unknown BFF channels", () => {
    assert.equal(resolveClientChannel("/api/dashboard/stats"), "api");
    assert.equal(resolveClientChannel("/health"), "public");
    assert.equal(resolveClientChannel("/bff/admin/dashboard"), null);
  });

  it("declares one BFF surface for each supported client", () => {
    const definitions = getBffRouteDefinitions();
    assert.deepEqual(
      definitions.map((definition) => definition.channel),
      BFF_CHANNELS,
    );
    assert.deepEqual(
      definitions.map((definition) => definition.prefix),
      ["/bff/web", "/bff/app", "/bff/portal", "/bff/chatbot"],
    );
  });
});

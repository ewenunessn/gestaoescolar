import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { API_ENDPOINTS, normalizePortalBffEndpoint } from "./api";

describe("estoque escolar API config", () => {
  it("normalizes legacy API paths to the portal BFF", () => {
    assert.equal(normalizePortalBffEndpoint("/api/produtos"), "/bff/portal/produtos");
    assert.equal(
      normalizePortalBffEndpoint("/api/estoque-escola/escola/10"),
      "/bff/portal/estoque-escola/escola/10",
    );
  });

  it("declares portal BFF endpoints for school stock calls", () => {
    assert.equal(API_ENDPOINTS.ESTOQUE_ESCOLA(7), "/bff/portal/estoque-escola/escola/7");
    assert.equal(API_ENDPOINTS.MOVIMENTO_ESTOQUE(7), "/bff/portal/estoque-escola/escola/7/movimentacao");
  });
});

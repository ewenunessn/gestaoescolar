import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildOpenApiDocument } from "./apiDocs";

describe("OpenAPI document", () => {
  it("documents the canonical API surface and shared envelopes", () => {
    const document = buildOpenApiDocument();

    assert.equal(document.openapi, "3.0.3");
    assert.ok(document.paths["/api/contratos"]);
    assert.ok(document.paths["/api/usuarios"]);
    assert.ok(document.components.schemas.ApiSuccessEnvelope);
    assert.ok(document.components.schemas.ValidationErrorEnvelope);
  });
});

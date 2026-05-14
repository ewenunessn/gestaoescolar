import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adaptApiEnvelopeForLegacyClients } from "./apiEnvelope";

describe("frontend API envelope adapter", () => {
  it("unwraps list payloads while preserving data and meta compatibility", () => {
    const adapted = adaptApiEnvelopeForLegacyClients({
      success: true,
      data: [{ id: 1 }],
      meta: { total: 1 },
    }) as any;

    assert.equal(Array.isArray(adapted), true);
    assert.deepEqual([...adapted], [{ id: 1 }]);
    assert.equal(adapted.data, adapted);
    assert.deepEqual(adapted.meta, { total: 1 });
  });

  it("unwraps object payloads while keeping response.data.data working", () => {
    const adapted = adaptApiEnvelopeForLegacyClients({
      success: true,
      data: { id: 7, nome: "Contrato" },
    }) as any;

    assert.equal(adapted.id, 7);
    assert.equal(adapted.nome, "Contrato");
    assert.equal(adapted.success, true);
    assert.equal(adapted.data, adapted);
  });

  it("leaves non-envelope payloads untouched", () => {
    const raw = { id: 1 };

    assert.equal(adaptApiEnvelopeForLegacyClients(raw), raw);
  });
});

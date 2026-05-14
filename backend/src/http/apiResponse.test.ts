import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeApiErrorPayload,
  normalizeApiSuccessPayload,
} from "./apiResponse";

describe("API response normalization", () => {
  it("wraps raw arrays in the standard data envelope", () => {
    assert.deepEqual(normalizeApiSuccessPayload([{ id: 1 }]), {
      success: true,
      data: [{ id: 1 }],
    });
  });

  it("does not infer pagination from legacy list-shaped objects", () => {
    assert.deepEqual(
      normalizeApiSuccessPayload({
        comprovantes: [{ id: 10 }],
        total: 51,
        limit: 25,
        offset: 25,
      }),
      {
        success: true,
        data: {
          comprovantes: [{ id: 10 }],
          total: 51,
          limit: 25,
          offset: 25,
        },
      },
    );
  });

  it("preserves pagination only when an endpoint returns meta explicitly", () => {
    assert.deepEqual(
      normalizeApiSuccessPayload({
        success: true,
        data: [{ id: 10 }],
        meta: { page: 2, total: 51 },
      }),
      {
        success: true,
        data: [{ id: 10 }],
        meta: { page: 2, total: 51 },
      },
    );
  });

  it("keeps standard envelopes but adds data when only a success message exists", () => {
    assert.deepEqual(
      normalizeApiSuccessPayload({ success: true, message: "Registro removido" }),
      {
        success: true,
        data: null,
        message: "Registro removido",
      },
    );
  });

  it("normalizes legacy error bodies without leaking server details for 500", () => {
    assert.deepEqual(
      normalizeApiErrorPayload(500, { error: "password=secret stack trace" }),
      {
        success: false,
        message: "Erro interno do servidor",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro interno do servidor",
        },
      },
    );
  });

  it("does not convert legacy success false payloads into success responses", () => {
    assert.deepEqual(
      normalizeApiSuccessPayload({ success: false, message: "Operacao recusada" }),
      {
        success: false,
        message: "Operacao recusada",
        error: {
          code: "BAD_REQUEST",
          message: "Operacao recusada",
        },
      },
    );
  });
});

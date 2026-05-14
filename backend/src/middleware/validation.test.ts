import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

import { validateBody } from "./validation";

function invokeValidation(body: unknown) {
  const req: any = { body };
  const res: any = {
    statusCode: 200,
    payload: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };
  let nextCalled = false;

  validateBody(
    z.object({
      nome: z.string().min(1, "Nome e obrigatorio"),
      email: z.string().email("Email invalido"),
    }),
  )(req, res, () => {
    nextCalled = true;
  });

  return { res, nextCalled };
}

describe("validation middleware", () => {
  it("returns every invalid field using the standard validation envelope", () => {
    const { res, nextCalled } = invokeValidation({ nome: "", email: "x" });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 422);
    assert.deepEqual(res.payload, {
      success: false,
      message: "Dados invalidos",
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados invalidos",
      },
      errors: [
        { field: "nome", message: "Nome e obrigatorio", code: "too_small" },
        { field: "email", message: "Email invalido", code: "invalid_string" },
      ],
      fields: {
        nome: ["Nome e obrigatorio"],
        email: ["Email invalido"],
      },
    });
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getApiUrl } from "./client";

describe("entregador api client", () => {
  it("uses the app BFF by default", () => {
    assert.equal(getApiUrl(), "https://gestaoescolar-backend.vercel.app/bff/app");
  });

  it("keeps explicit API URL overrides", () => {
    assert.equal(getApiUrl({ EXPO_PUBLIC_API_URL: "http://localhost:3000/api" }), "http://localhost:3000/api");
  });
});

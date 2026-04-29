import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDeliveryPhotoUploadHeaders,
  shouldRetryDeliveryPhotoUpload,
  uploadDeliveryPhotoToSignedUrl,
} from "./deliveryPhotoUpload";

test("builds upload headers from signed URL response headers", () => {
  assert.deepEqual(
    buildDeliveryPhotoUploadHeaders({ "Content-Type": "image/jpeg", "x-amz-meta-test": "ok" }),
    { "Content-Type": "image/jpeg", "x-amz-meta-test": "ok" },
  );
});

test("retries transient upload failures but not validation failures", () => {
  assert.equal(shouldRetryDeliveryPhotoUpload(0), true);
  assert.equal(shouldRetryDeliveryPhotoUpload(500), true);
  assert.equal(shouldRetryDeliveryPhotoUpload(429), true);
  assert.equal(shouldRetryDeliveryPhotoUpload(403), false);
  assert.equal(shouldRetryDeliveryPhotoUpload(413), false);
});

test("uploads photos to Supabase signed upload urls with token", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url === "file:///foto.jpg") {
      return {
        ok: true,
        blob: async () => new Blob(["jpeg"], { type: "image/jpeg" }),
      } as Response;
    }

    return { ok: true } as Response;
  }) as typeof fetch;

  try {
    await uploadDeliveryPhotoToSignedUrl({
      localUri: "file:///foto.jpg",
      uploadUrl: "https://project.supabase.co/storage/v1/object/upload/sign/delivery-photos/path.jpg",
      token: "signed-token",
      headers: { "Content-Type": "image/jpeg" },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    calls[1].url,
    "https://project.supabase.co/storage/v1/object/upload/sign/delivery-photos/path.jpg?token=signed-token",
  );
  assert.equal(calls[1].init?.method, "PUT");
  assert.ok(calls[1].init?.body instanceof FormData);
  assert.deepEqual(calls[1].init?.headers, { "x-upsert": "false" });
});

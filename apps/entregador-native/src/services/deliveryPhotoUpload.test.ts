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
  const readUris: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    if (url.startsWith("file://")) {
      throw new Error("local file fetch should not be used for Supabase uploads");
    }

    calls.push({ url, init });
    return { ok: true } as Response;
  }) as typeof fetch;

  try {
    await uploadDeliveryPhotoToSignedUrl({
      localUri: "file:///foto.jpg",
      uploadUrl: "https://project.supabase.co/storage/v1/object/upload/sign/delivery-photos/path.jpg",
      token: "signed-token",
      headers: { "Content-Type": "image/jpeg" },
      readFileAsArrayBuffer: async (uri: string) => {
        readUris.push(uri);
        return new Uint8Array([1, 2, 3]).buffer;
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(readUris, ["file:///foto.jpg"]);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://project.supabase.co/storage/v1/object/upload/sign/delivery-photos/path.jpg?token=signed-token",
  );
  assert.equal(calls[0].init?.method, "PUT");
  assert.ok(calls[0].init?.body instanceof ArrayBuffer);
  assert.deepEqual(Array.from(new Uint8Array(calls[0].init?.body as ArrayBuffer)), [1, 2, 3]);
  assert.deepEqual(calls[0].init?.headers, {
    "x-upsert": "false",
    "cache-control": "max-age=3600",
    "content-type": "image/jpeg",
  });
});

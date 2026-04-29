import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildComprovanteFotoUploadResponse,
  parseComprovanteFotoUploadRequest,
  validateComprovanteFotoStorageKey,
} from "./ComprovanteFotoController";

describe("ComprovanteFotoController helpers", () => {
  it("parses valid upload request bodies", () => {
    assert.deepEqual(
      parseComprovanteFotoUploadRequest({ content_type: "image/jpg", size_bytes: 1234 }),
      { contentType: "image/jpeg", sizeBytes: 1234 },
    );
  });

  it("rejects invalid upload request bodies", () => {
    assert.throws(
      () => parseComprovanteFotoUploadRequest({ content_type: "image/png", size_bytes: 1234 }),
      /A foto deve ser enviada em JPEG/,
    );
  });

  it("validates storage key ownership", () => {
    assert.doesNotThrow(() =>
      validateComprovanteFotoStorageKey("entregas/comprovantes/10/foto.jpg", 10),
    );
    assert.throws(
      () => validateComprovanteFotoStorageKey("entregas/comprovantes/11/foto.jpg", 10),
      /storage_key nao pertence/,
    );
  });

  it("includes Supabase signed upload token in the upload response", () => {
    const response = buildComprovanteFotoUploadResponse({
      signedUpload: {
        url: "https://project.supabase.co/storage/v1/object/upload/sign/delivery-photos/path.jpg",
        path: "entregas/comprovantes/10/foto.jpg",
        token: "signed-token",
        headers: { "Content-Type": "image/jpeg" },
      },
      storageKey: "entregas/comprovantes/10/foto.jpg",
      expiresAt: new Date("2026-10-26T12:00:00.000Z"),
    });

    assert.deepEqual(response, {
      upload_url: "https://project.supabase.co/storage/v1/object/upload/sign/delivery-photos/path.jpg",
      upload_path: "entregas/comprovantes/10/foto.jpg",
      upload_token: "signed-token",
      storage_key: "entregas/comprovantes/10/foto.jpg",
      headers: { "Content-Type": "image/jpeg" },
      expires_at: "2026-10-26T12:00:00.000Z",
    });
  });
});

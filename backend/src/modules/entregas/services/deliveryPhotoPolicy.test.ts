import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DELIVERY_PHOTO_DEFAULT_MAX_BYTES,
  DELIVERY_PHOTO_DEFAULT_RETENTION_DAYS,
  assertValidDeliveryPhotoUpload,
  buildDeliveryPhotoExpiresAt,
  createDeliveryPhotoStorageKey,
  normalizeDeliveryPhotoContentType,
} from "./deliveryPhotoPolicy";

describe("deliveryPhotoPolicy", () => {
  it("accepts jpeg uploads inside the size limit", () => {
    assert.doesNotThrow(() =>
      assertValidDeliveryPhotoUpload({
        contentType: "image/jpeg",
        sizeBytes: DELIVERY_PHOTO_DEFAULT_MAX_BYTES,
      }),
    );
  });

  it("rejects non-jpeg uploads and oversized files", () => {
    assert.throws(
      () => assertValidDeliveryPhotoUpload({ contentType: "image/png", sizeBytes: 10 }),
      /A foto deve ser enviada em JPEG/,
    );
    assert.throws(
      () =>
        assertValidDeliveryPhotoUpload({
          contentType: "image/jpeg",
          sizeBytes: DELIVERY_PHOTO_DEFAULT_MAX_BYTES + 1,
        }),
      /A foto deve ter no maximo 5 MB/,
    );
  });

  it("normalizes common jpeg content type variants", () => {
    assert.equal(normalizeDeliveryPhotoContentType("image/jpg"), "image/jpeg");
    assert.equal(normalizeDeliveryPhotoContentType("IMAGE/JPEG"), "image/jpeg");
  });

  it("creates a storage key scoped to the comprovante", () => {
    const key = createDeliveryPhotoStorageKey(42, "550e8400-e29b-41d4-a716-446655440000");
    assert.equal(key, "entregas/comprovantes/42/550e8400-e29b-41d4-a716-446655440000.jpg");
  });

  it("calculates expiration with 180 day retention by default", () => {
    const createdAt = new Date("2026-04-28T12:00:00.000Z");
    const expiresAt = buildDeliveryPhotoExpiresAt(createdAt);

    assert.equal(DELIVERY_PHOTO_DEFAULT_RETENTION_DAYS, 180);
    assert.equal(expiresAt.toISOString(), "2026-10-25T12:00:00.000Z");
  });
});

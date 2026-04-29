import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DeliveryPhotoStorage,
  readDeliveryPhotoStorageEnv,
} from "./deliveryPhotoStorage";

describe("deliveryPhotoStorage", () => {
  it("reads Supabase storage config from environment", () => {
    const config = readDeliveryPhotoStorageEnv({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      SUPABASE_STORAGE_BUCKET: "delivery-photos",
    });

    assert.equal(config.url, "https://project.supabase.co");
    assert.equal(config.serviceRoleKey, "service-role");
    assert.equal(config.bucket, "delivery-photos");
  });

  it("requires the Supabase environment variables", () => {
    assert.throws(() => readDeliveryPhotoStorageEnv({}), /SUPABASE_URL/);
  });

  it("creates upload and read signed urls through the injected Supabase client", async () => {
    const calls: string[] = [];
    const storage = new DeliveryPhotoStorage({
      bucket: "delivery-photos",
      client: {
        storage: {
          from(bucket: string) {
            calls.push(bucket);
            return {
              async createSignedUploadUrl(path: string, options: { upsert: boolean }) {
                assert.equal(path, "entregas/comprovantes/1/photo.jpg");
                assert.deepEqual(options, { upsert: false });
                return {
                  data: {
                    signedUrl: "https://upload.example",
                    path,
                    token: "upload-token",
                  },
                  error: null,
                };
              },
              async createSignedUrl(path: string, expiresIn: number) {
                assert.equal(path, "entregas/comprovantes/1/photo.jpg");
                assert.equal(expiresIn, 300);
                return {
                  data: { signedUrl: "https://read.example" },
                  error: null,
                };
              },
            };
          },
        },
      } as never,
    });

    const upload = await storage.createUploadUrl({
      storageKey: "entregas/comprovantes/1/photo.jpg",
      contentType: "image/jpeg",
    });
    const read = await storage.createReadUrl("entregas/comprovantes/1/photo.jpg");

    assert.equal(upload.url, "https://upload.example");
    assert.equal(upload.path, "entregas/comprovantes/1/photo.jpg");
    assert.equal(upload.token, "upload-token");
    assert.deepEqual(upload.headers, { "Content-Type": "image/jpeg" });
    assert.equal(read.url, "https://read.example");
    assert.deepEqual(calls, ["delivery-photos", "delivery-photos"]);
  });
});

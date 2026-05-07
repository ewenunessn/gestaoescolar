import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getStorageProviderName,
  isValidStorageProviderName,
  type StorageProvider,
} from "./storageProvider";

describe("storageProvider", () => {
  it("resolves provider from env with local as explicit default", () => {
    assert.equal(getStorageProviderName({ STORAGE_PROVIDER: "s3" }), "s3");
    assert.equal(getStorageProviderName({ STORAGE_PROVIDER: "supabase" }), "supabase");
    assert.equal(getStorageProviderName({}), "local");
  });

  it("rejects unknown storage providers", () => {
    assert.equal(isValidStorageProviderName("local"), true);
    assert.equal(isValidStorageProviderName("s3"), true);
    assert.equal(isValidStorageProviderName("supabase"), true);
    assert.equal(isValidStorageProviderName("filesystem"), false);
    assert.throws(() => getStorageProviderName({ STORAGE_PROVIDER: "filesystem" }), /STORAGE_PROVIDER/);
  });

  it("defines upload and delete as the provider boundary", async () => {
    const calls: string[] = [];
    const provider: StorageProvider = {
      upload: async (file, path) => {
        calls.push(`upload:${path}:${file.byteLength}`);
        return `/uploads/${path}`;
      },
      delete: async (path) => {
        calls.push(`delete:${path}`);
      },
    };

    const url = await provider.upload(Buffer.from("foto"), "logos/escola.jpg");
    await provider.delete("logos/escola.jpg");

    assert.equal(url, "/uploads/logos/escola.jpg");
    assert.deepEqual(calls, ["upload:logos/escola.jpg:4", "delete:logos/escola.jpg"]);
  });
});

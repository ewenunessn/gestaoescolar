import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { LocalStorageProvider } from "./storageProvider";

describe("LocalStorageProvider", () => {
  it("stores files under the configured upload root and returns a public uploads URL", async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), "nutrilog-storage-"));
    try {
      const provider = new LocalStorageProvider(rootDir);

      const url = await provider.upload(Buffer.from("logo"), "logos/escola.png");

      assert.equal(url, "/uploads/logos/escola.png");
      assert.equal(await readFile(path.join(rootDir, "logos", "escola.png"), "utf8"), "logo");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("rejects paths outside the upload root", async () => {
    const provider = new LocalStorageProvider(await mkdtemp(path.join(tmpdir(), "nutrilog-storage-")));

    await assert.rejects(() => provider.upload(Buffer.from("x"), "../secret.txt"), /Caminho de storage invalido/);
  });
});

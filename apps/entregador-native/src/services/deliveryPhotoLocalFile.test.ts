import test from "node:test";
import assert from "node:assert/strict";

import {
  getDeliveryPhotoLocalFileSize,
  persistDeliveryPhotoLocalFile,
  readDeliveryPhotoAsArrayBuffer,
} from "./deliveryPhotoLocalFile";

test("copies captured delivery photo to app document storage", async () => {
  const calls: Array<{ from: string; to: string }> = [];
  const uri = await persistDeliveryPhotoLocalFile("file:///camera-cache/photo.jpg", {
    now: () => 123456,
    fileSystem: {
      documentDirectory: "file:///app-documents/",
      makeDirectoryAsync: async () => undefined,
      copyAsync: async ({ from, to }) => {
        calls.push({ from, to });
      },
    },
  });

  assert.equal(uri, "file:///app-documents/delivery-photos/entrega-123456.jpg");
  assert.deepEqual(calls, [
    {
      from: "file:///camera-cache/photo.jpg",
      to: "file:///app-documents/delivery-photos/entrega-123456.jpg",
    },
  ]);
});

test("reads captured delivery photo size from the device file system", async () => {
  const size = await getDeliveryPhotoLocalFileSize("file:///app-documents/delivery-photos/entrega-123456.jpg", {
    fileSystem: {
      documentDirectory: "file:///app-documents/",
      makeDirectoryAsync: async () => undefined,
      copyAsync: async () => undefined,
      getInfoAsync: async (uri) => ({
        exists: uri === "file:///app-documents/delivery-photos/entrega-123456.jpg",
        size: 4567,
      }),
      readAsStringAsync: async () => "",
      EncodingType: { Base64: "base64" },
    },
  });

  assert.equal(size, 4567);
});

test("reads captured delivery photo bytes as an ArrayBuffer without using fetch", async () => {
  const buffer = await readDeliveryPhotoAsArrayBuffer("file:///app-documents/delivery-photos/entrega-123456.jpg", {
    fileSystem: {
      documentDirectory: "file:///app-documents/",
      makeDirectoryAsync: async () => undefined,
      copyAsync: async () => undefined,
      getInfoAsync: async () => ({ exists: true, size: 4 }),
      readAsStringAsync: async (_uri, options) => {
        assert.deepEqual(options, { encoding: "base64" });
        return "AQID/w==";
      },
      EncodingType: { Base64: "base64" },
    },
  });

  assert.deepEqual(Array.from(new Uint8Array(buffer)), [1, 2, 3, 255]);
});

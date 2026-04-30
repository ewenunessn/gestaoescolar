interface DeliveryPhotoFileSystem {
  documentDirectory: string | null;
  EncodingType?: { Base64: string };
  makeDirectoryAsync(uri: string, options?: { intermediates?: boolean }): Promise<void>;
  copyAsync(options: { from: string; to: string }): Promise<void>;
  getInfoAsync?(
    uri: string,
    options?: { size?: boolean },
  ): Promise<{ exists: boolean; size?: number }>;
  readAsStringAsync?(uri: string, options?: { encoding?: string }): Promise<string>;
}

declare function require(moduleName: string): DeliveryPhotoFileSystem;

function loadDefaultFileSystem(): DeliveryPhotoFileSystem {
  return require("expo-file-system");
}

export async function persistDeliveryPhotoLocalFile(
  uri: string,
  options: {
    fileSystem?: DeliveryPhotoFileSystem;
    now?: () => number;
  } = {},
): Promise<string> {
  const fileSystem = options.fileSystem || loadDefaultFileSystem();
  const documentDirectory = fileSystem.documentDirectory;
  if (!documentDirectory) {
    return uri;
  }

  const baseDirectory = documentDirectory.endsWith("/")
    ? documentDirectory
    : `${documentDirectory}/`;
  const photoDirectory = `${baseDirectory}delivery-photos`;
  const targetUri = `${photoDirectory}/entrega-${options.now?.() || Date.now()}.jpg`;

  await fileSystem.makeDirectoryAsync(photoDirectory, { intermediates: true });
  await fileSystem.copyAsync({ from: uri, to: targetUri });

  return targetUri;
}

export async function getDeliveryPhotoLocalFileSize(
  uri: string,
  options: { fileSystem?: DeliveryPhotoFileSystem } = {},
): Promise<number> {
  const fileSystem = options.fileSystem || loadDefaultFileSystem();
  const info = await fileSystem.getInfoAsync?.(uri, { size: true });

  if (info?.exists && typeof info.size === "number" && info.size > 0) {
    return info.size;
  }

  return (await readDeliveryPhotoAsArrayBuffer(uri, { fileSystem })).byteLength;
}

export async function readDeliveryPhotoAsArrayBuffer(
  uri: string,
  options: { fileSystem?: DeliveryPhotoFileSystem } = {},
): Promise<ArrayBuffer> {
  const fileSystem = options.fileSystem || loadDefaultFileSystem();

  if (!fileSystem.readAsStringAsync) {
    throw new Error("Nao foi possivel ler a foto salva no aparelho.");
  }

  const base64 = await fileSystem.readAsStringAsync(uri, {
    encoding: fileSystem.EncodingType?.Base64 || "base64",
  });

  return decodeBase64ToArrayBuffer(base64);
}

export function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const normalized = base64.replace(/\s/g, "");
  const bytes = new Uint8Array(Math.max(0, Math.floor((normalized.length * 3) / 4) - getBase64Padding(normalized)));
  let buffer = 0;
  let bits = 0;
  let byteIndex = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (char === "=") {
      break;
    }

    const value = BASE64_LOOKUP[char];
    if (value === undefined) {
      throw new Error("Foto salva em formato invalido.");
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes[byteIndex] = (buffer >> bits) & 0xff;
      byteIndex += 1;
    }
  }

  return bytes.buffer;
}

function getBase64Padding(value: string): number {
  if (value.endsWith("==")) {
    return 2;
  }

  if (value.endsWith("=")) {
    return 1;
  }

  return 0;
}

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64_LOOKUP = BASE64_ALPHABET.split("").reduce<Record<string, number>>((lookup, char, index) => {
  lookup[char] = index;
  return lookup;
}, {});

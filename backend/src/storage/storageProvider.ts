import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const STORAGE_PROVIDER_NAMES = ["local", "s3", "supabase"] as const;

export type StorageProviderName = (typeof STORAGE_PROVIDER_NAMES)[number];

export interface StorageProvider {
  upload(file: Buffer, path: string): Promise<string>;
  delete(path: string): Promise<void>;
}

export interface StorageProviderEnv {
  [key: string]: string | undefined;
  STORAGE_PROVIDER?: string;
}

export function isValidStorageProviderName(value: string): value is StorageProviderName {
  return STORAGE_PROVIDER_NAMES.includes(value as StorageProviderName);
}

export function getStorageProviderName(env: StorageProviderEnv = process.env): StorageProviderName {
  const provider = env.STORAGE_PROVIDER || "local";

  if (!isValidStorageProviderName(provider)) {
    throw new Error(`STORAGE_PROVIDER invalido: ${provider}`);
  }

  return provider;
}

function normalizeStoragePath(storagePath: string): string {
  const normalized = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");

  if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Caminho de storage invalido.");
  }

  return normalized;
}

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly uploadRoot = path.resolve(__dirname, "../../uploads")) {}

  async upload(file: Buffer, storagePath: string): Promise<string> {
    const normalized = normalizeStoragePath(storagePath);
    const target = path.resolve(this.uploadRoot, normalized);
    const root = path.resolve(this.uploadRoot);

    if (!target.startsWith(root)) {
      throw new Error("Caminho de storage invalido.");
    }

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file);
    return `/uploads/${normalized}`;
  }

  async delete(storagePath: string): Promise<void> {
    const normalized = normalizeStoragePath(storagePath);
    const target = path.resolve(this.uploadRoot, normalized);
    const root = path.resolve(this.uploadRoot);

    if (!target.startsWith(root)) {
      throw new Error("Caminho de storage invalido.");
    }

    try {
      await unlink(target);
    } catch (error: any) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    if (!env.AWS_S3_BUCKET || !env.AWS_S3_REGION) {
      throw new Error("AWS_S3_BUCKET e AWS_S3_REGION sao obrigatorios para STORAGE_PROVIDER=s3.");
    }

    this.bucket = env.AWS_S3_BUCKET;
    this.publicBaseUrl = env.AWS_S3_PUBLIC_BASE || `https://${this.bucket}.s3.${env.AWS_S3_REGION}.amazonaws.com`;
    this.client = new S3Client({
      region: env.AWS_S3_REGION,
      credentials: env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
    });
  }

  async upload(file: Buffer, storagePath: string): Promise<string> {
    const normalized = normalizeStoragePath(storagePath);
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: normalized,
      Body: file,
    }));
    return `${this.publicBaseUrl.replace(/\/$/, "")}/${normalized}`;
  }

  async delete(storagePath: string): Promise<void> {
    const normalized = normalizeStoragePath(storagePath);
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: normalized,
    }));
  }
}

export function createStorageProvider(env: StorageProviderEnv = process.env): StorageProvider {
  const provider = getStorageProviderName(env);

  if (provider === "local") return new LocalStorageProvider();
  if (provider === "s3") return new S3StorageProvider(process.env);

  throw new Error("STORAGE_PROVIDER=supabase ainda usa o provider especifico de comprovantes.");
}

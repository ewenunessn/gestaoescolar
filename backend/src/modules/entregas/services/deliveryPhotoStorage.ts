import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  DELIVERY_PHOTO_READ_URL_TTL_SECONDS,
} from "./deliveryPhotoPolicy";

export interface DeliveryPhotoStorageEnv {
  [key: string]: string | undefined;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
}

export interface DeliveryPhotoStorageConfig {
  url: string;
  serviceRoleKey: string;
  bucket: string;
}

interface SupabaseStorageBucket {
  createSignedUploadUrl(
    path: string,
    options?: { upsert?: boolean },
  ): Promise<{ data: { signedUrl: string; path: string; token: string } | null; error: Error | null }>;
  createSignedUrl(
    path: string,
    expiresIn: number,
  ): Promise<{ data: { signedUrl: string } | null; error: Error | null }>;
}

interface SupabaseStorageClient {
  storage: {
    from(bucket: string): SupabaseStorageBucket;
  };
}

export function readDeliveryPhotoStorageEnv(env: DeliveryPhotoStorageEnv = process.env): DeliveryPhotoStorageConfig {
  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_STORAGE_BUCKET",
  ] as const;

  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Variavel de ambiente obrigatoria ausente: ${key}`);
    }
  }

  return {
    url: env.SUPABASE_URL as string,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY as string,
    bucket: env.SUPABASE_STORAGE_BUCKET as string,
  };
}

export function createSupabaseStorageClient(config: DeliveryPhotoStorageConfig): SupabaseClient {
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export class DeliveryPhotoStorage {
  private readonly bucket: string;
  private readonly client: SupabaseStorageClient;

  constructor(options?: { bucket?: string; client?: SupabaseStorageClient }) {
    const envConfig = options?.bucket ? null : readDeliveryPhotoStorageEnv();
    this.bucket = options?.bucket || envConfig!.bucket;
    this.client = options?.client || createSupabaseStorageClient(envConfig!);
  }

  async createUploadUrl(input: { storageKey: string; contentType: "image/jpeg" }) {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(input.storageKey, { upsert: false });

    if (error || !data?.signedUrl || !data?.token) {
      throw error || new Error("Supabase nao retornou URL assinada de upload.");
    }

    return {
      url: data.signedUrl,
      path: data.path || input.storageKey,
      token: data.token,
      headers: { "Content-Type": input.contentType },
    };
  }

  async createReadUrl(storageKey: string) {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, DELIVERY_PHOTO_READ_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      throw error || new Error("Supabase nao retornou URL assinada de leitura.");
    }

    return {
      url: data.signedUrl,
    };
  }
}

export default {
  createUploadUrl(input: { storageKey: string; contentType: "image/jpeg" }) {
    return new DeliveryPhotoStorage().createUploadUrl(input);
  },
  createReadUrl(storageKey: string) {
    return new DeliveryPhotoStorage().createReadUrl(storageKey);
  },
};

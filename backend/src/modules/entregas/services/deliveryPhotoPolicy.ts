import crypto from "node:crypto";

export const DELIVERY_PHOTO_DEFAULT_RETENTION_DAYS = 180;
export const DELIVERY_PHOTO_DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
export const DELIVERY_PHOTO_UPLOAD_URL_TTL_SECONDS = 5 * 60;
export const DELIVERY_PHOTO_READ_URL_TTL_SECONDS = 5 * 60;

export interface DeliveryPhotoUploadInput {
  contentType: unknown;
  sizeBytes: unknown;
}

export function normalizeDeliveryPhotoContentType(contentType: unknown): string {
  const normalized = String(contentType || "").trim().toLowerCase();
  return normalized === "image/jpg" ? "image/jpeg" : normalized;
}

export function getDeliveryPhotoMaxBytes(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.DELIVERY_PHOTO_MAX_BYTES);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DELIVERY_PHOTO_DEFAULT_MAX_BYTES;
}

export function getDeliveryPhotoRetentionDays(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.DELIVERY_PHOTO_RETENTION_DAYS);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DELIVERY_PHOTO_DEFAULT_RETENTION_DAYS;
}

export function assertValidDeliveryPhotoUpload(
  input: DeliveryPhotoUploadInput,
  env: NodeJS.ProcessEnv = process.env,
): { contentType: "image/jpeg"; sizeBytes: number } {
  const contentType = normalizeDeliveryPhotoContentType(input.contentType);
  if (contentType !== "image/jpeg") {
    throw new Error("A foto deve ser enviada em JPEG.");
  }

  const sizeBytes = Number(input.sizeBytes);
  const maxBytes = getDeliveryPhotoMaxBytes(env);
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw new Error("O tamanho da foto deve ser informado em bytes.");
  }
  if (sizeBytes > maxBytes) {
    throw new Error("A foto deve ter no maximo 5 MB.");
  }

  return { contentType: "image/jpeg", sizeBytes };
}

export function createDeliveryPhotoStorageKey(comprovanteId: number, id = crypto.randomUUID()): string {
  if (!Number.isInteger(comprovanteId) || comprovanteId <= 0) {
    throw new Error("ID do comprovante invalido.");
  }

  return `entregas/comprovantes/${comprovanteId}/${id}.jpg`;
}

export function storageKeyBelongsToComprovante(storageKey: string, comprovanteId: number): boolean {
  return storageKey.startsWith(`entregas/comprovantes/${comprovanteId}/`) && storageKey.endsWith(".jpg");
}

export function buildDeliveryPhotoExpiresAt(
  uploadedAt = new Date(),
  retentionDays = DELIVERY_PHOTO_DEFAULT_RETENTION_DAYS,
): Date {
  return new Date(uploadedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
}

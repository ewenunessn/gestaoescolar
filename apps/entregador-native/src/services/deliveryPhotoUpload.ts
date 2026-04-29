export function buildDeliveryPhotoUploadHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(([key, value]) => key.trim().length > 0 && String(value).trim().length > 0),
  );
}

export function shouldRetryDeliveryPhotoUpload(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

export async function getLocalPhotoBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("Nao foi possivel ler a foto salva no aparelho.");
  }
  return response.blob();
}

function buildSupabaseSignedUploadUrl(uploadUrl: string, token?: string): string {
  if (!token || /[?&]token=/.test(uploadUrl)) {
    return uploadUrl;
  }

  const separator = uploadUrl.includes("?") ? "&" : "?";
  return `${uploadUrl}${separator}token=${encodeURIComponent(token)}`;
}

function buildSupabaseSignedUploadBody(body: Blob): FormData {
  const formData = new FormData();
  formData.append("cacheControl", "3600");
  formData.append("", body as unknown as string);
  return formData;
}

export async function uploadDeliveryPhotoToSignedUrl(input: {
  localUri: string;
  uploadUrl: string;
  token?: string;
  headers: Record<string, string>;
}): Promise<void> {
  const body = await getLocalPhotoBlob(input.localUri);
  if (input.token) {
    const response = await fetch(buildSupabaseSignedUploadUrl(input.uploadUrl, input.token), {
      method: "PUT",
      headers: { "x-upsert": "false" },
      body: buildSupabaseSignedUploadBody(body),
    });

    if (!response.ok) {
      const error = new Error(`Falha ao enviar foto da entrega. HTTP ${response.status}`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    return;
  }

  const response = await fetch(input.uploadUrl, {
    method: "PUT",
    headers: buildDeliveryPhotoUploadHeaders(input.headers),
    body,
  });

  if (!response.ok) {
    const error = new Error(`Falha ao enviar foto da entrega. HTTP ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
}

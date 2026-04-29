import { Request, Response } from "express";

import ComprovanteEntregaModel from "../models/ComprovanteEntrega";
import ComprovanteFotoModel from "../models/ComprovanteFoto";
import deliveryPhotoStorage from "../services/deliveryPhotoStorage";
import {
  assertValidDeliveryPhotoUpload,
  buildDeliveryPhotoExpiresAt,
  createDeliveryPhotoStorageKey,
  getDeliveryPhotoRetentionDays,
  storageKeyBelongsToComprovante,
} from "../services/deliveryPhotoPolicy";

export function parseComprovanteFotoUploadRequest(body: any): { contentType: "image/jpeg"; sizeBytes: number } {
  return assertValidDeliveryPhotoUpload({
    contentType: body?.content_type,
    sizeBytes: body?.size_bytes,
  });
}

export function validateComprovanteFotoStorageKey(storageKey: unknown, comprovanteId: number): string {
  const key = String(storageKey || "");
  if (!storageKeyBelongsToComprovante(key, comprovanteId)) {
    throw new Error("storage_key nao pertence a este comprovante.");
  }
  return key;
}

export function buildComprovanteFotoUploadResponse(input: {
  signedUpload: {
    url: string;
    path?: string;
    token?: string;
    headers: Record<string, string>;
  };
  storageKey: string;
  expiresAt: Date;
}) {
  return {
    upload_url: input.signedUpload.url,
    upload_path: input.signedUpload.path || input.storageKey,
    upload_token: input.signedUpload.token,
    storage_key: input.storageKey,
    headers: input.signedUpload.headers,
    expires_at: input.expiresAt.toISOString(),
  };
}

class ComprovanteFotoController {
  async solicitarUploadUrl(req: Request, res: Response) {
    try {
      const comprovanteId = Number(req.params.id);
      const comprovante = await ComprovanteEntregaModel.buscarPorId(comprovanteId);
      if (!comprovante) {
        return res.status(404).json({ error: "Comprovante nao encontrado" });
      }

      const upload = parseComprovanteFotoUploadRequest(req.body);
      const storageKey = createDeliveryPhotoStorageKey(comprovanteId);
      const expiresAt = buildDeliveryPhotoExpiresAt(new Date(), getDeliveryPhotoRetentionDays());
      await ComprovanteFotoModel.criarOuSubstituirPendente({
        comprovante_id: comprovanteId,
        storage_key: storageKey,
        content_type: upload.contentType,
        size_bytes: upload.sizeBytes,
        expires_at: expiresAt,
      });

      const signedUpload = await deliveryPhotoStorage.createUploadUrl({
        storageKey,
        contentType: upload.contentType,
      });

      res.json(buildComprovanteFotoUploadResponse({ signedUpload, storageKey, expiresAt }));
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Erro ao gerar URL de upload";
      const status = /JPEG|tamanho|bytes|ja possui|storage_key/.test(message) ? 400 : 500;
      res.status(status).json({ error: message });
    }
  }

  async confirmarUpload(req: Request, res: Response) {
    try {
      const comprovanteId = Number(req.params.id);
      const storageKey = validateComprovanteFotoStorageKey(req.body?.storage_key, comprovanteId);
      const foto = await ComprovanteFotoModel.confirmarUpload(comprovanteId, storageKey);
      res.json({ foto });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Erro ao confirmar upload";
      res.status(400).json({ error: message });
    }
  }

  async obterFoto(req: Request, res: Response) {
    try {
      const comprovanteId = Number(req.params.id);
      const foto = await ComprovanteFotoModel.buscarAtivaPorComprovanteId(comprovanteId);
      if (!foto) {
        return res.status(404).json({ error: "Foto nao encontrada ou expirada" });
      }

      const signedRead = await deliveryPhotoStorage.createReadUrl(foto.storage_key);
      res.json({
        url: signedRead.url,
        expires_at: foto.expires_at,
        uploaded_at: foto.uploaded_at,
        content_type: foto.content_type,
        size_bytes: foto.size_bytes,
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Erro ao buscar foto";
      res.status(500).json({ error: message });
    }
  }
}

export default new ComprovanteFotoController();

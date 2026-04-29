import db from "../../../database";

export interface ComprovanteFotoRecord {
  id: number;
  comprovante_id: number;
  storage_key: string;
  content_type: string;
  size_bytes: number;
  status: "pending" | "uploaded" | "expired";
  uploaded_at?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CriarFotoPendenteData {
  comprovante_id: number;
  storage_key: string;
  content_type: string;
  size_bytes: number;
  expires_at: Date;
}

class ComprovanteFotoModel {
  async criarOuSubstituirPendente(dados: CriarFotoPendenteData): Promise<ComprovanteFotoRecord> {
    const result = await db.query(
      `
        INSERT INTO comprovante_fotos (
          comprovante_id,
          storage_key,
          content_type,
          size_bytes,
          status,
          expires_at
        ) VALUES ($1, $2, $3, $4, 'pending', $5)
        ON CONFLICT (comprovante_id) DO UPDATE SET
          storage_key = EXCLUDED.storage_key,
          content_type = EXCLUDED.content_type,
          size_bytes = EXCLUDED.size_bytes,
          status = 'pending',
          uploaded_at = NULL,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
        WHERE comprovante_fotos.status <> 'uploaded'
        RETURNING *
      `,
      [dados.comprovante_id, dados.storage_key, dados.content_type, dados.size_bytes, dados.expires_at],
    );

    if (result.rows.length === 0) {
      throw new Error("Este comprovante ja possui foto enviada.");
    }

    return result.rows[0];
  }

  async confirmarUpload(comprovanteId: number, storageKey: string): Promise<ComprovanteFotoRecord> {
    const result = await db.query(
      `
        UPDATE comprovante_fotos
        SET status = 'uploaded', uploaded_at = NOW(), updated_at = NOW()
        WHERE comprovante_id = $1 AND storage_key = $2 AND status = 'pending'
        RETURNING *
      `,
      [comprovanteId, storageKey],
    );

    if (result.rows.length === 0) {
      throw new Error("Foto pendente nao encontrada para este comprovante.");
    }

    return result.rows[0];
  }

  async buscarAtivaPorComprovanteId(comprovanteId: number): Promise<ComprovanteFotoRecord | null> {
    const result = await db.query(
      `
        SELECT *
        FROM comprovante_fotos
        WHERE comprovante_id = $1
          AND status = 'uploaded'
          AND expires_at > NOW()
        LIMIT 1
      `,
      [comprovanteId],
    );

    return result.rows[0] || null;
  }
}

export default new ComprovanteFotoModel();

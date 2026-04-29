# Foto de Comprovante de Entrega no Cloudflare Implementation Plan

> Superseded em 2026-04-29 pela migracao para Supabase Storage no plano `docs/superpowers/plans/2026-04-29-foto-comprovante-supabase-storage.md`. O codigo atual usa Supabase Storage; este arquivo fica apenas como historico do plano original.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar uma foto unica da mercadoria por comprovante de entrega, armazenando a imagem no Cloudflare R2 por 180 dias e mantendo no banco somente metadados.

**Architecture:** O backend gera URLs assinadas para upload e leitura no R2, persiste metadados em uma tabela propria e nunca recebe o binario da foto no fluxo normal. O app `entregador-native` captura a foto na etapa de revisao, guarda o URI local na outbox e sincroniza na ordem entrega -> comprovante -> upload da foto -> confirmacao da foto. As telas de comprovantes exibem a foto por URL assinada enquanto ela nao estiver expirada.

**Tech Stack:** Express, TypeScript, PostgreSQL, node:test via `tsx`, AWS SDK S3 compatible client for Cloudflare R2, React Native Expo, `expo-camera`, AsyncStorage outbox.

---

## File Structure

- Create: `backend/src/modules/entregas/services/deliveryPhotoPolicy.ts` - regras puras de content type, tamanho, retencao e chave do objeto.
- Create: `backend/src/modules/entregas/services/deliveryPhotoPolicy.test.ts` - testes unitarios das regras de foto.
- Create: `backend/src/migrations/20260428_comprovante_fotos.sql` - tabela de metadados de fotos do comprovante.
- Create: `backend/src/modules/entregas/models/ComprovanteFoto.ts` - acesso a dados de metadata da foto.
- Create: `backend/src/modules/entregas/models/ComprovanteFoto.test.ts` - teste estatico da migracao e contratos SQL principais.
- Create: `backend/src/modules/entregas/services/deliveryPhotoStorage.ts` - cliente Cloudflare R2 e URLs assinadas.
- Create: `backend/src/modules/entregas/services/deliveryPhotoStorage.test.ts` - teste unitario com assinador injetado.
- Create: `backend/src/modules/entregas/controllers/ComprovanteFotoController.ts` - endpoints de upload-url, confirmar upload e leitura.
- Create: `backend/src/modules/entregas/controllers/ComprovanteFotoController.test.ts` - testes das validacoes exportadas pelo controller.
- Modify: `backend/src/modules/entregas/routes/entregaRoutes.ts` - rotas de foto do comprovante.
- Modify: `backend/package.json`, `backend/package-lock.json` - adicionar `@aws-sdk/s3-request-presigner`.
- Modify: `apps/entregador-native/src/api/rotas.ts` - chamadas de upload-url, confirmacao e leitura de foto.
- Create: `apps/entregador-native/src/services/deliveryPhotoUpload.ts` - upload de arquivo local para URL assinada.
- Create: `apps/entregador-native/src/services/deliveryPhotoUpload.test.ts` - testes puros de headers e status de upload.
- Create: `apps/entregador-native/src/services/deliveryPhotoReview.ts` - validacao da etapa de revisao antes de finalizar.
- Create: `apps/entregador-native/src/services/deliveryPhotoReview.test.ts` - testes da obrigatoriedade da foto.
- Modify: `apps/entregador-native/src/services/deliveryOutboxCore.ts` - status e metadata da foto na outbox.
- Modify: `apps/entregador-native/src/services/deliveryOutboxCore.test.ts` - testes da transicao `foto_pending`.
- Modify: `apps/entregador-native/src/contexts/OfflineContext.tsx` - sincronizacao do upload apos criar comprovante.
- Modify: `apps/entregador-native/src/screens/EscolaDetalheScreen.tsx` - captura e preview da foto no fluxo de revisao.
- Modify: `apps/entregador-native/src/screens/EscolaDetalheScreen.success.test.ts` - teste estatico do bloqueio sem foto.
- Modify: `apps/entregador-native/src/screens/ComprovantesScreen.tsx` - exibicao da foto em comprovantes do app.
- Modify: `frontend/src/modules/entregas/pages/ComprovantesEntrega.tsx` - exibicao da foto em detalhes do comprovante web.

### Task 1: Backend Photo Policy

**Files:**
- Create: `backend/src/modules/entregas/services/deliveryPhotoPolicy.ts`
- Test: `backend/src/modules/entregas/services/deliveryPhotoPolicy.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DELIVERY_PHOTO_DEFAULT_MAX_BYTES,
  DELIVERY_PHOTO_DEFAULT_RETENTION_DAYS,
  assertValidDeliveryPhotoUpload,
  buildDeliveryPhotoExpiresAt,
  createDeliveryPhotoStorageKey,
  normalizeDeliveryPhotoContentType,
} from "./deliveryPhotoPolicy";

describe("deliveryPhotoPolicy", () => {
  it("accepts jpeg uploads inside the size limit", () => {
    assert.doesNotThrow(() =>
      assertValidDeliveryPhotoUpload({
        contentType: "image/jpeg",
        sizeBytes: DELIVERY_PHOTO_DEFAULT_MAX_BYTES,
      }),
    );
  });

  it("rejects non-jpeg uploads and oversized files", () => {
    assert.throws(
      () => assertValidDeliveryPhotoUpload({ contentType: "image/png", sizeBytes: 10 }),
      /A foto deve ser enviada em JPEG/,
    );
    assert.throws(
      () => assertValidDeliveryPhotoUpload({ contentType: "image/jpeg", sizeBytes: DELIVERY_PHOTO_DEFAULT_MAX_BYTES + 1 }),
      /A foto deve ter no maximo 5 MB/,
    );
  });

  it("normalizes common jpeg content type variants", () => {
    assert.equal(normalizeDeliveryPhotoContentType("image/jpg"), "image/jpeg");
    assert.equal(normalizeDeliveryPhotoContentType("IMAGE/JPEG"), "image/jpeg");
  });

  it("creates a storage key scoped to the comprovante", () => {
    const key = createDeliveryPhotoStorageKey(42, "550e8400-e29b-41d4-a716-446655440000");
    assert.equal(key, "entregas/comprovantes/42/550e8400-e29b-41d4-a716-446655440000.jpg");
  });

  it("calculates expiration with 180 day retention by default", () => {
    const createdAt = new Date("2026-04-28T12:00:00.000Z");
    const expiresAt = buildDeliveryPhotoExpiresAt(createdAt);

    assert.equal(DELIVERY_PHOTO_DEFAULT_RETENTION_DAYS, 180);
    assert.equal(expiresAt.toISOString(), "2026-10-25T12:00:00.000Z");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test backend/src/modules/entregas/services/deliveryPhotoPolicy.test.ts`

Expected: FAIL with module not found for `./deliveryPhotoPolicy`.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test backend/src/modules/entregas/services/deliveryPhotoPolicy.test.ts`

Expected: PASS with 5 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/entregas/services/deliveryPhotoPolicy.ts backend/src/modules/entregas/services/deliveryPhotoPolicy.test.ts
git commit -m "feat: add delivery photo policy"
```

### Task 2: Photo Metadata Migration and Model

**Files:**
- Create: `backend/src/migrations/20260428_comprovante_fotos.sql`
- Create: `backend/src/modules/entregas/models/ComprovanteFoto.ts`
- Test: `backend/src/modules/entregas/models/ComprovanteFoto.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(process.cwd(), "backend/src/migrations/20260428_comprovante_fotos.sql");

describe("ComprovanteFoto migration", () => {
  it("creates one photo metadata row per comprovante with storage key uniqueness", () => {
    const sql = readFileSync(migrationPath, "utf8");

    assert.match(sql, /CREATE TABLE IF NOT EXISTS comprovante_fotos/);
    assert.match(sql, /comprovante_id INTEGER NOT NULL REFERENCES comprovantes_entrega\(id\) ON DELETE CASCADE/);
    assert.match(sql, /storage_key TEXT NOT NULL UNIQUE/);
    assert.match(sql, /UNIQUE \(comprovante_id\)/);
    assert.match(sql, /CHECK \(status IN \('pending', 'uploaded', 'expired'\)\)/);
  });

  it("indexes expiration for cleanup and active reads", () => {
    const sql = readFileSync(migrationPath, "utf8");

    assert.match(sql, /idx_comprovante_fotos_expires_at/);
    assert.match(sql, /idx_comprovante_fotos_status/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test backend/src/modules/entregas/models/ComprovanteFoto.test.ts`

Expected: FAIL with `ENOENT` for the migration file.

- [ ] **Step 3: Create the migration**

```sql
CREATE TABLE IF NOT EXISTS comprovante_fotos (
  id SERIAL PRIMARY KEY,
  comprovante_id INTEGER NOT NULL REFERENCES comprovantes_entrega(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  content_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'expired')),
  uploaded_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (comprovante_id)
);

CREATE INDEX IF NOT EXISTS idx_comprovante_fotos_comprovante
  ON comprovante_fotos(comprovante_id);

CREATE INDEX IF NOT EXISTS idx_comprovante_fotos_status
  ON comprovante_fotos(status);

CREATE INDEX IF NOT EXISTS idx_comprovante_fotos_expires_at
  ON comprovante_fotos(expires_at);

CREATE OR REPLACE FUNCTION update_comprovante_fotos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_comprovante_fotos_updated_at ON comprovante_fotos;

CREATE TRIGGER trigger_comprovante_fotos_updated_at
  BEFORE UPDATE ON comprovante_fotos
  FOR EACH ROW
  EXECUTE FUNCTION update_comprovante_fotos_updated_at();
```

- [ ] **Step 4: Create the model**

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx --test backend/src/modules/entregas/models/ComprovanteFoto.test.ts`

Expected: PASS with 2 tests.

- [ ] **Step 6: Commit**

```bash
git add backend/src/migrations/20260428_comprovante_fotos.sql backend/src/modules/entregas/models/ComprovanteFoto.ts backend/src/modules/entregas/models/ComprovanteFoto.test.ts
git commit -m "feat: add comprovante photo metadata"
```

### Task 3: Cloudflare R2 Signed URL Service

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`
- Create: `backend/src/modules/entregas/services/deliveryPhotoStorage.ts`
- Test: `backend/src/modules/entregas/services/deliveryPhotoStorage.test.ts`

- [ ] **Step 1: Install the presigner dependency**

Run: `npm install --prefix backend @aws-sdk/s3-request-presigner`

Expected: `backend/package.json` contains `@aws-sdk/s3-request-presigner` and `backend/package-lock.json` is updated.

- [ ] **Step 2: Write the failing test**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DeliveryPhotoStorage,
  createCloudflareR2ClientConfig,
  readDeliveryPhotoStorageEnv,
} from "./deliveryPhotoStorage";

describe("deliveryPhotoStorage", () => {
  it("builds Cloudflare R2 client config from environment", () => {
    const config = createCloudflareR2ClientConfig({
      CLOUDFLARE_R2_ACCOUNT_ID: "account",
      CLOUDFLARE_R2_ACCESS_KEY_ID: "key",
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: "secret",
      CLOUDFLARE_R2_BUCKET: "bucket",
    });

    assert.equal(config.endpoint, "https://account.r2.cloudflarestorage.com");
    assert.equal(config.region, "auto");
    assert.equal(config.forcePathStyle, true);
  });

  it("requires the R2 environment variables", () => {
    assert.throws(() => readDeliveryPhotoStorageEnv({}), /CLOUDFLARE_R2_ACCOUNT_ID/);
  });

  it("creates upload and read signed urls through the injected signer", async () => {
    const calls: Array<{ commandName: string; expiresIn: number }> = [];
    const storage = new DeliveryPhotoStorage({
      bucket: "bucket",
      client: {} as never,
      signer: async (_client, command, options) => {
        calls.push({ commandName: command.constructor.name, expiresIn: options.expiresIn });
        return `https://signed.example/${command.constructor.name}`;
      },
    });

    const upload = await storage.createUploadUrl({
      storageKey: "entregas/comprovantes/1/photo.jpg",
      contentType: "image/jpeg",
    });
    const read = await storage.createReadUrl("entregas/comprovantes/1/photo.jpg");

    assert.equal(upload.url, "https://signed.example/PutObjectCommand");
    assert.deepEqual(upload.headers, { "Content-Type": "image/jpeg" });
    assert.equal(read.url, "https://signed.example/GetObjectCommand");
    assert.deepEqual(calls, [
      { commandName: "PutObjectCommand", expiresIn: 300 },
      { commandName: "GetObjectCommand", expiresIn: 300 },
    ]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx --test backend/src/modules/entregas/services/deliveryPhotoStorage.test.ts`

Expected: FAIL with module not found for `./deliveryPhotoStorage`.

- [ ] **Step 4: Write minimal implementation**

```ts
import { GetObjectCommand, PutObjectCommand, S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  DELIVERY_PHOTO_READ_URL_TTL_SECONDS,
  DELIVERY_PHOTO_UPLOAD_URL_TTL_SECONDS,
} from "./deliveryPhotoPolicy";

export interface DeliveryPhotoStorageEnv {
  CLOUDFLARE_R2_ACCOUNT_ID?: string;
  CLOUDFLARE_R2_ACCESS_KEY_ID?: string;
  CLOUDFLARE_R2_SECRET_ACCESS_KEY?: string;
  CLOUDFLARE_R2_BUCKET?: string;
}

export interface DeliveryPhotoStorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export type SignedUrlSigner = (
  client: S3Client,
  command: PutObjectCommand | GetObjectCommand,
  options: { expiresIn: number },
) => Promise<string>;

export function readDeliveryPhotoStorageEnv(env: DeliveryPhotoStorageEnv = process.env): DeliveryPhotoStorageConfig {
  const required = [
    "CLOUDFLARE_R2_ACCOUNT_ID",
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "CLOUDFLARE_R2_BUCKET",
  ] as const;

  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Variavel de ambiente obrigatoria ausente: ${key}`);
    }
  }

  return {
    accountId: env.CLOUDFLARE_R2_ACCOUNT_ID as string,
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID as string,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY as string,
    bucket: env.CLOUDFLARE_R2_BUCKET as string,
  };
}

export function createCloudflareR2ClientConfig(env: DeliveryPhotoStorageEnv = process.env): S3ClientConfig {
  const config = readDeliveryPhotoStorageEnv(env);
  return {
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    region: "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };
}

export class DeliveryPhotoStorage {
  private readonly bucket: string;
  private readonly client: S3Client;
  private readonly signer: SignedUrlSigner;

  constructor(options?: { bucket?: string; client?: S3Client; signer?: SignedUrlSigner }) {
    const envConfig = options?.bucket ? null : readDeliveryPhotoStorageEnv();
    this.bucket = options?.bucket || envConfig!.bucket;
    this.client = options?.client || new S3Client(createCloudflareR2ClientConfig());
    this.signer = options?.signer || getSignedUrl;
  }

  async createUploadUrl(input: { storageKey: string; contentType: "image/jpeg" }) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.storageKey,
      ContentType: input.contentType,
    });

    return {
      url: await this.signer(this.client, command, { expiresIn: DELIVERY_PHOTO_UPLOAD_URL_TTL_SECONDS }),
      headers: { "Content-Type": input.contentType },
    };
  }

  async createReadUrl(storageKey: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    return {
      url: await this.signer(this.client, command, { expiresIn: DELIVERY_PHOTO_READ_URL_TTL_SECONDS }),
    };
  }
}

export default new DeliveryPhotoStorage();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx --test backend/src/modules/entregas/services/deliveryPhotoStorage.test.ts`

Expected: PASS with 3 tests.

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/modules/entregas/services/deliveryPhotoStorage.ts backend/src/modules/entregas/services/deliveryPhotoStorage.test.ts
git commit -m "feat: add r2 signed urls for delivery photos"
```

### Task 4: Backend Photo Endpoints

**Files:**
- Create: `backend/src/modules/entregas/controllers/ComprovanteFotoController.ts`
- Test: `backend/src/modules/entregas/controllers/ComprovanteFotoController.test.ts`
- Modify: `backend/src/modules/entregas/routes/entregaRoutes.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseComprovanteFotoUploadRequest,
  validateComprovanteFotoStorageKey,
} from "./ComprovanteFotoController";

describe("ComprovanteFotoController helpers", () => {
  it("parses valid upload request bodies", () => {
    assert.deepEqual(
      parseComprovanteFotoUploadRequest({ content_type: "image/jpg", size_bytes: 1234 }),
      { contentType: "image/jpeg", sizeBytes: 1234 },
    );
  });

  it("rejects invalid upload request bodies", () => {
    assert.throws(
      () => parseComprovanteFotoUploadRequest({ content_type: "image/png", size_bytes: 1234 }),
      /A foto deve ser enviada em JPEG/,
    );
  });

  it("validates storage key ownership", () => {
    assert.doesNotThrow(() =>
      validateComprovanteFotoStorageKey("entregas/comprovantes/10/foto.jpg", 10),
    );
    assert.throws(
      () => validateComprovanteFotoStorageKey("entregas/comprovantes/11/foto.jpg", 10),
      /storage_key nao pertence/,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test backend/src/modules/entregas/controllers/ComprovanteFotoController.test.ts`

Expected: FAIL with module not found for `./ComprovanteFotoController`.

- [ ] **Step 3: Implement controller helpers and endpoints**

```ts
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

      res.json({
        upload_url: signedUpload.url,
        storage_key: storageKey,
        headers: signedUpload.headers,
        expires_at: expiresAt.toISOString(),
      });
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
```

- [ ] **Step 4: Wire routes**

Add the import:

```ts
import ComprovanteFotoController from "../controllers/ComprovanteFotoController";
```

Add these routes near the comprovante routes:

```ts
router.post("/comprovantes/:id/foto/upload-url", requireEscrita("entregas"), ComprovanteFotoController.solicitarUploadUrl);
router.post("/comprovantes/:id/foto/confirmar", requireEscrita("entregas"), ComprovanteFotoController.confirmarUpload);
router.get("/comprovantes/:id/foto", requireLeitura("entregas"), ComprovanteFotoController.obterFoto);
```

- [ ] **Step 5: Run focused backend tests**

Run:

```bash
npx tsx --test backend/src/modules/entregas/services/deliveryPhotoPolicy.test.ts
npx tsx --test backend/src/modules/entregas/models/ComprovanteFoto.test.ts
npx tsx --test backend/src/modules/entregas/services/deliveryPhotoStorage.test.ts
npx tsx --test backend/src/modules/entregas/controllers/ComprovanteFotoController.test.ts
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/entregas/controllers/ComprovanteFotoController.ts backend/src/modules/entregas/controllers/ComprovanteFotoController.test.ts backend/src/modules/entregas/routes/entregaRoutes.ts
git commit -m "feat: add delivery photo endpoints"
```

### Task 5: Mobile Photo API and Upload Helpers

**Files:**
- Modify: `apps/entregador-native/src/api/rotas.ts`
- Create: `apps/entregador-native/src/services/deliveryPhotoUpload.ts`
- Test: `apps/entregador-native/src/services/deliveryPhotoUpload.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { buildDeliveryPhotoUploadHeaders, shouldRetryDeliveryPhotoUpload } from "./deliveryPhotoUpload";

test("builds R2 upload headers from signed URL response headers", () => {
  assert.deepEqual(
    buildDeliveryPhotoUploadHeaders({ "Content-Type": "image/jpeg", "x-amz-meta-test": "ok" }),
    { "Content-Type": "image/jpeg", "x-amz-meta-test": "ok" },
  );
});

test("retries transient upload failures but not validation failures", () => {
  assert.equal(shouldRetryDeliveryPhotoUpload(0), true);
  assert.equal(shouldRetryDeliveryPhotoUpload(500), true);
  assert.equal(shouldRetryDeliveryPhotoUpload(429), true);
  assert.equal(shouldRetryDeliveryPhotoUpload(403), false);
  assert.equal(shouldRetryDeliveryPhotoUpload(413), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test apps/entregador-native/src/services/deliveryPhotoUpload.test.ts`

Expected: FAIL with module not found for `./deliveryPhotoUpload`.

- [ ] **Step 3: Add API functions**

Append these exports to `apps/entregador-native/src/api/rotas.ts`:

```ts
export interface ComprovanteFotoUploadUrl {
  upload_url: string;
  storage_key: string;
  headers: Record<string, string>;
  expires_at: string;
}

export interface ComprovanteFotoReadUrl {
  url: string;
  expires_at: string;
  uploaded_at?: string;
  content_type: string;
  size_bytes: number;
}

export async function solicitarFotoComprovanteUploadUrl(
  comprovanteId: number,
  dados: { content_type: "image/jpeg"; size_bytes: number },
): Promise<ComprovanteFotoUploadUrl> {
  const { data } = await api.post(`/entregas/comprovantes/${comprovanteId}/foto/upload-url`, dados);
  return data;
}

export async function confirmarFotoComprovanteUpload(
  comprovanteId: number,
  dados: { storage_key: string },
): Promise<{ foto: unknown }> {
  const { data } = await api.post(`/entregas/comprovantes/${comprovanteId}/foto/confirmar`, dados);
  return data;
}

export async function obterFotoComprovante(comprovanteId: number): Promise<ComprovanteFotoReadUrl> {
  const { data } = await api.get(`/entregas/comprovantes/${comprovanteId}/foto`);
  return data;
}
```

- [ ] **Step 4: Add upload helper implementation**

```ts
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

export async function uploadDeliveryPhotoToSignedUrl(input: {
  localUri: string;
  uploadUrl: string;
  headers: Record<string, string>;
}): Promise<void> {
  const body = await getLocalPhotoBlob(input.localUri);
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx --test apps/entregador-native/src/services/deliveryPhotoUpload.test.ts`

Expected: PASS with 2 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/entregador-native/src/api/rotas.ts apps/entregador-native/src/services/deliveryPhotoUpload.ts apps/entregador-native/src/services/deliveryPhotoUpload.test.ts
git commit -m "feat: add mobile delivery photo upload api"
```

### Task 6: Offline Outbox Photo State

**Files:**
- Modify: `apps/entregador-native/src/services/deliveryOutboxCore.ts`
- Modify: `apps/entregador-native/src/services/deliveryOutboxCore.test.ts`
- Modify: `apps/entregador-native/src/contexts/OfflineContext.tsx`

- [ ] **Step 1: Write the failing outbox tests**

Add this import to `deliveryOutboxCore.test.ts`:

```ts
import {
  applyDeliveryPhotoUploaded,
  applyComprovanteCreated,
} from "./deliveryOutboxCore";
```

Add these tests:

```ts
test("comprovante creation keeps photo operations open until upload is confirmed", () => {
  const updated = applyComprovanteCreated(
    {
      ...baseOperation,
      status: "comprovante_pending",
      historicoId: 99,
      comprovanteData: {
        ...baseOperation.comprovanteData!,
        foto_local_uri: "file:///tmp/mercadoria.jpg",
        foto_content_type: "image/jpeg",
        foto_size_bytes: 1234,
      },
    },
    55,
  );

  assert.equal(updated.status, "foto_pending");
  assert.equal(updated.comprovanteId, 55);
});

test("photo upload confirmation marks the operation as synced", () => {
  const updated = applyDeliveryPhotoUploaded({
    ...baseOperation,
    status: "foto_pending",
    historicoId: 99,
    comprovanteId: 55,
  });

  assert.equal(updated.status, "synced");
  assert.ok(updated.fotoUploadedAt);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test apps/entregador-native/src/services/deliveryOutboxCore.test.ts`

Expected: FAIL because `applyDeliveryPhotoUploaded` does not exist and `foto_pending` is not in the status type.

- [ ] **Step 3: Extend outbox types and pure transitions**

Update `DeliveryOutboxStatus`:

```ts
export type DeliveryOutboxStatus =
  | "pending"
  | "syncing"
  | "failed_retryable"
  | "failed_needs_action"
  | "comprovante_pending"
  | "foto_pending"
  | "synced";
```

Extend `DeliveryComprovanteData`:

```ts
  foto_local_uri?: string;
  foto_content_type?: "image/jpeg";
  foto_size_bytes?: number;
```

Extend `DeliveryOutboxOperation`:

```ts
  comprovanteId?: number;
  fotoUploadedAt?: string;
```

Update `normalizeOutboxOperations` to preserve the new fields:

```ts
        comprovanteId: operation.comprovanteId ? Number(operation.comprovanteId) : undefined,
        fotoUploadedAt: operation.fotoUploadedAt ? String(operation.fotoUploadedAt) : undefined,
```

Update `getOutboxSummary` so `foto_pending` counts as pending:

```ts
      if (operation.status === "comprovante_pending" || operation.status === "foto_pending") {
        summary.comprovantePendingOperations += 1;
      }
```

Update `getSyncableOperations`:

```ts
    if (operation.status === "foto_pending") {
      return !!operation.comprovanteId && !!operation.comprovanteData?.foto_local_uri && !operation.fotoUploadedAt;
    }
```

Add these functions:

```ts
export function applyComprovanteCreated(
  operation: DeliveryOutboxOperation,
  comprovanteId?: number,
): DeliveryOutboxOperation {
  if (!comprovanteId) {
    return {
      ...operation,
      status: "failed_retryable",
      lastError: "Servidor criou o comprovante sem retornar o ID.",
    };
  }

  if (operation.comprovanteData?.foto_local_uri) {
    return {
      ...operation,
      status: "foto_pending",
      comprovanteId,
      lastError: undefined,
    };
  }

  return {
    ...operation,
    status: "synced",
    comprovanteId,
    lastError: undefined,
  };
}

export function applyDeliveryPhotoUploaded(operation: DeliveryOutboxOperation): DeliveryOutboxOperation {
  return {
    ...operation,
    status: "synced",
    fotoUploadedAt: new Date().toISOString(),
    lastError: undefined,
  };
}
```

- [ ] **Step 4: Update sync orchestration**

In `OfflineContext.tsx`, import the photo API and helper:

```ts
import {
  confirmarFotoComprovanteUpload,
  solicitarFotoComprovanteUploadUrl,
} from "../api/rotas";
import { uploadDeliveryPhotoToSignedUrl } from "../services/deliveryPhotoUpload";
```

Change `criarComprovanteOffline` to return the created comprovante ID:

```ts
async function criarComprovanteOffline(operations: DeliveryOutboxOperation[]): Promise<number | null> {
  const firstOperation = operations[0];
  const firstComprovante = firstOperation.comprovanteData;

  if (!firstComprovante) {
    return null;
  }

  const tokenData = await AsyncStorage.getItem("token");
  const token = tokenData ? JSON.parse(tokenData).token : null;

  if (!token) {
    throw buildFetchError(401, { error: "Sessao expirada. Faca login novamente para sincronizar." });
  }

  const comprovanteData = {
    escola_id: firstComprovante.escola_id,
    nome_quem_entregou: firstComprovante.nome_quem_entregou,
    nome_quem_recebeu: firstComprovante.nome_quem_recebeu,
    observacao: firstComprovante.observacao,
    assinatura_base64: firstComprovante.assinatura_base64,
    itens: operations.map((operation) => ({
      historico_entrega_id: operation.historicoId!,
      produto_nome: operation.comprovanteData!.produto_nome,
      quantidade_entregue: operation.comprovanteData!.quantidade_entregue,
      unidade: operation.comprovanteData!.unidade || "",
      lote: operation.comprovanteData!.lote,
    })),
  };

  const response = await fetch(`${API_URL}/entregas/comprovantes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(comprovanteData),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    let body: unknown = { error: bodyText || "Erro ao criar comprovante." };
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = { error: bodyText || "Erro ao criar comprovante." };
    }

    throw buildFetchError(response.status, body);
  }

  const body = await response.json();
  return Number(body?.id || body?.comprovante?.id || 0) || null;
}
```

Add the photo sync helper:

```ts
async function sincronizarFotoComprovanteOffline(operation: DeliveryOutboxOperation): Promise<void> {
  const comprovanteId = operation.comprovanteId;
  const foto = operation.comprovanteData;

  if (!comprovanteId || !foto?.foto_local_uri || !foto.foto_content_type || !foto.foto_size_bytes) {
    return;
  }

  const uploadTarget = await solicitarFotoComprovanteUploadUrl(comprovanteId, {
    content_type: foto.foto_content_type,
    size_bytes: foto.foto_size_bytes,
  });

  await uploadDeliveryPhotoToSignedUrl({
    localUri: foto.foto_local_uri,
    uploadUrl: uploadTarget.upload_url,
    headers: uploadTarget.headers,
  });

  await confirmarFotoComprovanteUpload(comprovanteId, {
    storage_key: uploadTarget.storage_key,
  });
}
```

Inside the comprovante group loop, save `comprovanteId` before uploading the photo:

```ts
const comprovanteId = currentGroup[0].comprovanteId || await criarComprovanteOffline(currentGroup);
operations = replaceOperations(
  operations,
  currentGroup.map((operation) => applyComprovanteCreated(operation, comprovanteId || undefined)),
);
operations = await saveDeliveryOutboxOperations(operations);
applyOperationsState(operations);

const groupAfterComprovante = currentGroup.map(
  (operation) => operations.find((candidate) => candidate.id === operation.id) || operation,
);

for (const operation of groupAfterComprovante) {
  if (operation.status !== "foto_pending") {
    continue;
  }

  await sincronizarFotoComprovanteOffline(operation);
  operations = replaceOperation(operations, applyDeliveryPhotoUploaded(operation));
  operations = await saveDeliveryOutboxOperations(operations);
  applyOperationsState(operations);
}
```

- [ ] **Step 5: Run outbox tests**

Run: `npx tsx --test apps/entregador-native/src/services/deliveryOutboxCore.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/entregador-native/src/services/deliveryOutboxCore.ts apps/entregador-native/src/services/deliveryOutboxCore.test.ts apps/entregador-native/src/contexts/OfflineContext.tsx
git commit -m "feat: sync delivery photos through outbox"
```

### Task 7: Capture Required Photo in Delivery Review

**Files:**
- Create: `apps/entregador-native/src/services/deliveryPhotoReview.ts`
- Test: `apps/entregador-native/src/services/deliveryPhotoReview.test.ts`
- Modify: `apps/entregador-native/src/screens/EscolaDetalheScreen.tsx`
- Modify: `apps/entregador-native/src/screens/EscolaDetalheScreen.success.test.ts`

- [ ] **Step 1: Write the failing validation test**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { getDeliveryReviewBlocker } from "./deliveryPhotoReview";

test("blocks delivery review without receiver, driver, or photo", () => {
  assert.equal(
    getDeliveryReviewBlocker({ nomeRecebedor: "", nomeEntregador: "Joao", fotoUri: "file:///foto.jpg" }),
    "Informe o nome de quem recebeu a entrega",
  );
  assert.equal(
    getDeliveryReviewBlocker({ nomeRecebedor: "Maria", nomeEntregador: "", fotoUri: "file:///foto.jpg" }),
    "Informe o nome de quem entregou",
  );
  assert.equal(
    getDeliveryReviewBlocker({ nomeRecebedor: "Maria", nomeEntregador: "Joao", fotoUri: "" }),
    "Informe uma foto da mercadoria entregue",
  );
});

test("allows delivery review when required fields are present", () => {
  assert.equal(
    getDeliveryReviewBlocker({
      nomeRecebedor: "Maria",
      nomeEntregador: "Joao",
      fotoUri: "file:///foto.jpg",
    }),
    null,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test apps/entregador-native/src/services/deliveryPhotoReview.test.ts`

Expected: FAIL with module not found for `./deliveryPhotoReview`.

- [ ] **Step 3: Implement validation helper**

```ts
export interface DeliveryReviewValidationInput {
  nomeRecebedor: string;
  nomeEntregador: string;
  fotoUri?: string | null;
}

export function getDeliveryReviewBlocker(input: DeliveryReviewValidationInput): string | null {
  if (!input.nomeRecebedor.trim()) {
    return "Informe o nome de quem recebeu a entrega";
  }

  if (!input.nomeEntregador.trim()) {
    return "Informe o nome de quem entregou";
  }

  if (!input.fotoUri) {
    return "Informe uma foto da mercadoria entregue";
  }

  return null;
}
```

- [ ] **Step 4: Add static screen test**

Append to `EscolaDetalheScreen.success.test.ts`:

```ts
test("delivery review stores a required merchandise photo in comprovante outbox data", () => {
  assert.match(source, /fotoMercadoria/);
  assert.match(source, /Informe uma foto da mercadoria entregue/);
  assert.match(source, /foto_local_uri:\s*fotoMercadoria\.uri/);
  assert.match(source, /foto_content_type:\s*"image\/jpeg"/);
});
```

Run: `npx tsx --test apps/entregador-native/src/screens/EscolaDetalheScreen.success.test.ts`

Expected: FAIL until the screen is updated.

- [ ] **Step 5: Update `EscolaDetalheScreen.tsx`**

Add imports:

```ts
import { Image } from "react-native";
import { CameraView, Camera } from "expo-camera";
import { getDeliveryReviewBlocker } from "../services/deliveryPhotoReview";
```

Add state:

```ts
const [cameraAberta, setCameraAberta] = useState(false);
const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
const [fotoMercadoria, setFotoMercadoria] = useState<{ uri: string; sizeBytes: number } | null>(null);
const cameraRef = React.useRef<CameraView | null>(null);
```

Add camera actions:

```ts
const abrirCamera = async () => {
  const permission = await Camera.requestCameraPermissionsAsync();
  const granted = permission.status === "granted";
  setCameraPermission(granted);
  if (!granted) {
    Alert.alert("Camera bloqueada", "Permita o uso da camera para registrar a foto da entrega.");
    return;
  }
  setCameraAberta(true);
};

const tirarFotoMercadoria = async () => {
  const photo = await cameraRef.current?.takePictureAsync({
    quality: 0.7,
    base64: false,
    skipProcessing: false,
  });

  if (!photo?.uri) {
    Alert.alert("Erro", "Nao foi possivel capturar a foto.");
    return;
  }

  const blob = await fetch(photo.uri).then((response) => response.blob());
  setFotoMercadoria({ uri: photo.uri, sizeBytes: blob.size });
  setCameraAberta(false);
};
```

Add this early render before the success screen:

```tsx
if (cameraAberta) {
  return (
    <View style={styles.cameraContainer}>
      <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back" />
      <View style={styles.cameraActions}>
        <Button mode="outlined" onPress={() => setCameraAberta(false)}>
          Cancelar
        </Button>
        <Button mode="contained" onPress={tirarFotoMercadoria}>
          Tirar foto
        </Button>
      </View>
    </View>
  );
}
```

Replace the validation in `finalizarEntrega`:

```ts
const blocker = getDeliveryReviewBlocker({
  nomeRecebedor,
  nomeEntregador,
  fotoUri: fotoMercadoria?.uri,
});

if (blocker) {
  Alert.alert("Atencao", blocker);
  return;
}
```

Add photo metadata to `comprovanteData`:

```ts
foto_local_uri: fotoMercadoria!.uri,
foto_content_type: "image/jpeg" as const,
foto_size_bytes: fotoMercadoria!.sizeBytes,
```

Add the review UI below observations:

```tsx
<View style={styles.fotoSection}>
  <Text variant="titleSmall" style={styles.sectionTitle}>
    Foto da mercadoria *
  </Text>
  {fotoMercadoria ? (
    <View>
      <Image source={{ uri: fotoMercadoria.uri }} style={styles.fotoPreview} />
      <Button mode="outlined" onPress={abrirCamera} style={styles.input}>
        Refazer foto
      </Button>
    </View>
  ) : (
    <Button mode="contained-tonal" onPress={abrirCamera} style={styles.input}>
      Tirar foto da mercadoria
    </Button>
  )}
</View>
```

Add styles:

```ts
cameraContainer: {
  flex: 1,
  backgroundColor: "#000",
},
cameraPreview: {
  flex: 1,
},
cameraActions: {
  flexDirection: "row",
  gap: 12,
  padding: 16,
  backgroundColor: "#111",
},
fotoSection: {
  marginTop: 8,
  marginBottom: 8,
},
fotoPreview: {
  width: "100%",
  height: 220,
  borderRadius: 8,
  backgroundColor: "#e5e7eb",
  marginTop: 8,
},
```

- [ ] **Step 6: Run mobile focused tests**

Run:

```bash
npx tsx --test apps/entregador-native/src/services/deliveryPhotoReview.test.ts
npx tsx --test apps/entregador-native/src/screens/EscolaDetalheScreen.success.test.ts
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/entregador-native/src/services/deliveryPhotoReview.ts apps/entregador-native/src/services/deliveryPhotoReview.test.ts apps/entregador-native/src/screens/EscolaDetalheScreen.tsx apps/entregador-native/src/screens/EscolaDetalheScreen.success.test.ts
git commit -m "feat: require delivery photo before comprovante"
```

### Task 8: Display Delivery Photos in Comprovantes

**Files:**
- Modify: `apps/entregador-native/src/screens/ComprovantesScreen.tsx`
- Modify: `frontend/src/modules/entregas/pages/ComprovantesEntrega.tsx`

- [ ] **Step 1: Add app display behavior**

In `ComprovantesScreen.tsx`, import the read API:

```ts
import { obterFotoComprovante } from "../api/rotas";
```

Add state:

```ts
const [fotoUrls, setFotoUrls] = useState<Record<number, string>>({});
const [fotoErros, setFotoErros] = useState<Record<number, string>>({});
```

Add loader:

```ts
const carregarFotoComprovante = async (comprovanteId: number) => {
  if (fotoUrls[comprovanteId] || comprovanteId < 0) {
    return;
  }

  try {
    const foto = await obterFotoComprovante(comprovanteId);
    setFotoUrls((current) => ({ ...current, [comprovanteId]: foto.url }));
  } catch {
    setFotoErros((current) => ({ ...current, [comprovanteId]: "Foto nao encontrada ou expirada" }));
  }
};
```

Update `toggleExpand`:

```ts
const toggleExpand = (id: number) => {
  const next = expandedId === id ? null : id;
  setExpandedId(next);
  if (next !== null) {
    carregarFotoComprovante(next);
  }
};
```

Render photo in expanded details:

```tsx
<View style={styles.section}>
  <Text variant="labelMedium" style={styles.sectionTitle}>
    Foto da mercadoria
  </Text>
  {fotoUrls[item.id] ? (
    <Image source={{ uri: fotoUrls[item.id] }} style={styles.fotoMercadoria} resizeMode="cover" />
  ) : (
    <Text style={styles.observacao}>{fotoErros[item.id] || "Carregando foto..."}</Text>
  )}
</View>
```

Add style:

```ts
fotoMercadoria: {
  width: "100%",
  height: 220,
  borderRadius: 8,
  backgroundColor: "#e5e7eb",
},
```

- [ ] **Step 2: Add web display behavior**

In `frontend/src/modules/entregas/pages/ComprovantesEntrega.tsx`, add state near the detail state:

```ts
const [fotoComprovanteUrl, setFotoComprovanteUrl] = useState<string | null>(null);
const [fotoComprovanteErro, setFotoComprovanteErro] = useState<string | null>(null);
```

Add loader:

```ts
const carregarFotoComprovante = async (id: number) => {
  setFotoComprovanteUrl(null);
  setFotoComprovanteErro(null);
  try {
    const response = await api.get(`/entregas/comprovantes/${id}/foto`);
    setFotoComprovanteUrl(response.data.url);
  } catch {
    setFotoComprovanteErro("Foto nao encontrada ou expirada");
  }
};
```

Call it when opening details:

```ts
await carregarFotoComprovante(id);
```

Render inside the details dialog after observations:

```tsx
<Box sx={{ mt: 2 }}>
  <Typography variant="subtitle2" gutterBottom>
    Foto da mercadoria
  </Typography>
  {fotoComprovanteUrl ? (
    <Box
      component="img"
      src={fotoComprovanteUrl}
      alt="Foto da mercadoria entregue"
      sx={{
        width: "100%",
        maxHeight: 360,
        objectFit: "cover",
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
      }}
    />
  ) : (
    <Typography variant="body2" color="text.secondary">
      {fotoComprovanteErro || "Carregando foto..."}
    </Typography>
  )}
</Box>
```

- [ ] **Step 3: Run TypeScript checks for touched areas**

Run:

```bash
npx tsc --noEmit --project apps/entregador-native/tsconfig.json
npm --prefix frontend run build
```

Expected: both commands complete without TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/entregador-native/src/screens/ComprovantesScreen.tsx frontend/src/modules/entregas/pages/ComprovantesEntrega.tsx
git commit -m "feat: show delivery photos on comprovantes"
```

### Task 9: Final Verification and Configuration Notes

**Files:**
- Modify: `docs/superpowers/specs/2026-04-28-foto-comprovante-entrega-cloudflare-design.md` only if implementation decisions differ from the approved design.

- [ ] **Step 1: Run backend focused tests**

Run:

```bash
npx tsx --test backend/src/modules/entregas/services/deliveryPhotoPolicy.test.ts
npx tsx --test backend/src/modules/entregas/models/ComprovanteFoto.test.ts
npx tsx --test backend/src/modules/entregas/services/deliveryPhotoStorage.test.ts
npx tsx --test backend/src/modules/entregas/controllers/ComprovanteFotoController.test.ts
npx tsx --test backend/src/modules/entregas/controllers/EntregaController.test.ts
```

Expected: all tests PASS.

- [ ] **Step 2: Run mobile focused tests**

Run:

```bash
npx tsx --test apps/entregador-native/src/services/deliveryPhotoUpload.test.ts
npx tsx --test apps/entregador-native/src/services/deliveryPhotoReview.test.ts
npx tsx --test apps/entregador-native/src/services/deliveryOutboxCore.test.ts
npx tsx --test apps/entregador-native/src/screens/EscolaDetalheScreen.success.test.ts
```

Expected: all tests PASS.

- [ ] **Step 3: Run builds**

Run:

```bash
npm --prefix backend run build
npm --prefix frontend run build
npx tsc --noEmit --project apps/entregador-native/tsconfig.json
```

Expected: all commands complete without errors.

- [ ] **Step 4: Verify Cloudflare configuration manually**

Confirm these backend environment variables exist in local/prod environments:

```text
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET
DELIVERY_PHOTO_RETENTION_DAYS=180
DELIVERY_PHOTO_MAX_BYTES=5242880
```

Confirm the Cloudflare R2 bucket has a lifecycle rule:

```text
Prefix: entregas/comprovantes/
Action: delete objects
Age: 180 days
```

- [ ] **Step 5: Manual app verification**

Run the app:

```bash
npm --prefix apps/entregador-native run start
```

Verify on a device:

1. Open a school delivery.
2. Select at least one item.
3. Continue to review.
4. Try finalizing without photo.
5. Expected: app shows `Informe uma foto da mercadoria entregue`.
6. Take a photo.
7. Finalize delivery while online.
8. Expected: outbox sync completes and comprovante detail shows the photo.
9. Repeat while offline.
10. Expected: comprovante remains pending until network returns; after sync, photo appears in details.

- [ ] **Step 6: Final commit if verification required doc updates**

If the spec was updated because implementation details changed:

```bash
git add docs/superpowers/specs/2026-04-28-foto-comprovante-entrega-cloudflare-design.md
git commit -m "docs: update delivery photo storage notes"
```

If the spec was not changed, do not create an empty commit.

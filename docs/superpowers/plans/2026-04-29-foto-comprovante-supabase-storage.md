# Foto de Comprovante no Supabase Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar a foto unica do comprovante de Cloudflare R2 para Supabase Storage gratuito, mantendo upload direto pelo app e somente metadados no banco.

**Architecture:** O backend passa a usar Supabase Storage com service role para gerar URLs/tokens assinados. O app envia a foto com `path + token` usando o endpoint oficial de upload assinado do Supabase; leitura continua por URL temporaria. A tabela `comprovante_fotos`, outbox, validacoes de JPEG/tamanho e expiracao de 180 dias permanecem.

**Tech Stack:** Express, TypeScript, Supabase Storage JS client, node:test via `tsx`, React Native Expo.

---

### Task 1: Supabase Storage Adapter

**Files:**
- Modify: `backend/src/modules/entregas/services/deliveryPhotoStorage.ts`
- Modify: `backend/src/modules/entregas/services/deliveryPhotoStorage.test.ts`
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`

- [ ] **Step 1: Write failing Supabase storage tests**

Replace the R2 assertions with Supabase env and client behavior:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  DeliveryPhotoStorage,
  readDeliveryPhotoStorageEnv,
} from "./deliveryPhotoStorage";

test("requires Supabase storage environment variables", () => {
  assert.throws(() => readDeliveryPhotoStorageEnv({}), /SUPABASE_URL/);
});

test("creates Supabase upload and read signed urls through injected client", async () => {
  const calls: string[] = [];
  const storage = new DeliveryPhotoStorage({
    bucket: "delivery-photos",
    client: {
      storage: {
        from(bucket: string) {
          calls.push(bucket);
          return {
            async createSignedUploadUrl(path: string, options: { upsert: boolean }) {
              assert.equal(path, "entregas/comprovantes/1/photo.jpg");
              assert.deepEqual(options, { upsert: false });
              return { data: { signedUrl: "https://upload.example", path, token: "token" }, error: null };
            },
            async createSignedUrl(path: string, expiresIn: number) {
              assert.equal(path, "entregas/comprovantes/1/photo.jpg");
              assert.equal(expiresIn, 300);
              return { data: { signedUrl: "https://read.example" }, error: null };
            },
          };
        },
      },
    },
  });

  const upload = await storage.createUploadUrl({
    storageKey: "entregas/comprovantes/1/photo.jpg",
    contentType: "image/jpeg",
  });
  const read = await storage.createReadUrl("entregas/comprovantes/1/photo.jpg");

  assert.equal(upload.url, "https://upload.example");
  assert.equal(upload.path, "entregas/comprovantes/1/photo.jpg");
  assert.equal(upload.token, "token");
  assert.deepEqual(upload.headers, { "Content-Type": "image/jpeg" });
  assert.equal(read.url, "https://read.example");
  assert.deepEqual(calls, ["delivery-photos", "delivery-photos"]);
});
```

- [ ] **Step 2: Run test and verify red**

Run:

```bash
npx.cmd tsx --test backend/src/modules/entregas/services/deliveryPhotoStorage.test.ts
```

Expected: FAIL because current adapter still expects Cloudflare R2 env/functions.

- [ ] **Step 3: Implement Supabase adapter**

Install `@supabase/supabase-js`, remove the R2 presigner dependency, and implement:

```ts
export interface DeliveryPhotoStorageEnv {
  [key: string]: string | undefined;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_STORAGE_BUCKET?: string;
}
```

Use `createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })`.

`createUploadUrl()` must return `{ url, path, token, headers }`.

`createReadUrl()` must return `{ url }`.

- [ ] **Step 4: Run storage test and backend build**

Run:

```bash
npx.cmd tsx --test backend/src/modules/entregas/services/deliveryPhotoStorage.test.ts
npm.cmd --prefix backend run build
```

Expected: PASS.

### Task 2: Mobile Supabase Signed Upload

**Files:**
- Modify: `apps/entregador-native/src/api/rotas.ts`
- Modify: `apps/entregador-native/src/services/deliveryPhotoUpload.ts`
- Modify: `apps/entregador-native/src/services/deliveryPhotoUpload.test.ts`

- [ ] **Step 1: Write failing mobile upload test**

Add a test proving Supabase signed upload uses `POST signedUrl?token=...` with `FormData`:

```ts
test("uploads photos to Supabase signed upload urls with token", async () => {
  const calls: any[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: any) => {
    calls.push({ url, init });
    if (url === "file:///foto.jpg") {
      return { ok: true, blob: async () => new Blob(["jpeg"], { type: "image/jpeg" }) } as Response;
    }
    return { ok: true } as Response;
  }) as typeof fetch;

  try {
    await uploadDeliveryPhotoToSignedUrl({
      localUri: "file:///foto.jpg",
      uploadUrl: "https://project.supabase.co/storage/v1/object/upload/sign/bucket/path.jpg",
      token: "signed-token",
      headers: { "Content-Type": "image/jpeg" },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls[1].url, "https://project.supabase.co/storage/v1/object/upload/sign/bucket/path.jpg?token=signed-token");
  assert.equal(calls[1].init.method, "POST");
  assert.ok(calls[1].init.body instanceof FormData);
});
```

- [ ] **Step 2: Run test and verify red**

Run:

```bash
npx.cmd tsx --test apps/entregador-native/src/services/deliveryPhotoUpload.test.ts
```

Expected: FAIL because current code performs PUT to R2 URL.

- [ ] **Step 3: Implement upload token support**

Add `token?: string` to API response types and `uploadDeliveryPhotoToSignedUrl` input. If `token` exists, upload with `POST`, `FormData`, field name `file`, and query parameter `token`. Keep old PUT fallback only if no token exists.

- [ ] **Step 4: Run mobile tests**

Run:

```bash
npx.cmd tsx --test apps/entregador-native/src/services/deliveryPhotoUpload.test.ts
npx.cmd tsc --noEmit --project apps/entregador-native/tsconfig.json
```

Expected: PASS.

### Task 3: Docs and Final Verification

**Files:**
- Modify: `docs/superpowers/specs/2026-04-28-foto-comprovante-entrega-cloudflare-design.md`
- Modify: `docs/superpowers/plans/2026-04-28-foto-comprovante-entrega-cloudflare.md`

- [ ] **Step 1: Update docs from R2 to Supabase**

Replace operational requirements with:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
DELIVERY_PHOTO_RETENTION_DAYS=180
DELIVERY_PHOTO_MAX_BYTES=5242880
```

Mention that Supabase signed upload URLs are valid for 2 hours and deletion after 180 days needs either scheduled cleanup using `expires_at` or manual bucket cleanup because Supabase free does not provide the same R2 lifecycle rule model.

- [ ] **Step 2: Run focused regression suite**

Run:

```bash
npx.cmd tsx --test backend/src/modules/entregas/services/deliveryPhotoPolicy.test.ts
npx.cmd tsx --test backend/src/modules/entregas/models/ComprovanteFoto.test.ts
npx.cmd tsx --test backend/src/modules/entregas/services/deliveryPhotoStorage.test.ts
npx.cmd tsx --test backend/src/modules/entregas/controllers/ComprovanteFotoController.test.ts
npx.cmd tsx --test apps/entregador-native/src/services/deliveryPhotoUpload.test.ts
npx.cmd tsx --test apps/entregador-native/src/services/deliveryOutboxCore.test.ts
npm.cmd --prefix backend run build
npx.cmd tsc --noEmit --project apps/entregador-native/tsconfig.json
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend apps/entregador-native docs
git commit -m "feat: use supabase storage for delivery photos"
```

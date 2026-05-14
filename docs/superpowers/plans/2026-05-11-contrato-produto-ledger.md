# Contract Product Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace direct contract-balance edits with a canonical immutable ledger and current-balance projection.

**Architecture:** Extend `contratoSaldoService` with canonical schema creation, migration, movement validation, ledger insertion, and balance projection updates. Keep the existing route surface stable by mapping canonical rows back to the response fields already consumed by the frontend.

**Tech Stack:** Node.js, TypeScript, Express, PostgreSQL, `node:test`, `tsx`.

---

### Task 1: Ledger Rules

**Files:**
- Modify: `backend/src/modules/contratos/services/contratoSaldoService.ts`
- Test: `backend/src/modules/contratos/services/contratoSaldoService.test.ts`

- [ ] **Step 1: Write failing tests for movement math**

Create tests that assert outgoing movement above available balance throws, `SAIDA` reduces balance, `ESTORNO` increases balance, and zero/negative quantities are rejected.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd tsx --test backend/src/modules/contratos/services/contratoSaldoService.test.ts`

- [ ] **Step 3: Implement pure helpers**

Add `calcularSaldoDepoisMovimento`, `normalizarDirecaoMovimento`, and `validarQuantidadeMovimento`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd tsx --test backend/src/modules/contratos/services/contratoSaldoService.test.ts`

### Task 2: Canonical Schema

**Files:**
- Modify: `backend/src/modules/contratos/services/contratoSaldoService.ts`
- Create: `backend/src/migrations/20260511_create_contrato_produto_ledger.sql`
- Test: `backend/src/modules/contratos/services/contratoSaldoService.test.ts`

- [ ] **Step 1: Write failing schema test**

Assert `ensureContratoSaldoSchema(fakeClient)` emits `CREATE TABLE IF NOT EXISTS contrato_produto_saldos` and `CREATE TABLE IF NOT EXISTS contrato_produto_ledger`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd tsx --test backend/src/modules/contratos/services/contratoSaldoService.test.ts`

- [ ] **Step 3: Add canonical schema SQL**

Create canonical tables, indexes, uniqueness rules, and check constraints. Keep old tables for migration compatibility.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd tsx --test backend/src/modules/contratos/services/contratoSaldoService.test.ts`

### Task 3: Movement Service

**Files:**
- Modify: `backend/src/modules/contratos/services/contratoSaldoService.ts`
- Test: `backend/src/modules/contratos/services/contratoSaldoService.test.ts`

- [ ] **Step 1: Write failing service tests**

Use a fake client to assert that consumption locks the row, inserts ledger with `SAIDA_CONSUMO`, updates `saldo_atual`, and rejects insufficient balance without update.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd tsx --test backend/src/modules/contratos/services/contratoSaldoService.test.ts`

- [ ] **Step 3: Implement `registrarMovimentoContratoProduto`**

Centralize validation, lock, balance math, ledger insertion, and current-balance update.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd tsx --test backend/src/modules/contratos/services/contratoSaldoService.test.ts`

### Task 4: Faturamento Integration

**Files:**
- Modify: `backend/src/modules/contratos/services/contratoSaldoService.ts`
- Existing integration: `backend/src/modules/faturamentos/controllers/faturamentoController.ts`
- Test: `backend/src/modules/contratos/services/contratoSaldoService.test.ts`

- [ ] **Step 1: Write failing tests for faturamento consumption and estorno**

Assert consumption writes canonical ledger and estorno inserts a reverse movement instead of deleting history.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd tsx --test backend/src/modules/contratos/services/contratoSaldoService.test.ts`

- [ ] **Step 3: Switch service internals**

Update `registrarConsumoSaldoFaturamentoItem` and `estornarConsumoSaldoFaturamentoItem` to use canonical movement operations and store the canonical ledger id in `saldo_consumo_ref_id`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd tsx --test backend/src/modules/contratos/services/contratoSaldoService.test.ts`

### Task 5: API Compatibility

**Files:**
- Modify: `backend/src/modules/contratos/controllers/saldoContratosModalidadesController.ts`
- Modify: `backend/src/modules/contratos/routes/saldoContratosModalidadesRoutes.ts`
- Test: `backend/src/modules/contratos/routes/saldoContratosModalidadesRoutes.auth.test.ts`

- [ ] **Step 1: Update reads and writes to canonical tables**

Map canonical fields back to current response names and turn delete-history route into estorno behavior.

- [ ] **Step 2: Run route contract test**

Run: `npx.cmd tsx --test backend/src/modules/contratos/routes/saldoContratosModalidadesRoutes.auth.test.ts`

### Task 6: Verification

**Files:**
- Verify modified backend tests.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npx.cmd tsx --test backend/src/modules/contratos/services/contratoSaldoService.test.ts
npx.cmd tsx --test backend/src/modules/contratos/routes/saldoContratosModalidadesRoutes.auth.test.ts
```

- [ ] **Step 2: Review diff**

Run: `git diff -- backend/src/modules/contratos/services/contratoSaldoService.ts backend/src/modules/contratos/controllers/saldoContratosModalidadesController.ts backend/src/modules/contratos/routes/saldoContratosModalidadesRoutes.ts`

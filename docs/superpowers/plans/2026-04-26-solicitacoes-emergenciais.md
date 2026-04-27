# Solicitações Emergenciais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform school food requests into a lean emergency approval flow that can reserve central stock, avoid duplicate guide items, and show central/school stock while deciding.

**Architecture:** Add a focused backend service under `solicitacoes` that analyzes one request item, checks open guide coverage, locks product approval with a transaction-level advisory lock, creates/reuses a monthly emergency guide, and links the request item to the resulting guide item or existing guide coverage. Extend the existing request detail screen with an analysis dialog showing the requested quantity, suggested approval quantity, open-guide coverage, school stock, and central stock.

**Tech Stack:** Node/Express/Postgres backend, React/MUI frontend, existing `estoque_eventos`, `guias`, `guia_produto_escola`, `solicitacoes`, and `solicitacoes_itens` tables.

---

### Task 1: Database Contract

**Files:**
- Create: `backend/src/migrations/20260426_solicitacoes_emergenciais.sql`

- [ ] Add nullable approval/link fields to `solicitacoes_itens`: `quantidade_aprovada`, `data_entrega_prevista`, `guia_id`, `guia_produto_escola_id`, `atendimento_tipo`, `observacao_aprovacao`.
- [ ] Extend item status check to allow `contemplado`.
- [ ] Add indexes for linked guide items and atendimento type.

### Task 2: Backend Approval Service

**Files:**
- Create: `backend/src/modules/solicitacoes/services/SolicitacaoEmergencialService.ts`
- Modify: `backend/src/modules/solicitacoes/controllers/solicitacoesAlimentosController.ts`
- Modify: `backend/src/modules/solicitacoes/routes/solicitacoesAlimentosRoutes.ts`

- [ ] Implement `analisarItem(itemId)` returning request item, central stock, school stock, open guide coverage, suggested quantity, and default delivery date.
- [ ] Implement `aprovarItemEmergencial(itemId, payload, userId)` in one transaction.
- [ ] Use `pg_advisory_xact_lock(produto_id)` before checking central availability and inserting emergency guide item.
- [ ] If coverage is sufficient, mark item as `contemplado` and link to existing guide item.
- [ ] If coverage is partial, approve only the uncovered quantity into the monthly emergency guide.
- [ ] If coverage is absent, approve requested/edited quantity into the monthly emergency guide.
- [ ] Recalculate parent request status after item changes.

### Task 3: Frontend Request Analysis UI

**Files:**
- Modify: `frontend/src/services/solicitacoesAlimentos.ts`
- Modify: `frontend/src/modules/solicitacoes/pages/SolicitacaoEscolaDetalhe.tsx`

- [ ] Add API methods for analysis and emergency approval.
- [ ] Replace direct accept action with `Analisar`.
- [ ] Show dialog with requested quantity, suggested quantity, delivery date, central available/reserved/total, school balance, and open-guide coverage.
- [ ] Support three outcomes: `Atendida pela guia existente`, `Aprovar emergência`, and `Recusar`.

### Task 4: Verification

**Files:**
- Test existing backend build and targeted stock/request behavior by TypeScript compilation.

- [ ] Run `npm.cmd run build -- --noEmit --pretty false` in `backend`.
- [ ] Run frontend typecheck if the project script is available; otherwise report existing project typecheck limitations.

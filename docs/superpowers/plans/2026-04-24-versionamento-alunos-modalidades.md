# Versionamento de Alunos por Modalidade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar historico de mudancas na quantidade de alunos por escola/modalidade e permitir relatorios por data de referencia.

**Architecture:** `escola_modalidades` permanece como estado atual para preservar compatibilidade com cardapios, demandas, compras, entregas, saldos e dashboards. Uma nova tabela append-only registra as versoes com `vigente_de` e auditoria; consultas historicas usam a tabela nova, enquanto consultas atuais seguem usando a tabela existente.

**Tech Stack:** PostgreSQL/Neon, Express/TypeScript, React/Vite/MUI, Vitest para frontend e testes unitarios focados em helpers puros no backend quando aplicavel.

---

### Task 1: Database History Foundation

**Files:**
- Create: `backend/migrations/20260424_escola_modalidades_historico.sql`
- Create: `backend/src/modules/guias/services/escolaModalidadeHistoricoService.ts`
- Test: `backend/src/modules/guias/services/escolaModalidadeHistoricoService.test.ts`

- [ ] **Step 1: Write failing tests**

Create tests for SQL parameter helpers and report row normalization:

```ts
import {
  buildRelatorioAlunosHistoricoParams,
  normalizeHistoricoRow,
} from './escolaModalidadeHistoricoService';

describe('escolaModalidadeHistoricoService', () => {
  it('defaults the data reference to today when no filters are provided', () => {
    const params = buildRelatorioAlunosHistoricoParams({});
    expect(params.values).toHaveLength(1);
    expect(params.whereSql).toContain('h.vigente_de <= $1::date');
  });

  it('adds escola and modalidade filters with parameterized placeholders', () => {
    const params = buildRelatorioAlunosHistoricoParams({
      data_referencia: '2026-02-01',
      escola_id: '10',
      modalidade_id: '20',
    });
    expect(params.values).toEqual(['2026-02-01', 10, 20]);
    expect(params.whereSql).toContain('h.escola_id = $2');
    expect(params.whereSql).toContain('h.modalidade_id = $3');
  });

  it('normalizes numeric totals returned by postgres', () => {
    expect(normalizeHistoricoRow({
      escola_id: '1',
      modalidade_id: '2',
      quantidade_alunos: '35',
    })).toMatchObject({
      escola_id: 1,
      modalidade_id: 2,
      quantidade_alunos: 35,
    });
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run: `npm.cmd test --prefix backend -- escolaModalidadeHistoricoService.test.ts`

Expected: fail because the service file does not exist.

- [ ] **Step 3: Implement migration and service**

Create `escola_modalidades_historico` with indexes for `(escola_id, modalidade_id, vigente_de)` and `(vigente_de)`. Implement helpers and functions for: bootstrapping existing current rows, recording create/update/delete, listing history, and reporting by `data_referencia`.

- [ ] **Step 4: Run tests and build backend**

Run: `npm.cmd test --prefix backend -- escolaModalidadeHistoricoService.test.ts`

Run: `npm.cmd run build --prefix backend`

Expected: tests pass and TypeScript builds.

### Task 2: Backend Routes and Current Write Integration

**Files:**
- Modify: `backend/src/modules/guias/controllers/escolaModalidadeController.ts`
- Modify: `backend/src/modules/guias/routes/escolaModalidadeRoutes.ts`

- [ ] **Step 1: Add endpoint behavior tests if backend test harness supports controller tests**

If Jest cannot load TS controllers in this project, keep coverage at service level and validate via TypeScript build.

- [ ] **Step 2: Wrap writes in transactions**

For create/update/delete of `escola_modalidades`, perform current-table mutation and history insert in one transaction. Accept optional `vigente_de` and `observacao` from request body. Use parameterized queries only.

- [ ] **Step 3: Add read endpoints**

Add:
- `GET /api/escola-modalidades/historico`
- `GET /api/escola-modalidades/relatorio-alunos`

Place these before `/:id` so Express does not treat them as numeric ids.

- [ ] **Step 4: Invalidate affected caches**

Invalidate `escolas`, `modalidades`, and `dashboard` caches after student count writes, matching existing cache service patterns.

### Task 3: Frontend Services and UI

**Files:**
- Modify: `frontend/src/services/escolas.ts`
- Modify: `frontend/src/modules/escolas/pages/GerenciarAlunosModalidades.tsx`
- Modify: `frontend/src/modules/escolas/pages/EscolaDetalhes.tsx`
- Create: `frontend/src/modules/escolas/pages/RelatorioAlunosModalidades.tsx` if routing allows a new page cleanly
- Modify: route registration file discovered during implementation

- [ ] **Step 1: Write failing frontend service tests**

Add tests proving the service calls use `/escola-modalidades/historico` and `/escola-modalidades/relatorio-alunos` with query parameters.

- [ ] **Step 2: Add service methods**

Add:
- `listarHistoricoAlunosModalidades(filtros)`
- `gerarRelatorioAlunosModalidades(filtros)`

- [ ] **Step 3: Capture effective date on edits**

Use today as default `vigente_de` in matrix saves and detail modal saves. Keep UI compact; do not force users through a heavy workflow for every cell edit.

- [ ] **Step 4: Add report view**

Create a report screen with date reference, optional escola/modalidade filters, totals by school, totals by modality, and overall total.

- [ ] **Step 5: Run frontend tests and build**

Run: `npm.cmd run test:run --prefix frontend -- src/services/escolas.test.ts`

Run: `npm.cmd run build:desktop --prefix frontend`

### Task 4: Architecture Audit

**Files:**
- Create: `docs/architecture/auditoria-alunos-modalidades-db-2026-04-24.md`

- [ ] **Step 1: Document module map**

List every module that reads `quantidade_alunos`, whether it needs current-state or historical-date behavior, and the risk if it keeps using current state.

- [ ] **Step 2: Document schema risks**

Include duplicate tables (`escola_modalidades` vs `escolas_modalidades`), suspicious unique constraints in `schema.sql`, live-Neon validation requirements, and possible cleanup path.

- [ ] **Step 3: Recommend staged cleanup**

Do not drop tables automatically. Provide migration-safe next steps and verification queries.


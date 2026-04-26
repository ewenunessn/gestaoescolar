# Fluxo Abastecimento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a consistent Abastecimento entry point that connects demand generation, guides, purchases, delivery scheduling, deliveries, romaneio, routes, and receipts.

**Architecture:** Keep existing operational pages and routes, then add a thin navigation/dashboard layer above them. Centralize status labels/colors in one utility so future screens can reuse the same vocabulary without backend schema changes.

**Tech Stack:** React, React Router, Material UI, existing API services, Vite/Vitest.

---

### Task 1: Shared Abastecimento Status Utility

**Files:**
- Create: `frontend/src/modules/abastecimento/status.ts`

- [ ] **Step 1: Add status labels, colors, and ordered flow steps**

Create `frontend/src/modules/abastecimento/status.ts` with:

```ts
export type FlowStepId =
  | "demanda"
  | "guia"
  | "compra"
  | "programacao"
  | "entrega"
  | "documentos";

export const ABASTECIMENTO_FLOW_STEPS = [
  { id: "demanda", title: "Gerar Demanda", path: "/guias-demanda", description: "Calcular consumo e gerar guia por competencia." },
  { id: "guia", title: "Guias de Demanda", path: "/guias-demanda", description: "Revisar escolas, produtos, quantidades e status." },
  { id: "compra", title: "Compras / Pedidos", path: "/compras", description: "Gerar e acompanhar pedidos vinculados as guias." },
  { id: "programacao", title: "Programacao de Entrega", path: "/compras", description: "Definir datas e distribuicao por escola." },
  { id: "entrega", title: "Entregas", path: "/entregas", description: "Executar entrega por guia, escola e rota." },
  { id: "documentos", title: "Romaneio e Comprovantes", path: "/romaneio", description: "Emitir documentos e consultar comprovantes." },
] as const;

export const ABASTECIMENTO_STATUS = {
  guia: {
    aberta: { label: "Em revisao", color: "warning" },
    fechada: { label: "Concluida", color: "success" },
    cancelada: { label: "Cancelada", color: "error" },
  },
  itemGuia: {
    pendente: { label: "Pendente", color: "warning" },
    programada: { label: "Programada", color: "info" },
    parcial: { label: "Parcial", color: "warning" },
    entregue: { label: "Entregue", color: "success" },
    cancelado: { label: "Cancelado", color: "error" },
  },
  pedido: {
    pendente: { label: "Pendente", color: "warning" },
    recebido_parcial: { label: "Recebido parcial", color: "info" },
    concluido: { label: "Concluido", color: "success" },
    suspenso: { label: "Suspenso", color: "secondary" },
    cancelado: { label: "Cancelado", color: "error" },
  },
} as const;

export function getAbastecimentoStatus(
  group: keyof typeof ABASTECIMENTO_STATUS,
  value: string
) {
  const groupMap = ABASTECIMENTO_STATUS[group] as Record<string, { label: string; color: string }>;
  return groupMap[value] ?? { label: value || "Sem status", color: "default" };
}
```

### Task 2: Abastecimento Dashboard Page

**Files:**
- Create: `frontend/src/modules/abastecimento/pages/Abastecimento.tsx`

- [ ] **Step 1: Build a dashboard using existing services**

Create `frontend/src/modules/abastecimento/pages/Abastecimento.tsx` with a page header, metric cards, flow step cards, recent guides, recent purchases, and delivery summary. Use `guiaService.listarCompetencias()`, `pedidosService.listar({ limit: 5 })`, and `entregaService.obterEstatisticas()`. All calls must fail soft and keep the page usable.

### Task 3: Router And Menu

**Files:**
- Modify: `frontend/src/routes/AppRouter.tsx`
- Modify: `frontend/src/components/LayoutModerno.tsx`
- Modify: `frontend/src/components/GlobalSearch.tsx`

- [ ] **Step 1: Add lazy route**

Add `const Abastecimento = lazy(() => import("../modules/abastecimento/pages/Abastecimento"));` and route `/abastecimento` guarded by a compras-compatible permission slug.

- [ ] **Step 2: Reorganize sidebar**

Add an `Abastecimento` group with:

```ts
{ text: "Visao Geral", icon: <Dashboard fontSize="small" />, path: "/abastecimento" },
{ text: "Gerar Demanda", icon: <Calculate fontSize="small" />, path: "/compras/planejamento" },
{ text: "Guias de Demanda", icon: <ListAlt fontSize="small" />, path: "/guias-demanda" },
{ text: "Compras / Pedidos", icon: <RequestPage fontSize="small" />, path: "/compras" },
{ text: "Programacao de Entrega", icon: <Schedule fontSize="small" />, path: "/compras" },
{ text: "Entregas", icon: <LocalShipping fontSize="small" />, path: "/entregas" },
{ text: "Romaneio", icon: <Print fontSize="small" />, path: "/romaneio" },
{ text: "Comprovantes", icon: <Description fontSize="small" />, path: "/comprovantes-entrega" },
{ text: "Rotas", icon: <Business fontSize="small" />, path: "/gestao-rotas" },
```

Keep `Saldo Contratos` and `Dashboard PNAE` under `Compras`.

- [ ] **Step 3: Add search result**

Add `/abastecimento` to `PAGE_INDEX` so global search can find the new entry point.

### Task 4: Verification

**Files:**
- No source file changes.

- [ ] **Step 1: Run focused TypeScript build if practical**

Run from `frontend`:

```powershell
npm.cmd run build -- --mode development
```

If full build fails due existing unrelated errors, record the failing files and run at least a focused syntax check by importing the new route through Vite/TypeScript if available.

- [ ] **Step 2: Manual flow check**

Open `/abastecimento` and verify the action buttons navigate to:

- `/compras/planejamento`
- `/guias-demanda`
- `/compras`
- `/entregas`
- `/romaneio`
- `/comprovantes-entrega`
- `/gestao-rotas`

Expected: page renders even when some API calls fail.

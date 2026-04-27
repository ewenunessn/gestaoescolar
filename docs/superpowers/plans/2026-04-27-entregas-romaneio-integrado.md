# Entregas Romaneio Integrado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar o acesso ao Romaneio a partir de Entregas e permitir filtro de uma, varias ou todas as rotas na exibicao, API, PDF e QR Code.

**Architecture:** A tela de Entregas serializa os filtros principais em query string e navega para `/romaneio`. O Romaneio inicializa seus filtros por helpers puros, segue editavel localmente, e envia `rota_ids` para o backend. O backend normaliza `rota_id`/`rota_ids` e aplica o filtro com query parametrizada.

**Tech Stack:** React 18, React Router, MUI, Vitest, Express, TypeScript, node:test via `tsx`.

---

## File Structure

- Create: `backend/src/modules/guias/models/romaneioFilters.ts` - normaliza rotas e gera SQL parametrizado para filtro de rotas.
- Create: `backend/src/modules/guias/models/romaneioFilters.test.ts` - cobre rota unica, rotas multiplas, valores invalidos e SQL parametrizado.
- Modify: `backend/src/modules/guias/models/Guia.ts` - usa `rotaIds` no filtro do romaneio.
- Modify: `backend/src/modules/guias/controllers/guiaController.ts` - aceita `rota_ids` sem quebrar `rota_id`.
- Create: `frontend/src/modules/entregas/utils/romaneioFilters.ts` - serializa filtros de Entregas e parseia filtros iniciais do Romaneio.
- Create: `frontend/src/modules/entregas/utils/romaneioFilters.test.ts` - cobre URL, parse de `rotaIds` e params da API.
- Modify: `frontend/src/modules/entregas/pages/Entregas.tsx` - adiciona botao Romaneio no cabecalho.
- Modify: `frontend/src/modules/entregas/pages/Romaneio.tsx` - inicializa pela URL e envia `rota_ids`.
- Modify: `frontend/src/services/guiaService.ts` - aceita `rota_ids`.
- Modify: `frontend/src/hooks/queries/useRomaneioQueries.ts` - aceita `rota_ids`.
- Modify: `frontend/src/components/LayoutModerno.tsx` - remove Romaneio do menu lateral.

### Task 1: Backend Route Filters

**Files:**
- Create: `backend/src/modules/guias/models/romaneioFilters.ts`
- Test: `backend/src/modules/guias/models/romaneioFilters.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildRomaneioRouteFilter,
  normalizeRomaneioRouteIds,
} from "./romaneioFilters";

describe("romaneioFilters", () => {
  it("normalizes legacy rota_id and comma-separated rota_ids", () => {
    assert.deepEqual(normalizeRomaneioRouteIds({ rota_id: "7" }), [7]);
    assert.deepEqual(normalizeRomaneioRouteIds({ rota_ids: "1,2,3" }), [1, 2, 3]);
  });

  it("deduplicates and ignores invalid route ids", () => {
    assert.deepEqual(
      normalizeRomaneioRouteIds({ rota_ids: ["2", "abc", "2", "-1", "4"] }),
      [2, 4],
    );
  });

  it("prefers explicit rota_ids but keeps rota_id compatibility", () => {
    assert.deepEqual(normalizeRomaneioRouteIds({ rota_id: "5", rota_ids: "1,2" }), [1, 2, 5]);
  });

  it("builds a parameterized ANY filter for selected routes", () => {
    const filter = buildRomaneioRouteFilter([1, 2], 4);

    assert.equal(filter.values.length, 1);
    assert.deepEqual(filter.values[0], [1, 2]);
    assert.match(filter.sql, /res\.rota_id = ANY\(\$4::int\[\]\)/);
  });

  it("does not add SQL when no routes are selected", () => {
    assert.deepEqual(buildRomaneioRouteFilter([], 3), { sql: "", values: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test backend/src/modules/guias/models/romaneioFilters.test.ts`
Expected: FAIL because `./romaneioFilters` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface RomaneioRouteFilterInput {
  rota_id?: unknown;
  rota_ids?: unknown;
  rotaId?: unknown;
  rotaIds?: unknown;
}

function collectRouteIdValues(value: unknown, output: unknown[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectRouteIdValues(item, output));
    return;
  }

  if (typeof value === "string") {
    value.split(",").forEach((item) => output.push(item.trim()));
    return;
  }

  if (value !== undefined && value !== null) {
    output.push(value);
  }
}

export function normalizeRomaneioRouteIds(input: RomaneioRouteFilterInput = {}): number[] {
  const rawValues: unknown[] = [];
  collectRouteIdValues(input.rota_ids ?? input.rotaIds, rawValues);
  collectRouteIdValues(input.rota_id ?? input.rotaId, rawValues);

  const seen = new Set<number>();
  const routeIds: number[] = [];

  for (const value of rawValues) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0 || seen.has(parsed)) continue;
    seen.add(parsed);
    routeIds.push(parsed);
  }

  return routeIds;
}

export function buildRomaneioRouteFilter(routeIds: number[], paramIndex: number) {
  if (routeIds.length === 0) {
    return { sql: "", values: [] as any[] };
  }

  return {
    sql: ` AND EXISTS (
          SELECT 1 FROM rota_escolas res
          WHERE res.escola_id = e.id AND res.rota_id = ANY($${paramIndex}::int[])
        )`,
    values: [routeIds],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test backend/src/modules/guias/models/romaneioFilters.test.ts`
Expected: PASS with 5 tests.

### Task 2: Backend Romaneio API

**Files:**
- Modify: `backend/src/modules/guias/models/Guia.ts`
- Modify: `backend/src/modules/guias/controllers/guiaController.ts`

- [ ] **Step 1: Wire controller normalization**

In `guiaController.ts`, import `normalizeRomaneioRouteIds` and pass `rotaIds`:

```ts
import { normalizeRomaneioRouteIds } from '../models/romaneioFilters';
```

Inside `listarRomaneio`:

```ts
const { data_inicio, data_fim, escola_id, rota_id, rota_ids, status } = req.query;
const rotaIds = normalizeRomaneioRouteIds({ rota_id, rota_ids });

const items = await GuiaModel.listarRomaneio({
  dataInicio: data_inicio as string,
  dataFim: data_fim as string,
  escolaId: escola_id ? parseInt(escola_id as string) : undefined,
  rotaId: rota_id ? parseInt(rota_id as string) : undefined,
  rotaIds,
  status: status as string
});
```

- [ ] **Step 2: Wire model route filter**

In `Guia.ts`, import helpers and extend the filter type:

```ts
import { buildRomaneioRouteFilter, normalizeRomaneioRouteIds } from './romaneioFilters';
```

Change `listarRomaneio` signature:

```ts
async listarRomaneio(filtros: { dataInicio?: string; dataFim?: string; escolaId?: number; rotaId?: number; rotaIds?: number[]; status?: string }): Promise<any[]> {
```

Replace the old `if (filtros.rotaId)` block with:

```ts
const routeIds = normalizeRomaneioRouteIds({
  rotaId: filtros.rotaId,
  rotaIds: filtros.rotaIds,
});
const routeFilter = buildRomaneioRouteFilter(routeIds, paramCount);
if (routeFilter.sql) {
  query += routeFilter.sql;
  params.push(...routeFilter.values);
  paramCount += routeFilter.values.length;
}
```

- [ ] **Step 3: Run backend focused tests**

Run: `npx tsx --test backend/src/modules/guias/models/romaneioFilters.test.ts`
Expected: PASS.

### Task 3: Frontend Filter Helpers

**Files:**
- Create: `frontend/src/modules/entregas/utils/romaneioFilters.ts`
- Test: `frontend/src/modules/entregas/utils/romaneioFilters.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import {
  buildRomaneioApiParams,
  buildRomaneioUrlFromEntregaFilters,
  parseRomaneioFiltersFromSearch,
} from "./romaneioFilters";

describe("romaneioFilters frontend helpers", () => {
  it("serializes entrega period and route filters into the romaneio URL", () => {
    expect(buildRomaneioUrlFromEntregaFilters({
      dataInicio: "2026-04-01",
      dataFim: "2026-04-30",
      rotaId: 8,
      somentePendentes: true,
    })).toBe("/romaneio?dataInicio=2026-04-01&dataFim=2026-04-30&rotaIds=8&status=pendente");
  });

  it("parses multiple route ids from the URL", () => {
    const parsed = parseRomaneioFiltersFromSearch("?dataInicio=2026-04-01&dataFim=2026-04-30&rotaIds=1,2,abc,2", {
      dataInicio: "2026-04-01",
      dataFim: "2026-04-30",
    });

    expect(parsed.rotaIds).toEqual([1, 2]);
    expect(parsed.filters.dataInicio).toBe("2026-04-01");
    expect(parsed.filters.dataFim).toBe("2026-04-30");
  });

  it("builds API params with rota_ids for one or more routes", () => {
    expect(buildRomaneioApiParams({
      dataInicio: "2026-04-01",
      dataFim: "2026-04-30",
      status: "todos",
    }, [1, 2])).toEqual({
      data_inicio: "2026-04-01",
      data_fim: "2026-04-30",
      status: undefined,
      rota_ids: "1,2",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend run test:run -- src/modules/entregas/utils/romaneioFilters.test.ts`
Expected: FAIL because `./romaneioFilters` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface EntregaRomaneioFilters {
  dataInicio?: string;
  dataFim?: string;
  rotaId?: number;
  rotaIds?: number[];
  somentePendentes?: boolean;
}

export interface RomaneioPageFilters {
  dataInicio: string;
  dataFim: string;
  status: string;
  search?: string;
}

export function parseRouteIds(value?: string | null): number[] {
  if (!value) return [];
  const seen = new Set<number>();
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((id) => Number.isInteger(id) && id > 0 && !seen.has(id) && seen.add(id));
}

export function buildRomaneioUrlFromEntregaFilters(filtros: EntregaRomaneioFilters): string {
  const params = new URLSearchParams();
  if (filtros.dataInicio) params.set("dataInicio", filtros.dataInicio);
  if (filtros.dataFim) params.set("dataFim", filtros.dataFim);
  const routeIds = filtros.rotaIds?.length ? filtros.rotaIds : filtros.rotaId ? [filtros.rotaId] : [];
  if (routeIds.length > 0) params.set("rotaIds", routeIds.join(","));
  if (filtros.somentePendentes) params.set("status", "pendente");
  const query = params.toString();
  return query ? `/romaneio?${query}` : "/romaneio";
}

export function parseRomaneioFiltersFromSearch(
  search: string,
  defaults: { dataInicio: string; dataFim: string },
) {
  const params = new URLSearchParams(search);
  const rotaIds = parseRouteIds(params.get("rotaIds") || params.get("rotaId"));

  return {
    filters: {
      dataInicio: params.get("dataInicio") || defaults.dataInicio,
      dataFim: params.get("dataFim") || defaults.dataFim,
      status: params.get("status") || "todos",
    },
    rotaIds,
  };
}

export function buildRomaneioApiParams(filters: RomaneioPageFilters, rotaIds: number[]) {
  return {
    data_inicio: filters.dataInicio,
    data_fim: filters.dataFim,
    status: filters.status === "todos" ? undefined : filters.status,
    rota_ids: rotaIds.length > 0 ? rotaIds.join(",") : undefined,
  };
}
```

- [ ] **Step 4: Run frontend helper test**

Run: `npm --prefix frontend run test:run -- src/modules/entregas/utils/romaneioFilters.test.ts`
Expected: PASS with 3 tests.

### Task 4: Frontend Pages and Service

**Files:**
- Modify: `frontend/src/modules/entregas/pages/Entregas.tsx`
- Modify: `frontend/src/modules/entregas/pages/Romaneio.tsx`
- Modify: `frontend/src/services/guiaService.ts`
- Modify: `frontend/src/hooks/queries/useRomaneioQueries.ts`
- Modify: `frontend/src/components/LayoutModerno.tsx`

- [ ] **Step 1: Add Entregas button**

In `Entregas.tsx`, use `useNavigate`, `Button`, `PrintIcon`, and `buildRomaneioUrlFromEntregaFilters`.

```tsx
const navigate = useNavigate();

<PageHeader
  title="Entregas"
  breadcrumbs={[
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Entregas' },
  ]}
  action={
    <Button
      variant="contained"
      startIcon={<PrintIcon />}
      onClick={() => navigate(buildRomaneioUrlFromEntregaFilters(filtros))}
    >
      Romaneio
    </Button>
  }
/>
```

- [ ] **Step 2: Initialize Romaneio from URL and use `rota_ids`**

In `Romaneio.tsx`, use `useLocation`, `parseRomaneioFiltersFromSearch`, and `buildRomaneioApiParams`. Replace direct initialization and query params with helper output:

```tsx
const location = useLocation();
const defaultRomaneioFilters = useMemo(() => {
  const hoje = new Date();
  return {
    dataInicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0],
    dataFim: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0],
  };
}, []);
const initialRomaneioFilters = useMemo(
  () => parseRomaneioFiltersFromSearch(location.search, defaultRomaneioFilters),
  [location.search, defaultRomaneioFilters],
);
const [filters, setFilters] = useState<Record<string, any>>(() => initialRomaneioFilters.filters);
const [rotaIds, setRotaIds] = useState<number[]>(() => initialRomaneioFilters.rotaIds);
const romaneioApiParams = useMemo(
  () => buildRomaneioApiParams(filters as any, rotaIds),
  [filters, rotaIds],
);
const { data: itens = [], isLoading: loading, error: queryError } = useRomaneio(romaneioApiParams);
```

- [ ] **Step 3: Update QR data for all routes**

In `gerarQRCodeAutomatico`, allow all routes by removing the early return on empty routes and set `escopoRotas`:

```ts
if (!filters.dataInicio || !filters.dataFim) return;
const escopoRotas = rotaIds.length === 0 ? 'todas' : 'selecionadas';
```

Include `escopoRotas` in `qrData`.

- [ ] **Step 4: Update frontend service types**

In `guiaService.ts` and `useRomaneioQueries.ts`, add `rota_ids?: string` to romaneio params and stop sending only `rota_id`.

- [ ] **Step 5: Remove menu item**

In `LayoutModerno.tsx`, remove:

```tsx
{ text: "Romaneio", icon: <Print fontSize="small" />, path: "/romaneio" },
```

Keep the `/romaneio` route in `AppRouter.tsx`.

- [ ] **Step 6: Run focused frontend tests**

Run: `npm --prefix frontend run test:run -- src/modules/entregas/utils/romaneioFilters.test.ts`
Expected: PASS.

### Task 5: Build Verification

**Files:**
- No new files.

- [ ] **Step 1: Run backend TypeScript build**

Run: `npm --prefix backend run build`
Expected: exit 0.

- [ ] **Step 2: Run frontend TypeScript/Vite build**

Run: `npm --prefix frontend run build`
Expected: exit 0.

- [ ] **Step 3: Inspect final diff**

Run: `git diff -- backend/src/modules/guias/models/romaneioFilters.ts backend/src/modules/guias/models/romaneioFilters.test.ts backend/src/modules/guias/models/Guia.ts backend/src/modules/guias/controllers/guiaController.ts frontend/src/modules/entregas/utils/romaneioFilters.ts frontend/src/modules/entregas/utils/romaneioFilters.test.ts frontend/src/modules/entregas/pages/Entregas.tsx frontend/src/modules/entregas/pages/Romaneio.tsx frontend/src/services/guiaService.ts frontend/src/hooks/queries/useRomaneioQueries.ts frontend/src/components/LayoutModerno.tsx`
Expected: diff only touches the planned files.

---

## Self-Review

- Spec coverage: Entregas opens Romaneio, menu item removed, URL seeds filters, Romaneio supports one/many/all routes, QR/PDF use current Romaneio filters, backend accepts `rota_id` and `rota_ids`.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: backend uses `rotaIds: number[]`; frontend API sends `rota_ids: string`; URL helper uses `rotaIds` query param.

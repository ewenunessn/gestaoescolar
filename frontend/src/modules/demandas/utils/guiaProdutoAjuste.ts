export interface GuiaProdutoAjusteRow {
  id: number;
  escola_nome: string;
  quantidade: number;
  quantidade_demanda?: number;
  unidade: string;
  data_entrega?: string | null;
  status?: string;
  produto_id?: number;
  produto_nome?: string;
  escola_id?: number;
}

export type BulkQuantityMode = "set" | "add" | "percent";

export interface BulkQuantityAdjustment {
  mode: BulkQuantityMode;
  value: number;
  roundMultiple?: number | null;
}

export interface ChangedItemUpdate {
  itemId: number;
  payload: {
    quantidade?: number;
    unidade?: string;
    data_entrega?: string | null;
  };
}

export function normalizeDateKey(value?: string | null): string | null {
  if (!value) return null;
  const normalized = String(value).split("T")[0];
  return normalized || null;
}

export function roundByMultiple(value: number, multiple?: number | null): number {
  if (!multiple || multiple <= 0) return Math.round(value * 1000) / 1000;
  return Math.round((value / multiple)) * multiple;
}

export function applyBulkQuantityAdjustment(
  rows: GuiaProdutoAjusteRow[],
  selectedIds: Set<number>,
  adjustment: BulkQuantityAdjustment,
): GuiaProdutoAjusteRow[] {
  return rows.map(row => {
    if (!selectedIds.has(row.id)) return row;

    let quantidade = Number(row.quantidade) || 0;
    if (adjustment.mode === "set") {
      quantidade = adjustment.value;
    } else if (adjustment.mode === "add") {
      quantidade += adjustment.value;
    } else {
      quantidade *= 1 + adjustment.value / 100;
    }

    return {
      ...row,
      quantidade: Math.max(0, roundByMultiple(quantidade, adjustment.roundMultiple)),
    };
  });
}

export function summarizeQuantityChange(
  beforeRows: GuiaProdutoAjusteRow[],
  afterRows: GuiaProdutoAjusteRow[],
) {
  const before = beforeRows.reduce((sum, row) => sum + (Number(row.quantidade) || 0), 0);
  const after = afterRows.reduce((sum, row) => sum + (Number(row.quantidade) || 0), 0);
  return {
    before,
    after,
    diff: after - before,
  };
}

export function buildChangedItemUpdates(
  rows: GuiaProdutoAjusteRow[],
  originalRows: GuiaProdutoAjusteRow[],
): ChangedItemUpdate[] {
  const originalById = new Map(originalRows.map(row => [row.id, row]));

  return rows.flatMap(row => {
    const original = originalById.get(row.id);
    if (!original) return [];

    const payload: ChangedItemUpdate["payload"] = {};
    if ((Number(row.quantidade) || 0) !== (Number(original.quantidade) || 0)) {
      payload.quantidade = Number(row.quantidade) || 0;
    }
    if ((row.unidade || "") !== (original.unidade || "")) {
      payload.unidade = row.unidade;
    }
    if (normalizeDateKey(row.data_entrega) !== normalizeDateKey(original.data_entrega)) {
      payload.data_entrega = normalizeDateKey(row.data_entrega);
    }

    return Object.keys(payload).length ? [{ itemId: row.id, payload }] : [];
  });
}

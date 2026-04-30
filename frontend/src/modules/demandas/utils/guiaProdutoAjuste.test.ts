import { describe, expect, it } from "vitest";
import {
  applyBulkQuantityAdjustment,
  buildChangedItemUpdates,
  normalizeDateKey,
  summarizeQuantityChange,
  type GuiaProdutoAjusteRow,
} from "./guiaProdutoAjuste";

const baseRows: GuiaProdutoAjusteRow[] = [
  {
    id: 1,
    escola_nome: "EMEF Alice",
    quantidade: 10,
    quantidade_demanda: 8,
    unidade: "KG",
    data_entrega: "2026-05-10",
  },
  {
    id: 2,
    escola_nome: "EMEF Didi",
    quantidade: 5,
    quantidade_demanda: 5,
    unidade: "KG",
    data_entrega: "2026-05-10T00:00:00.000Z",
  },
];

describe("guiaProdutoAjuste helpers", () => {
  it("normalizes empty and timestamp delivery dates for stable product filtering", () => {
    expect(normalizeDateKey(null)).toBeNull();
    expect(normalizeDateKey("")).toBeNull();
    expect(normalizeDateKey("2026-05-10T00:00:00.000Z")).toBe("2026-05-10");
  });

  it("builds updates only for rows changed from their original operational values", () => {
    const rows = [
      { ...baseRows[0], quantidade: 12 },
      { ...baseRows[1], data_entrega: "2026-05-11" },
    ];

    expect(buildChangedItemUpdates(rows, baseRows)).toEqual([
      { itemId: 1, payload: { quantidade: 12 } },
      { itemId: 2, payload: { data_entrega: "2026-05-11" } },
    ]);
  });

  it("applies bulk quantity adjustments without changing unselected schools", () => {
    const adjusted = applyBulkQuantityAdjustment(baseRows, new Set([1]), {
      mode: "add",
      value: 2,
      roundMultiple: 5,
    });

    expect(adjusted.find(row => row.id === 1)?.quantidade).toBe(10);
    expect(adjusted.find(row => row.id === 2)?.quantidade).toBe(5);
  });

  it("summarizes current and adjusted totals for confirmation previews", () => {
    expect(summarizeQuantityChange(baseRows, [
      { ...baseRows[0], quantidade: 12 },
      { ...baseRows[1], quantidade: 6 },
    ])).toEqual({
      before: 15,
      after: 18,
      diff: 3,
    });
  });

  it("treats the current edited rows as clean after they become the saved baseline", () => {
    const savedRows = [
      { ...baseRows[0], data_entrega: "2026-05-11" },
      { ...baseRows[1], quantidade: 7 },
    ];

    expect(buildChangedItemUpdates(savedRows, savedRows)).toEqual([]);
  });
});

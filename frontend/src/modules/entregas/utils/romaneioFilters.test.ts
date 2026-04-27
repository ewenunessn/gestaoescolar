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
    })).toBe("/entregas/romaneio?dataInicio=2026-04-01&dataFim=2026-04-30&rotaIds=8&status=pendente");
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

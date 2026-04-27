import { describe, expect, it } from "vitest";

import {
  buildRomaneioPdfFileName,
  buildRomaneioPdfRows,
  getRomaneioRouteLabel,
} from "./romaneioPdf";

describe("romaneioPdf helpers", () => {
  it("formats selected route labels and treats empty selection as all routes", () => {
    const rotas = [
      { id: 1, nome: "Rota Norte" },
      { id: 2, nome: "Rota Sul" },
    ];

    expect(getRomaneioRouteLabel([], rotas)).toBe("Todas as Rotas");
    expect(getRomaneioRouteLabel([1], rotas)).toBe("Rota Norte");
    expect(getRomaneioRouteLabel([1, 2], rotas)).toBe("Todas as Rotas");
  });

  it("builds summary table rows for the PDF", () => {
    const rows = buildRomaneioPdfRows([
      {
        data_entrega_formatada: "27/04/2026",
        produto_nome: "Arroz",
        quantidade_formatada: "20",
        unidade: "kg",
        num_escolas: 2,
      },
    ]);

    expect(rows).toEqual([
      [
        "27/04/2026",
        "Arroz",
        "20",
        "kg",
        "2",
      ],
    ]);
  });

  it("uses the selected period in the generated file name", () => {
    expect(buildRomaneioPdfFileName({ dataInicio: "2026-04-01", dataFim: "2026-04-27" }))
      .toBe("romaneio-2026-04-01-a-2026-04-27.pdf");
  });
});

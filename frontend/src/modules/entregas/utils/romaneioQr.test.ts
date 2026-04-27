import { describe, expect, it } from "vitest";

import { buildRomaneioQrPayload } from "./romaneioQr";

const rotas = [
  { id: 1, nome: "Rota Norte" },
  { id: 2, nome: "Rota Sul" },
];

describe("romaneioQr helpers", () => {
  it("builds an app-compatible payload for all routes", () => {
    const payload = buildRomaneioQrPayload({
      rotaIds: [],
      rotas,
      filters: { dataInicio: "2026-04-01", dataFim: "2026-04-27", status: "todos" },
    });

    expect(payload).toMatchObject({
      t: "romaneio",
      r: "*",
      di: "2026-04-01",
      df: "2026-04-27",
      s: "todos",
    });
  });

  it("builds an app-compatible payload for selected routes", () => {
    const payload = buildRomaneioQrPayload({
      rotaIds: [2],
      rotas,
      filters: { dataInicio: "2026-04-01", dataFim: "2026-04-27", status: "pendente" },
    });

    expect(payload).toMatchObject({
      t: "romaneio",
      r: [2],
      rns: ["Rota Sul"],
      rn: "Rota Sul",
      s: "pendente",
    });
  });
});

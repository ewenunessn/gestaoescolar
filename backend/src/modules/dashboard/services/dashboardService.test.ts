import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DashboardService } from "./dashboardService";

describe("DashboardService", () => {
  it("aggregates summaries through declared module providers", async () => {
    const service = new DashboardService({
      escolas: {
        getResumo: async () => ({ total: 12, ativas: 10, alunos: 340 }),
      },
      solicitacoes: {
        getResumo: async () => ({ total: 9, atendidas: 6 }),
      },
    });

    const resumo = await service.getResumo();

    assert.deepEqual(resumo, {
      escolas: { total: 12, ativas: 10 },
      alunos: 340,
      solicitacoes: { total: 9, atendidas: 6 },
    });
  });

  it("uses cache when a dashboard summary is already available", async () => {
    let escolasCalls = 0;
    const service = new DashboardService(
      {
        escolas: {
          getResumo: async () => {
            escolasCalls += 1;
            return { total: 12, ativas: 10, alunos: 340 };
          },
        },
        solicitacoes: {
          getResumo: async () => ({ total: 9, atendidas: 6 }),
        },
      },
      {
        get: async <T>() => ({
          escolas: { total: 1, ativas: 1 },
          alunos: 20,
          solicitacoes: { total: 2, atendidas: 1 },
        }) as T,
        set: async () => undefined,
      },
    );

    const resumo = await service.getResumo("web");

    assert.equal(escolasCalls, 0);
    assert.deepEqual(resumo, {
      escolas: { total: 1, ativas: 1 },
      alunos: 20,
      solicitacoes: { total: 2, atendidas: 1 },
    });
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyStockEvents,
  buildEstornoEvent,
  buildSchoolMovementEvent,
  validateTransferCentralBalance,
  validateStockDelta,
} from "./estoqueLedgerService";

describe("estoqueLedgerService", () => {
  it("rebuilds balance from deltas in order", () => {
    const saldo = applyStockEvents([
      { quantidade_delta: 10 },
      { quantidade_delta: -4 },
      { quantidade_delta: 3 },
    ]);

    assert.equal(saldo, 9);
  });

  it("rejects an outgoing movement above available balance", () => {
    assert.throws(() => validateStockDelta({ saldoAtual: 5, quantidadeDelta: -6 }), {
      message: "Saldo insuficiente para a movimentacao",
    });
  });

  it("allows delivery transfers to leave central stock negative only when explicitly enabled", () => {
    assert.throws(
      () => validateTransferCentralBalance({
        saldoCentral: 0,
        quantidade: 2,
      }),
      { message: "Saldo insuficiente para a movimentacao" },
    );

    assert.doesNotThrow(() =>
      validateTransferCentralBalance({
        saldoCentral: 0,
        quantidade: 2,
        permitirSaldoNegativoCentral: true,
      }),
    );
  });

  it("creates an explicit estorno event instead of deleting history", () => {
    const estorno = buildEstornoEvent({
      id: 55,
      escopo: "escola",
      escola_id: 3,
      produto_id: 9,
      tipo_evento: "saida_escola",
      origem: "portal_escola",
      quantidade_delta: -2,
      motivo: "Consumo lancado em duplicidade",
      observacao: "corrigindo",
    });

    assert.equal(estorno.evento_estornado_id, 55);
    assert.equal(estorno.quantidade_delta, 2);
    assert.equal(estorno.tipo_evento, "estorno_evento");
    assert.equal(estorno.origem, "estorno");
  });

  it("maps legacy school movement payloads to ledger events", () => {
    const entrada = buildSchoolMovementEvent({
      escolaId: 4,
      produtoId: 8,
      tipoMovimentacao: "entrada",
      quantidade: 5,
      origem: "portal_escola",
    });
    const saida = buildSchoolMovementEvent({
      escolaId: 4,
      produtoId: 8,
      tipoMovimentacao: "saida",
      quantidade: 3,
      origem: "central_operador",
    });
    const ajuste = buildSchoolMovementEvent({
      escolaId: 4,
      produtoId: 8,
      tipoMovimentacao: "ajuste",
      quantidade: 11,
      origem: "central_operador",
    });

    assert.equal(entrada.tipo_evento, "entrada_manual_escola");
    assert.equal(entrada.quantidade_delta, 5);
    assert.equal(saida.tipo_evento, "saida_escola");
    assert.equal(saida.quantidade_delta, -3);
    assert.equal(ajuste.tipo_evento, "ajuste_estoque");
    assert.equal(ajuste.quantidade_absoluta, 11);
  });
});

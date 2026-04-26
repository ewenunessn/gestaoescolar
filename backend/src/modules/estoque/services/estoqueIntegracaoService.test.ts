import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildRecebimentoCentralEvent,
  buildTransferenciaParaEscolaEvent,
} from "./estoqueIntegracaoService";

describe("estoqueIntegracaoService", () => {
  it("maps recebimento to a central positive delta", () => {
    const event = buildRecebimentoCentralEvent({
      produto_id: 8,
      quantidade: 14,
      pedido_item_id: 21,
    });

    assert.equal(event.tipo_evento, "recebimento_central");
    assert.equal(event.quantidade_delta, 14);
  });

  it("maps entrega to a school transfer event", () => {
    const event = buildTransferenciaParaEscolaEvent({
      escola_id: 5,
      produto_id: 8,
      quantidade: 3,
      guia_item_id: 44,
    });

    assert.equal(event.tipo_evento, "transferencia_para_escola");
    assert.equal(event.escola_id, 5);
    assert.equal(event.quantidade_delta, 3);
  });
});

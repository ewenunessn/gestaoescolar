import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  REALTIME_CONTRACTS,
  getRealtimeContract,
} from "./realtimeContract";

describe("realtimeContract", () => {
  it("maps every realtime domain to an owning module and emitted events", () => {
    assert.deepEqual(getRealtimeContract("entregas"), {
      module: "entregas",
      emits: ["entregas.updated", "estoque_escolar.updated"],
      transport: "sse",
    });
    assert.deepEqual(getRealtimeContract("chatbot"), {
      module: "chatbot",
      emits: ["chatbot.message.received", "chatbot.message.reply"],
      transport: "http-bff",
    });
    assert.deepEqual(getRealtimeContract("notificacoes"), {
      module: "notificacoes",
      emits: ["notificacoes.created", "notificacoes.read"],
      transport: "sse",
    });
  });

  it("keeps infrastructure domains out of hidden ownership", () => {
    const modules = REALTIME_CONTRACTS.map((contract) => contract.module);
    assert.ok(modules.includes("entregas"));
    assert.ok(modules.includes("chatbot"));
    assert.ok(modules.includes("notificacoes"));
    assert.equal(getRealtimeContract("socket.io"), undefined);
  });
});

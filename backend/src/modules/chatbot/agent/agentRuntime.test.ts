import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runAgentRuntime } from "./runtime";
import { createReadOnlyPolicy } from "./policy";
import { createToolRegistry } from "./toolRegistry";
import type { ChatbotProvider } from "../providers/types";

const config = {
  enabled: true,
  provider: "ollama" as const,
  model: "qwen2.5:3b",
  baseUrl: "http://localhost:11434",
  timeoutMs: 60000,
  temperature: 0.2,
};

function createProvider(content: string | Error | Array<string | Error>): ChatbotProvider & { calls: any[] } {
  const calls: any[] = [];
  const contents = Array.isArray(content) ? [...content] : [content];
  return {
    calls,
    complete: async (input) => {
      calls.push(input);
      const next = contents.shift() ?? contents[contents.length - 1] ?? "";
      if (next instanceof Error) throw next;
      return { content: next };
    },
  };
}

describe("agentRuntime", () => {
  it("emits action and observation events while completing a tool loop", async () => {
    const provider = createProvider([
      JSON.stringify({
        action: "tool",
        tool: "database.contar_escolas",
        input: { ativas: true },
      }),
      JSON.stringify({
        action: "final",
        needsDatabase: true,
        answer: "Existem 3 escolas ativas.",
      }),
    ]);
    const registry = createToolRegistry()
      .register({
        name: "database.contar_escolas",
        description: "Conta escolas cadastradas.",
        readOnly: true,
        execute: async (input) => ({ input, total: 3 }),
      });

    const result = await runAgentRuntime({
      provider,
      config,
      initialMessages: [{ role: "user", content: "quantas escolas ativas existem?" }],
      tools: registry,
      policy: createReadOnlyPolicy(),
      maxSteps: 4,
    });

    assert.equal(result.handled, true);
    assert.equal(result.answer, "Existem 3 escolas ativas.");
    assert.deepEqual(result.toolsUsed, ["database.contar_escolas"]);
    assert.deepEqual(result.events.map((event) => event.type), ["action", "observation", "message"]);
    assert.equal(result.events[0].type, "action");
    assert.equal(result.events[1].type, "observation");
    assert.match(provider.calls[1].messages.at(-1).content, /Resultado da ferramenta database\.contar_escolas/);
  });

  it("blocks tools rejected by policy before running their executor", async () => {
    const provider = createProvider(JSON.stringify({
      action: "tool",
      tool: "database.apagar_escolas",
      input: {},
    }));
    let executions = 0;
    const registry = createToolRegistry()
      .register({
        name: "database.apagar_escolas",
        description: "Apaga escolas.",
        readOnly: false,
        execute: async () => {
          executions += 1;
          return {};
        },
      });

    const result = await runAgentRuntime({
      provider,
      config,
      initialMessages: [{ role: "user", content: "apague as escolas" }],
      tools: registry,
      policy: createReadOnlyPolicy(),
      maxSteps: 4,
    });

    assert.equal(executions, 0);
    assert.equal(result.handled, true);
    assert.match(result.answer, /somente leitura/i);
    assert.deepEqual(result.toolsUsed, ["database.apagar_escolas"]);
    assert.equal(result.events[0].type, "action");
    assert.equal(result.events[1].type, "policy_block");
  });

  it("returns unhandled when the model final answer says no database data is needed", async () => {
    const provider = createProvider(JSON.stringify({
      action: "final",
      needsDatabase: false,
      answer: "",
    }));

    const result = await runAgentRuntime({
      provider,
      config,
      initialMessages: [{ role: "user", content: "oi" }],
      tools: createToolRegistry(),
      policy: createReadOnlyPolicy(),
      maxSteps: 4,
    });

    assert.equal(result.handled, false);
    assert.equal(result.answer, "");
    assert.deepEqual(result.toolsUsed, []);
    assert.deepEqual(result.events.map((event) => event.type), ["message"]);
  });
});

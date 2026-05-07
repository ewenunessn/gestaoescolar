import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OllamaProvider } from "./ollamaProvider";

const config = {
  enabled: true,
  provider: "ollama" as const,
  model: "qwen2.5:3b",
  baseUrl: "http://localhost:11434",
  timeoutMs: 60000,
  temperature: 0.2,
};

describe("OllamaProvider", () => {
  it("sends bounded generation options to keep chatbot responses responsive", async () => {
    const originalFetch = globalThis.fetch;
    const calls: any[] = [];

    globalThis.fetch = (async (_url: any, init: any) => {
      calls.push(JSON.parse(String(init.body)));
      return {
        ok: true,
        json: async () => ({ message: { content: "ok" } }),
      } as Response;
    }) as typeof fetch;

    try {
      const provider = new OllamaProvider();
      const result = await provider.complete({
        config,
        messages: [{ role: "user", content: "responda ok" }],
      });

      assert.equal(result.content, "ok");
      assert.equal(calls.length, 1);
      assert.equal(calls[0].keep_alive, "30s");
      assert.equal(calls[0].options.num_predict, 384);
      assert.equal(calls[0].options.num_ctx, 2048);
      assert.equal(calls[0].options.temperature, 0.2);
      assert.equal(calls[0].format, undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("retries once when Ollama has a transient fetch failure", async () => {
    const originalFetch = globalThis.fetch;
    let attempts = 0;

    globalThis.fetch = (async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("fetch failed");
      }
      return {
        ok: true,
        json: async () => ({ message: { content: "ok depois do retry" } }),
      } as Response;
    }) as typeof fetch;

    try {
      const provider = new OllamaProvider();
      const result = await provider.complete({
        config,
        messages: [{ role: "user", content: "responda ok" }],
      });

      assert.equal(attempts, 2);
      assert.equal(result.content, "ok depois do retry");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not retry aborted Ollama generations", async () => {
    const originalFetch = globalThis.fetch;
    let attempts = 0;

    globalThis.fetch = (async () => {
      attempts += 1;
      const error = new Error("This operation was aborted");
      error.name = "AbortError";
      throw error;
    }) as typeof fetch;

    try {
      const provider = new OllamaProvider();
      await assert.rejects(
        () => provider.complete({
          config,
          messages: [{ role: "user", content: "responda ok" }],
        }),
        /aborted/i,
      );

      assert.equal(attempts, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("uses a local Ollama timeout floor for each attempt", async () => {
    const originalFetch = globalThis.fetch;
    const originalSetTimeout = globalThis.setTimeout;
    const delays: number[] = [];

    globalThis.setTimeout = (((_handler: TimerHandler, timeout?: number, ..._args: any[]) => {
      delays.push(Number(timeout));
      return originalSetTimeout(() => undefined, 1000);
    }) as unknown) as typeof setTimeout;

    globalThis.fetch = (async (_url: any, init: any) => {
      await new Promise((resolve) => originalSetTimeout(resolve, 5));
      init.signal.throwIfAborted();
      return {
        ok: true,
        json: async () => ({ message: { content: "ok" } }),
      } as Response;
    }) as typeof fetch;

    try {
      const provider = new OllamaProvider();
      await provider.complete({
        config: { ...config, timeoutMs: 60000 },
        messages: [{ role: "user", content: "responda ok" }],
      });

      assert.deepEqual(delays, [120000]);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.setTimeout = originalSetTimeout;
    }
  });

  it("uses JSON mode and smaller generation options for classification prompts", async () => {
    const originalFetch = globalThis.fetch;
    let body: any;

    globalThis.fetch = (async (_url: any, init: any) => {
      body = JSON.parse(String(init.body));
      return {
        ok: true,
        json: async () => ({ message: { content: '{"intent":null}' } }),
      } as Response;
    }) as typeof fetch;

    try {
      const provider = new OllamaProvider();
      await provider.complete({
        config,
        messages: [{ role: "system", content: "Responda somente JSON valido." }],
      });

      assert.equal(body.format, "json");
      assert.equal(body.options.num_predict, 192);
      assert.equal(body.options.num_ctx, 1024);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

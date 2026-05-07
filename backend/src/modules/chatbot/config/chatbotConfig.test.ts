import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadChatbotConfig } from "./chatbotConfig";

describe("chatbotConfig", () => {
  it("loads disabled defaults for local Ollama", () => {
    const config = loadChatbotConfig({});

    assert.equal(config.enabled, false);
    assert.equal(config.provider, "ollama");
    assert.equal(config.model, "llama3.1");
    assert.equal(config.baseUrl, "http://localhost:11434");
    assert.equal(config.timeoutMs, 60000);
    assert.equal(config.temperature, 0.2);
  });

  it("normalizes enabled flags and trims provider values", () => {
    const config = loadChatbotConfig({
      CHATBOT_ENABLED: "true",
      CHATBOT_PROVIDER: " openai_compatible ",
      CHATBOT_MODEL: "gpt-compatible",
      CHATBOT_BASE_URL: "https://llm.example.com/",
      CHATBOT_API_KEY: "secret",
      CHATBOT_TIMEOUT_MS: "120000",
      CHATBOT_TEMPERATURE: "0.7",
    });

    assert.equal(config.enabled, true);
    assert.equal(config.provider, "openai_compatible");
    assert.equal(config.model, "gpt-compatible");
    assert.equal(config.baseUrl, "https://llm.example.com");
    assert.equal(config.apiKey, "secret");
    assert.equal(config.timeoutMs, 120000);
    assert.equal(config.temperature, 0.7);
  });

  it("rejects unsupported providers", () => {
    assert.throws(
      () => loadChatbotConfig({ CHATBOT_PROVIDER: "unknown" }),
      /CHATBOT_PROVIDER deve ser ollama ou openai_compatible/,
    );
  });

  it("rejects invalid timeout and temperature values", () => {
    assert.throws(
      () => loadChatbotConfig({ CHATBOT_TIMEOUT_MS: "0" }),
      /CHATBOT_TIMEOUT_MS deve ser maior que zero/,
    );

    assert.throws(
      () => loadChatbotConfig({ CHATBOT_TEMPERATURE: "2.5" }),
      /CHATBOT_TEMPERATURE deve estar entre 0 e 2/,
    );
  });
});

import type { ChatbotProvider } from "./types";

const LOCAL_OLLAMA_TIMEOUT_FLOOR_MS = 120000;

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name !== "AbortError" && /fetch failed|ECONNRESET|ECONNREFUSED|terminated|timeout/i.test(error.message);
  }
  return false;
}

export class OllamaProvider implements ChatbotProvider {
  async complete({ config, messages }: Parameters<ChatbotProvider["complete"]>[0]) {
    let lastError: unknown;
    const attemptTimeoutMs = Math.max(config.timeoutMs, LOCAL_OLLAMA_TIMEOUT_FLOOR_MS);
    const wantsJson = messages.some((message) => /json valido|responda json|somente json/i.test(message.content));

    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);

      try {
        const response = await fetch(`${config.baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: config.model,
            messages,
            stream: false,
            ...(wantsJson ? { format: "json" } : {}),
            keep_alive: "30s",
            options: {
              temperature: config.temperature,
              num_predict: wantsJson ? 192 : 384,
              num_ctx: wantsJson ? 1024 : 2048,
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Ollama retornou HTTP ${response.status}`);
        }

        const data: any = await response.json();
        return { content: String(data?.message?.content || ""), raw: data };
      } catch (error) {
        lastError = error;
        if (attempt === 2 || !isRetryableError(error)) {
          throw error;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError;
  }
}

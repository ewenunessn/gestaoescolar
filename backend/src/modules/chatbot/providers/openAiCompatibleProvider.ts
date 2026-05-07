import type { ChatbotProvider } from "./types";

export class OpenAiCompatibleProvider implements ChatbotProvider {
  async complete({ config, messages }: Parameters<ChatbotProvider["complete"]>[0]) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`LLM externo retornou HTTP ${response.status}`);
      }

      const data: any = await response.json();
      return { content: String(data?.choices?.[0]?.message?.content || ""), raw: data };
    } finally {
      clearTimeout(timeout);
    }
  }
}

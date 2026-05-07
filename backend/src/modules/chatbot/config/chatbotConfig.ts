export type ChatbotProviderName = "ollama" | "openai_compatible";

export interface ChatbotConfig {
  enabled: boolean;
  provider: ChatbotProviderName;
  model: string;
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
  temperature: number;
}

type Env = Record<string, string | undefined>;

function parseEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function parseProvider(value: string | undefined): ChatbotProviderName {
  const provider = (value?.trim() || "ollama") as ChatbotProviderName;
  if (provider !== "ollama" && provider !== "openai_compatible") {
    throw new Error("CHATBOT_PROVIDER deve ser ollama ou openai_compatible");
  }
  return provider;
}

function parsePositiveInteger(value: string | undefined, fallback: number, name: string): number {
  const parsed = value === undefined || value.trim() === "" ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} deve ser maior que zero`);
  }
  return parsed;
}

function parseTemperature(value: string | undefined): number {
  const parsed = value === undefined || value.trim() === "" ? 0.2 : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 2) {
    throw new Error("CHATBOT_TEMPERATURE deve estar entre 0 e 2");
  }
  return parsed;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function loadChatbotConfig(env: Env = process.env): ChatbotConfig {
  return {
    enabled: parseEnabled(env.CHATBOT_ENABLED),
    provider: parseProvider(env.CHATBOT_PROVIDER),
    model: env.CHATBOT_MODEL?.trim() || "llama3.1",
    baseUrl: trimTrailingSlash(env.CHATBOT_BASE_URL?.trim() || "http://localhost:11434"),
    apiKey: env.CHATBOT_API_KEY?.trim() || undefined,
    timeoutMs: parsePositiveInteger(env.CHATBOT_TIMEOUT_MS, 60000, "CHATBOT_TIMEOUT_MS"),
    temperature: parseTemperature(env.CHATBOT_TEMPERATURE),
  };
}

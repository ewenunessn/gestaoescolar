import type { ChatbotConfig } from "../config/chatbotConfig";
import type { ChatbotProvider } from "./types";
import { OllamaProvider } from "./ollamaProvider";
import { OpenAiCompatibleProvider } from "./openAiCompatibleProvider";

export function createChatbotProvider(config: ChatbotConfig): ChatbotProvider {
  if (config.provider === "openai_compatible") {
    return new OpenAiCompatibleProvider();
  }

  return new OllamaProvider();
}

import type { ChatbotConfig } from "../config/chatbotConfig";

export interface ChatbotMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatbotCompletionInput {
  config: ChatbotConfig;
  messages: ChatbotMessage[];
}

export interface ChatbotCompletionResult {
  content: string;
  raw?: unknown;
}

export interface ChatbotProvider {
  complete(input: ChatbotCompletionInput): Promise<ChatbotCompletionResult>;
}

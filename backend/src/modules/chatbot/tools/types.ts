export interface ChatbotToolContext {
  userId?: number;
  userName?: string;
  escolaId?: number;
}

export interface ChatbotToolResult {
  toolName: string;
  status: string;
  data: unknown;
}

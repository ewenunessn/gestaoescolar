import api from './api';

const CHATBOT_REQUEST_TIMEOUT_MS = 0;

export type ChatbotRole = 'user' | 'assistant';

export interface ChatbotHistoryMessage {
  role: ChatbotRole;
  content: string;
}

export interface EnviarMensagemChatbotInput {
  message: string;
  history: ChatbotHistoryMessage[];
}

export interface EnviarMensagemChatbotResult {
  answer: string;
  toolsUsed: string[];
  toolData?: unknown;
}

export async function enviarMensagemChatbot(
  input: EnviarMensagemChatbotInput,
): Promise<EnviarMensagemChatbotResult> {
  const response = await api.post('/chatbot/message', input, {
    timeout: CHATBOT_REQUEST_TIMEOUT_MS,
  });
  return response.data.data;
}

import { describe, expect, it, vi } from 'vitest';

import api from './api';
import { enviarMensagemChatbot } from './chatbotService';

vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('chatbotService', () => {
  it('does not timeout LLM-backed chatbot responses', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          answer: 'A EMEF Bertila tem estoque de arroz.',
          toolsUsed: ['estoque.contextoOperacional'],
        },
      },
    });

    const result = await enviarMensagemChatbot({
      message: 'qual o estoque de arroz do bertila?',
      history: [],
    });

    expect(api.post).toHaveBeenCalledWith(
      '/chatbot/message',
      {
        message: 'qual o estoque de arroz do bertila?',
        history: [],
      },
      { timeout: 0 },
    );
    expect(result.answer).toContain('Bertila');
  });
});

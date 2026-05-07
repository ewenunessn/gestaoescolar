import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { enviarMensagemChatbot } from '../../services/chatbotService';
import { FloatingChatbot } from './FloatingChatbot';

vi.mock('../../services/chatbotService', () => ({
  enviarMensagemChatbot: vi.fn(),
}));

describe('FloatingChatbot', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('opens the panel and sends a message', async () => {
    let resolveRequest: (value: Awaited<ReturnType<typeof enviarMensagemChatbot>>) => void = () => {};
    vi.mocked(enviarMensagemChatbot).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    render(<FloatingChatbot />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir assistente' }));
    fireEvent.change(screen.getByPlaceholderText('Pergunte sobre o sistema'), {
      target: { value: 'quais escolas atualizaram o arroz branco?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    expect(await screen.findByText('Interpretando com a LLM')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tempo aguardando resposta: 0 segundos/ })).toBeInTheDocument();

    await waitFor(() => {
      expect(enviarMensagemChatbot).toHaveBeenCalledWith({
        message: 'quais escolas atualizaram o arroz branco?',
        history: [],
      });
    });

    resolveRequest({
      answer: 'A escola EMEF Centro atualizou. A EMEF Norte esta pendente.',
      toolsUsed: ['estoque.atualizacoesProdutoPorPeriodo'],
    });

    expect(await screen.findByText(/EMEF Centro/)).toBeInTheDocument();
  });

  it('keeps the latest message visible after sending and reopening the panel', async () => {
    vi.mocked(enviarMensagemChatbot).mockResolvedValueOnce({
      answer: 'Ultima resposta visivel',
      toolsUsed: [],
    });

    render(<FloatingChatbot />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir assistente' }));
    const messagesContainer = screen.getByLabelText('Mensagens do assistente');
    Object.defineProperty(messagesContainer, 'scrollHeight', {
      configurable: true,
      value: 1200,
    });
    scrollIntoViewMock.mockClear();

    fireEvent.change(screen.getByPlaceholderText('Pergunte sobre o sistema'), {
      target: { value: 'mostrar ultima mensagem' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    expect(await screen.findByText('Ultima resposta visivel')).toBeInTheDocument();
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
      expect(messagesContainer.scrollTop).toBe(1200);
    });

    scrollIntoViewMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar assistente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir assistente' }));

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  it('shows a recoverable error when sending fails', async () => {
    vi.mocked(enviarMensagemChatbot).mockRejectedValueOnce(new Error('Chatbot desativado'));

    render(<FloatingChatbot />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir assistente' }));
    fireEvent.change(screen.getByPlaceholderText('Pergunte sobre o sistema'), {
      target: { value: 'teste' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));

    expect(await screen.findByText('Chatbot desativado')).toBeInTheDocument();
  });

  it('closes the panel', async () => {
    render(<FloatingChatbot />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir assistente' }));
    expect(screen.getByText('Assistente')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fechar assistente' }));
    await waitFor(() => {
      expect(screen.queryByText('Assistente')).not.toBeInTheDocument();
    });
  });
});

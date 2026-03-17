/**
 * Testes para SafeButton
 * Verifica se o componente previne duplo clique corretamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SafeButton } from '../components/SafeButton';

describe('SafeButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar corretamente', () => {
    render(<SafeButton onClick={() => {}}>Clique Aqui</SafeButton>);
    expect(screen.getByText('Clique Aqui')).toBeInTheDocument();
  });

  it('deve executar onClick uma vez em clique único', async () => {
    const handleClick = vi.fn();
    render(<SafeButton onClick={handleClick}>Clique</SafeButton>);
    
    const button = screen.getByText('Clique');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  it('deve prevenir duplo clique rápido', async () => {
    const handleClick = vi.fn();
    render(<SafeButton onClick={handleClick} debounceMs={500}>Clique</SafeButton>);
    
    const button = screen.getByText('Clique');
    
    // Clica 2 vezes rapidamente
    fireEvent.click(button);
    fireEvent.click(button);
    
    await waitFor(() => {
      // Deve executar apenas 1 vez
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  it('deve desabilitar botão durante execução assíncrona', async () => {
    const asyncClick = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<SafeButton onClick={asyncClick}>Clique</SafeButton>);
    
    const button = screen.getByText('Clique') as HTMLButtonElement;
    
    fireEvent.click(button);
    
    // Botão deve estar desabilitado durante execução
    await waitFor(() => {
      expect(button.disabled).toBe(true);
    });
    
    // Após conclusão, deve estar habilitado novamente
    await waitFor(() => {
      expect(button.disabled).toBe(false);
    }, { timeout: 200 });
  });

  it('deve mostrar texto de loading quando fornecido', async () => {
    const asyncClick = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(
      <SafeButton onClick={asyncClick} loadingText="Carregando...">
        Clique
      </SafeButton>
    );
    
    const button = screen.getByText('Clique');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });
  });

  it('deve permitir clique após debounce expirar', async () => {
    const handleClick = vi.fn();
    render(<SafeButton onClick={handleClick} debounceMs={100}>Clique</SafeButton>);
    
    const button = screen.getByText('Clique');
    
    // Primeiro clique
    fireEvent.click(button);
    
    // Aguarda debounce expirar
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Segundo clique (deve ser permitido)
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  it('deve prevenir múltiplos cliques durante execução', async () => {
    const asyncClick = vi.fn(() => new Promise(resolve => setTimeout(resolve, 200)));
    render(<SafeButton onClick={asyncClick}>Clique</SafeButton>);
    
    const button = screen.getByText('Clique');
    
    // Clica 3 vezes rapidamente
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    
    await waitFor(() => {
      // Deve executar apenas 1 vez
      expect(asyncClick).toHaveBeenCalledTimes(1);
    });
  });

  it('deve respeitar prop disabled externa', () => {
    const handleClick = vi.fn();
    render(<SafeButton onClick={handleClick} disabled>Clique</SafeButton>);
    
    const button = screen.getByText('Clique') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

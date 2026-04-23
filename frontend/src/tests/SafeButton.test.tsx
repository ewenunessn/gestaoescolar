/**
 * Testes para SafeButton
 * Verifica se o componente previne duplo clique corretamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SafeButton } from '../components/SafeButton';

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });

  return { promise, resolve };
};

describe('SafeButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('deve renderizar corretamente', () => {
    render(<SafeButton onClick={() => {}} disableRipple>Clique Aqui</SafeButton>);
    expect(screen.getByText('Clique Aqui')).toBeInTheDocument();
  });

  it('deve executar onClick uma vez em clique unico', async () => {
    const handleClick = vi.fn();
    render(<SafeButton onClick={handleClick} disableRipple>Clique</SafeButton>);

    const button = screen.getByText('Clique');

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  it('deve prevenir duplo clique rapido', async () => {
    const handleClick = vi.fn();
    render(<SafeButton onClick={handleClick} debounceMs={500} disableRipple>Clique</SafeButton>);

    const button = screen.getByText('Clique');

    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('deve desabilitar botao durante execucao assincrona', async () => {
    const deferred = createDeferred();
    const asyncClick = vi.fn(() => deferred.promise);
    render(<SafeButton onClick={asyncClick} disableRipple>Clique</SafeButton>);

    const button = screen.getByText('Clique') as HTMLButtonElement;

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button.disabled).toBe(true);

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    await waitFor(() => {
      expect(button.disabled).toBe(false);
    });
  });

  it('deve mostrar texto de loading quando fornecido', async () => {
    const deferred = createDeferred();
    const asyncClick = vi.fn(() => deferred.promise);
    render(
      <SafeButton onClick={asyncClick} loadingText="Carregando..." disableRipple>
        Clique
      </SafeButton>
    );

    const button = screen.getByText('Clique');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText('Carregando...')).toBeInTheDocument();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });
  });

  it('deve permitir clique apos debounce expirar', async () => {
    const handleClick = vi.fn();
    render(<SafeButton onClick={handleClick} debounceMs={100} disableRipple>Clique</SafeButton>);

    const button = screen.getByText('Clique');

    await act(async () => {
      fireEvent.click(button);
    });

    await new Promise((resolve) => setTimeout(resolve, 150));

    await act(async () => {
      fireEvent.click(button);
    });

    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('deve prevenir multiplos cliques durante execucao', async () => {
    const deferred = createDeferred();
    const asyncClick = vi.fn(() => deferred.promise);
    render(<SafeButton onClick={asyncClick} disableRipple>Clique</SafeButton>);

    const button = screen.getByText('Clique');

    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(asyncClick).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });
  });

  it('nao deve atualizar estado apos desmontar durante execucao assincrona', async () => {
    const deferred = createDeferred();
    const asyncClick = vi.fn(() => deferred.promise);
    const { unmount } = render(
      <SafeButton onClick={asyncClick} loadingText="Carregando..." disableRipple>
        Clique
      </SafeButton>
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Clique'));
    });

    unmount();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    expect(asyncClick).toHaveBeenCalledTimes(1);
  });

  it('deve respeitar prop disabled externa', () => {
    const handleClick = vi.fn();
    render(<SafeButton onClick={handleClick} disabled disableRipple>Clique</SafeButton>);

    const button = screen.getByText('Clique') as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomThemeProvider, useThemePreference } from './ThemeContext';

const ThemeProbe = () => {
  const { mode, toggleTheme } = useThemePreference();

  return (
    <button type="button" onClick={toggleTheme}>
      {mode}
    </button>
  );
};

describe('CustomThemeProvider', () => {
  const originalDesktopShell = window.desktopShell;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'desktopShell', {
      configurable: true,
      value: originalDesktopShell,
    });
  });

  it('sincroniza a cor da titlebar do desktop com o tema atual', async () => {
    const setTitleBarTheme = vi.fn();
    Object.defineProperty(window, 'desktopShell', {
      configurable: true,
      value: {
        isDesktop: true,
        platform: 'win32',
        apiBaseURL: 'http://127.0.0.1:3131/api',
        healthURL: 'http://127.0.0.1:3131/health',
        openExternal: vi.fn(),
        setTitleBarTheme,
      },
    });

    render(
      <CustomThemeProvider>
        <ThemeProbe />
      </CustomThemeProvider>,
    );

    await waitFor(() => expect(setTitleBarTheme).toHaveBeenLastCalledWith('dark'));

    fireEvent.click(screen.getByRole('button', { name: 'dark' }));

    await waitFor(() => expect(setTitleBarTheme).toHaveBeenLastCalledWith('light'));
  });
});

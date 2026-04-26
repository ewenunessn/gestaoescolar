import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DesktopTitlebarMenu } from './DesktopTitlebarMenu';

describe('DesktopTitlebarMenu', () => {
  it('renders the primary title bar actions and dispatches them', async () => {
    const onBack = vi.fn();
    const onReload = vi.fn();
    const onOpenLogs = vi.fn();
    const onShowAbout = vi.fn();
    const onToggleDevTools = vi.fn();

    render(
      <DesktopTitlebarMenu
        height={32}
        backgroundColor="#090a0c"
        borderColor="rgba(255,255,255,0.12)"
        iconColor="#f3f4f6"
        showDevTools
        onBack={onBack}
        onReload={onReload}
        onOpenLogs={onOpenLogs}
        onShowAbout={onShowAbout}
        onToggleDevTools={onToggleDevTools}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar aplicativo' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onReload).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu do aplicativo' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Abrir pasta de logs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu do aplicativo' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sobre o NutriLog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu do aplicativo' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Abrir DevTools' }));

    expect(onOpenLogs).toHaveBeenCalledTimes(1);
    expect(onShowAbout).toHaveBeenCalledTimes(1);
    expect(onToggleDevTools).toHaveBeenCalledTimes(1);
  });

  it('omits the devtools entry outside development mode', () => {
    render(
      <DesktopTitlebarMenu
        height={32}
        backgroundColor="#090a0c"
        borderColor="rgba(255,255,255,0.12)"
        iconColor="#f3f4f6"
        onBack={vi.fn()}
        onReload={vi.fn()}
        onOpenLogs={vi.fn()}
        onShowAbout={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu do aplicativo' }));

    expect(screen.queryByRole('menuitem', { name: 'Abrir DevTools' })).not.toBeInTheDocument();
  });
});

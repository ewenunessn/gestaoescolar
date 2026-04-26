import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logout } from './auth';

describe('logout', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'token-valido');
    localStorage.setItem('user', '{"id":1}');
    localStorage.setItem('perfil', 'admin');
    localStorage.setItem('nome', 'Ewerton');
    window.location.hash = '#/dashboard';
  });

  afterEach(() => {
    localStorage.clear();
    window.location.hash = '';
    vi.restoreAllMocks();
    Object.defineProperty(window, 'desktopShell', {
      value: undefined,
      configurable: true,
    });
  });

  it('clears the session, notifies auth listeners, and uses hash navigation in desktop', () => {
    const authChanged = vi.fn();
    window.addEventListener('auth-changed', authChanged);

    Object.defineProperty(window, 'desktopShell', {
      value: {
        isDesktop: true,
      },
      configurable: true,
    });

    logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('perfil')).toBeNull();
    expect(localStorage.getItem('nome')).toBeNull();
    expect(authChanged).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/login');

    window.removeEventListener('auth-changed', authChanged);
  });
});

import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigProvider, useConfigContext } from './ConfigContext';
import configService from '../services/configService';

vi.mock('../services/configService', () => ({
  default: {
    buscarConfiguracaoModuloSaldo: vi.fn(),
    salvarConfiguracaoModuloSaldo: vi.fn(),
  },
}));

const mockedConfigService = vi.mocked(configService);

const ConfigProbe = () => {
  const { configModuloSaldo, loading } = useConfigContext();

  return (
    <div>
      {loading ? 'loading' : 'ready'}:{configModuloSaldo.modulo_principal}:{String(configModuloSaldo.mostrar_ambos)}
    </div>
  );
};

describe('ConfigProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedConfigService.buscarConfiguracaoModuloSaldo.mockResolvedValue({
      modulo_principal: 'contratos',
      mostrar_ambos: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('nao chama configuracao protegida antes de existir token', async () => {
    render(
      <ConfigProvider>
        <ConfigProbe />
      </ConfigProvider>,
    );

    await screen.findByText('ready:modalidades:false');

    expect(mockedConfigService.buscarConfiguracaoModuloSaldo).not.toHaveBeenCalled();
  });

  it('carrega a configuracao quando a sessao e criada', async () => {
    render(
      <ConfigProvider>
        <ConfigProbe />
      </ConfigProvider>,
    );

    await screen.findByText('ready:modalidades:false');

    localStorage.setItem('token', 'token-valido');
    act(() => {
      window.dispatchEvent(new Event('auth-changed'));
    });

    await waitFor(() => {
      expect(mockedConfigService.buscarConfiguracaoModuloSaldo).toHaveBeenCalledTimes(1);
      expect(screen.getByText('ready:contratos:true')).toBeInTheDocument();
    });
  });
});

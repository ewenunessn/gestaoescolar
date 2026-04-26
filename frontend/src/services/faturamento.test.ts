import { beforeEach, describe, expect, it, vi } from 'vitest';

import faturamentoService from './faturamento';
import api from './api';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('faturamento service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists billing records from the canonical faturamentos API', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            faturamento_id: 7,
            pedido_id: 12,
            pedido_numero: 'PED-12',
            data_faturamento: '2026-04-24T10:00:00Z',
            valor_total: 15,
            status: 'gerado',
          },
        ],
      },
    });

    const result = await faturamentoService.buscarPorPedido(12);

    expect(api.get).toHaveBeenCalledWith('/faturamentos/pedido/12');
    expect(result).toEqual([
      expect.objectContaining({
        id: 7,
        pedido_id: 12,
        pedido_numero: 'PED-12',
        status: 'gerado',
      }),
    ]);
  });

  it('loads billing summary from the canonical faturamentos API', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: { faturamento: { id: 7 }, contratos: [] },
      },
    });

    const result = await faturamentoService.buscarResumo(7);

    expect(api.get).toHaveBeenCalledWith('/faturamentos/7/resumo');
    expect(result).toEqual({ faturamento: { id: 7 }, contratos: [] });
  });
});

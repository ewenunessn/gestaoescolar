import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from './api';
import { gerarGuiasDemanda, iniciarGeracaoGuiasAsync } from './planejamentoCompras';

vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('planejamentoCompras service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends selected cardapios when starting async guide generation', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { job_id: 10, status: 'pendente', message: 'ok' },
    });

    await iniciarGeracaoGuiasAsync(
      '2026-04',
      [{ data_inicio: '2026-04-01', data_fim: '2026-04-30' }],
      undefined,
      undefined,
      false,
      true,
      [14, 15]
    );

    expect(api.post).toHaveBeenCalledWith('/planejamento-compras/gerar-guias-async', {
      competencia: '2026-04',
      periodos: [{ data_inicio: '2026-04-01', data_fim: '2026-04-30' }],
      escola_ids: undefined,
      observacoes: undefined,
      considerar_indice_coccao: false,
      considerar_fator_correcao: true,
      cardapio_ids: [14, 15],
    });
  });

  it('sends selected cardapios in the sync guide generation fallback', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { guias_criadas: [], erros: [], total_criadas: 0, total_erros: 0 },
    });

    await gerarGuiasDemanda(
      '2026-04',
      [{ data_inicio: '2026-04-01', data_fim: '2026-04-30' }],
      undefined,
      undefined,
      false,
      true,
      [14, 15]
    );

    expect(api.post).toHaveBeenCalledWith(
      '/planejamento-compras/gerar-guias',
      {
        competencia: '2026-04',
        periodos: [{ data_inicio: '2026-04-01', data_fim: '2026-04-30' }],
        escola_ids: undefined,
        observacoes: undefined,
        considerar_indice_coccao: false,
        considerar_fator_correcao: true,
        cardapio_ids: [14, 15],
      },
      { timeout: 120000 }
    );
  });
});

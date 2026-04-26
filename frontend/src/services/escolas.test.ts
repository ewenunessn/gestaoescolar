import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiWithRetry } from './api';
import {
  gerarRelatorioAlunosModalidades,
  listarHistoricoAlunosModalidades,
  removerEscolaModalidade,
} from './escolas';

vi.mock('./api', () => ({
  apiWithRetry: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('escolas service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests student history with query filters', async () => {
    vi.mocked(apiWithRetry.get).mockResolvedValueOnce({ data: { data: [{ id: 1 }] } });

    const result = await listarHistoricoAlunosModalidades({
      escola_id: 10,
      modalidade_id: 20,
      data_inicio: '2026-01-01',
      data_fim: '2026-04-01',
    });

    expect(apiWithRetry.get).toHaveBeenCalledWith(
      '/escola-modalidades/historico?escola_id=10&modalidade_id=20&data_inicio=2026-01-01&data_fim=2026-04-01'
    );
    expect(result).toEqual([{ id: 1 }]);
  });

  it('requests the student report with a reference date', async () => {
    vi.mocked(apiWithRetry.get).mockResolvedValueOnce({ data: { data: { total_geral: 150 } } });

    const result = await gerarRelatorioAlunosModalidades({
      data_referencia: '2026-02-01',
      escola_id: 10,
      escola_ativo: 'true',
    });

    expect(apiWithRetry.get).toHaveBeenCalledWith(
      '/escola-modalidades/relatorio-alunos?data_referencia=2026-02-01&escola_id=10&escola_ativo=true'
    );
    expect(result).toEqual({ total_geral: 150 });
  });

  it('sends effective date metadata when removing an association', async () => {
    vi.mocked(apiWithRetry.delete).mockResolvedValueOnce({ data: { success: true } });

    await removerEscolaModalidade(99, {
      vigente_de: '2026-02-01',
      observacao: 'Encerramento da turma',
    });

    expect(apiWithRetry.delete).toHaveBeenCalledWith('/escola-modalidades/99', {
      data: {
        vigente_de: '2026-02-01',
        observacao: 'Encerramento da turma',
      },
    });
  });
});

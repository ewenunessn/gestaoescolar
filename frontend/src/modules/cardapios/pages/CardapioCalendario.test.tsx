import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CardapioCalendarioPage from './CardapioCalendario';
import { PageTitleProvider } from '../../../contexts/PageTitleContext';

vi.mock('../../../components/CalendarioProfissional', () => ({
  default: () => <div>Calendario profissional</div>,
}));

vi.mock('../../../components/ReplicarRefeicoesDialog', () => ({
  ReplicarRefeicoesDialog: () => null,
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useInstituicao', () => ({
  useInstituicaoForPDF: () => ({
    fetchInstituicaoForPDF: vi.fn(),
  }),
}));

vi.mock('../../../services/cardapiosModalidade', () => ({
  TIPOS_REFEICAO: {
    cafe: 'Cafe da manha',
    almoco: 'Almoco',
  },
  buscarCardapioModalidade: vi.fn().mockResolvedValue({
    id: 1,
    nome: 'Cardapio abril',
    mes: 4,
    ano: 2026,
    modalidade_nome: 'Integral',
  }),
  listarRefeicoesCardapio: vi.fn().mockResolvedValue([]),
  adicionarRefeicaoDia: vi.fn(),
  removerRefeicaoDia: vi.fn(),
  calcularCustoCardapio: vi.fn().mockResolvedValue(null),
  carregarTiposRefeicao: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../services/calendarioLetivo', () => ({
  listarEventosPorMes: vi.fn().mockResolvedValue([]),
  getLabelsEventos: vi.fn().mockReturnValue({}),
  getCoresEventos: vi.fn().mockReturnValue({}),
}));

vi.mock('../../../services/modalidades', () => ({
  modalidadeService: {
    listar: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../services/refeicoes', () => ({
  listarRefeicoes: vi.fn().mockResolvedValue([]),
  refeicaoService: {
    listar: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('CardapioCalendarioPage', () => {
  it('volta para a lista de cardapios ao clicar no botao voltar', async () => {
    render(
      <PageTitleProvider>
        <MemoryRouter initialEntries={['/cardapios/1/calendario']}>
          <Routes>
            <Route path="/cardapios/:cardapioId/calendario" element={<CardapioCalendarioPage />} />
            <Route path="/cardapios" element={<div>Lista de cardapios</div>} />
          </Routes>
        </MemoryRouter>
      </PageTitleProvider>,
    );

    await screen.findByRole('heading', { name: 'Cardapio abril' });
    fireEvent.click(await screen.findByRole('button', { name: /voltar para cardapios/i }));

    expect(await screen.findByText('Lista de cardapios')).toBeInTheDocument();
  });
});

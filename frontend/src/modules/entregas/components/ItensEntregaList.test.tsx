import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ItensEntregaList } from './ItensEntregaList';
import type { EscolaEntrega } from '../types';

vi.mock('../../../components/DataTableAdvanced', () => ({
  DataTableAdvanced: ({ title, toolbarActions }: { title: string; toolbarActions?: React.ReactNode }) => (
    <section aria-label={title}>
      {toolbarActions}
    </section>
  ),
}));

vi.mock('../../../components/ViewTabs', () => ({
  default: ({ tabs }: { tabs: Array<{ label: string; value: string }> }) => (
    <div>
      {tabs.map((tab) => (
        <button key={tab.value}>{tab.label}</button>
      ))}
    </div>
  ),
}));

vi.mock('../services/entregaService', () => ({
  entregaService: {
    listarItensPorEscola: vi.fn().mockResolvedValue([]),
    obterLocalizacaoGPS: vi.fn().mockRejectedValue(new Error('gps unavailable')),
  },
}));

const escola: EscolaEntrega = {
  id: 80,
  nome: 'CMEI Berco da Liberdade',
  endereco: 'Rua Teste',
  total_itens: 0,
  itens_pendentes: 0,
  itens_entregues: 0,
};

describe('ItensEntregaList', () => {
  it('shows a back button on the item selection step', async () => {
    render(
      <ItensEntregaList
        escola={escola}
        onVoltar={vi.fn()}
        filtros={{ somentePendentes: true }}
      />,
    );

    expect(await screen.findByRole('button', { name: /voltar para escolas/i })).toBeInTheDocument();
  });
});

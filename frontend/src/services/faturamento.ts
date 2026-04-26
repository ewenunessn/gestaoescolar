import api from './api';
import {
  Faturamento,
  FaturamentoDetalhado,
  FaturamentoPrevia,
  FaturamentoResumo,
  GerarFaturamentoRequest
} from '../types/faturamento';

export const faturamentoService = {
  // Calcular prévia do faturamento
  async calcularPrevia(pedidoId: number): Promise<FaturamentoPrevia> {
    const response = await api.get(`/faturamentos/pedido/${pedidoId}/resumo`);
    return response.data.data;
  },

  // Gerar faturamento definitivo
  async gerar(dados: GerarFaturamentoRequest): Promise<{ faturamento: Faturamento; previa: FaturamentoPrevia }> {
    const response = await api.post(`/faturamentos`, {
      pedido_id: dados.pedido_id,
      observacoes: dados.observacoes,
      itens: []
    });
    return response.data.data;
  },

  // Listar faturamentos
  async listar(filtros?: {
    pedido_id?: number;
    status?: string;
    data_inicio?: string;
    data_fim?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    
    if (filtros?.pedido_id) params.append('pedido_id', filtros.pedido_id.toString());
    if (filtros?.status) params.append('status', filtros.status);
    if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
    if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);
    if (filtros?.page) params.append('page', filtros.page.toString());
    if (filtros?.limit) params.append('limit', filtros.limit.toString());

    const queryString = params.toString();
    const url = `/faturamentos${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  },

  // Buscar faturamento por ID
  async buscarPorId(id: number): Promise<FaturamentoDetalhado> {
    const response = await api.get(`/faturamentos/${id}`);
    return response.data.data;
  },

  // Buscar resumo completo do faturamento (com todos os dados)
  async buscarResumo(id: number): Promise<any> {
    const response = await api.get(`/faturamentos/${id}/resumo`);
    return response.data.data;
  },

  // Buscar faturamentos por pedido
  async buscarPorPedido(pedidoId: number): Promise<Faturamento[]> {
    const response = await api.get(`/faturamentos/pedido/${pedidoId}`);
    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    const faturamentos = new Map<number, Faturamento>();

    rows.forEach((row: any) => {
      const id = Number(row.faturamento_id ?? row.id);
      if (!id) {
        return;
      }

      if (faturamentos.has(id)) {
        const faturamento = faturamentos.get(id)!;
        faturamento.valor_total += Number(row.valor_total ?? 0);
        return;
      }

      faturamentos.set(id, {
        id,
        pedido_id: Number(row.pedido_id),
        pedido_numero: row.pedido_numero,
        numero: row.numero || `FAT-${id}`,
        data_faturamento: row.data_faturamento,
        status: row.status || 'gerado',
        valor_total: Number(row.valor_total ?? row.valor_total_faturamento ?? 0),
        observacoes: row.faturamento_observacoes || row.observacoes,
        usuario_criacao_id: Number(row.usuario_id || 0),
        usuario_criacao_nome: row.usuario_nome,
        created_at: row.created_at || row.data_faturamento,
        updated_at: row.updated_at || row.data_faturamento,
      });
    });

    return Array.from(faturamentos.values());
  },

  // Atualizar status do faturamento
  async atualizarStatus(id: number, status: string): Promise<void> {
    await api.patch(`/faturamentos/${id}/status`, { status });
  },

  // Excluir faturamento
  async excluir(id: number): Promise<void> {
    await api.delete(`/faturamentos/${id}`);
  },

  // Registrar consumo do faturamento (todos os itens)
  async registrarConsumo(id: number): Promise<void> {
    await api.post(`/faturamentos/${id}/registrar-consumo`);
  },

  // Registrar consumo de um item específico
  async registrarConsumoItem(faturamentoId: number, itemId: number): Promise<void> {
    await api.post(`/faturamentos/${faturamentoId}/itens/${itemId}/registrar-consumo`);
  },

  // Reverter consumo de um item específico
  async reverterConsumoItem(faturamentoId: number, itemId: number): Promise<void> {
    await api.post(`/faturamentos/${faturamentoId}/itens/${itemId}/reverter-consumo`);
  },

  // Remover itens de uma modalidade
  async removerItensModalidade(id: number, contratoId: number, modalidadeId: number): Promise<void> {
    await api.delete(`/faturamentos/${id}/remover-modalidade`, {
      data: { contrato_id: contratoId, modalidade_id: modalidadeId }
    });
  },

  // Obter resumo do faturamento
  async obterResumo(id: number): Promise<{ faturamento: Faturamento; contratos: FaturamentoResumo[] }> {
    const response = await api.get(`/faturamentos/${id}/resumo`);
    return response.data.data;
  }
};

export default faturamentoService;

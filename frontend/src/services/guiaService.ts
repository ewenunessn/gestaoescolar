import api from './api';

export interface Guia {
  id: number;
  mes: number;
  ano: number;
  observacao?: string;
  status: 'aberta' | 'fechada' | 'cancelada';
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  updated_at?: string;
  total_produtos?: number;
  produtosEscola?: GuiaProdutoEscola[];
}

export interface GuiaProdutoEscola {
  id: number;
  guiaId: number;
  produtoId: number;
  escolaId: number;
  quantidade: number;
  unidade: string;
  lote?: string;
  observacao?: string;
  para_entrega: boolean;
  created_at?: string;
  updated_at?: string;
  data_criacao?: string;
  // Campos de entrega
  entrega_confirmada?: boolean;
  quantidade_entregue?: number;
  data_entrega?: string;
  nome_quem_recebeu?: string;
  nome_quem_entregou?: string;
  // Campos do backend (snake_case)
  guia_id?: number;
  produto_id?: number;
  escola_id?: number;
  produto_nome?: string;
  escola_nome?: string;
  produto_unidade?: string;
  // Objetos relacionados (para compatibilidade)
  produto?: {
    id: number;
    nome: string;
    codigo?: string;
  };
  escola?: {
    id: number;
    nome: string;
    codigo?: string;
  };
}

export interface CreateGuiaData {
  mes: number;
  ano: number;
  observacao?: string;
}

export interface AddProdutoGuiaData {
  produtoId: number;
  escolaId: number;
  quantidade: number;
  unidade: string;
  lote?: string;
  observacao?: string;
  para_entrega?: boolean;
}

export const guiaService = {
  // Listar todas as guias
  async listarGuias(params?: { mes?: number; ano?: number; status?: string }) {
    const response = await api.get('/guias', { params });
    return response.data;
  },

  // Criar nova guia
  async criarGuia(data: CreateGuiaData) {
    const response = await api.post('/guias', data);
    return response.data;
  },

  // Buscar guia por ID
  async buscarGuia(id: number) {
    const response = await api.get(`/guias/${id}`);
    return response.data;
  },

  // Atualizar guia
  async atualizarGuia(id: number, data: Partial<CreateGuiaData>) {
    const response = await api.put(`/guias/${id}`, data);
    return response.data;
  },

  // Deletar guia
  async deletarGuia(id: number) {
    const response = await api.delete(`/guias/${id}`);
    return response.data;
  },

  // Adicionar produto à guia
  async adicionarProdutoGuia(guiaId: number, data: AddProdutoGuiaData) {
    const response = await api.post(`/guias/${guiaId}/produtos`, data);
    return response.data;
  },

  // Remover produto da guia
  async removerProdutoGuia(guiaId: number, produtoId: number, escolaId: number) {
    const response = await api.delete(`/guias/${guiaId}/produtos/${produtoId}/escolas/${escolaId}`);
    return response.data;
  },

  // Listar produtos de uma guia
  async listarProdutosGuia(guiaId: number, params?: { escolaId?: number }) {
    const response = await api.get(`/guias/${guiaId}/produtos`, { params });
    return response.data;
  },

  // Atualizar dados de entrega
  async atualizarEntrega(guiaId: number, produtoId: number, escolaId: number, dadosEntrega: {
    entrega_confirmada?: boolean;
    quantidade_entregue?: number;
    data_entrega?: string;
    nome_quem_recebeu?: string;
    nome_quem_entregou?: string;
  }) {
    const response = await api.put(`/guias/${guiaId}/produtos/${produtoId}/escolas/${escolaId}/entrega`, dadosEntrega);
    return response.data;
  },

  // Atualizar campo para_entrega
  async atualizarParaEntrega(itemId: number, para_entrega: boolean) {
    const response = await api.put(`/guias/itens/${itemId}/para-entrega`, { para_entrega });
    return response.data;
  }
};
import api from './api';

export interface Guia {
  id: number;
  mes: number;
  ano: number;
  observacao?: string;
  status: 'aberta' | 'fechada' | 'cancelada';
  createdAt: string;
  updatedAt: string;
  produtosEscola?: GuiaProdutoEscola[];
}

export interface GuiaProdutoEscola {
  id: number;
  guiaId: number;
  produtoId: number;
  escolaId: number;
  quantidade: number;
  unidade: string;
  observacao?: string;
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
  observacao?: string;
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
  }
};
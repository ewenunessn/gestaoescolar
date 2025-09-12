import api from "./api";

export interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  unidade?: string;
  categoria?: string;
  marca?: string;
  codigo_barras?: string;
  peso?: number;
  validade_minima?: number;
  fator_divisao?: number;
  tipo_processamento?: string;
  imagem_url?: string;
  preco_referencia?: number;
  estoque_minimo?: number;
  per_capita?: number;
  modalidade_id?: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CriarProdutoData {
  nome: string;
  descricao?: string;
  unidade?: string;
  categoria?: string;
  marca?: string;
  codigo_barras?: string;
  peso?: number;
  validade_minima?: number;
  fator_divisao?: number;
  tipo_processamento?: string;
  imagem_url?: string;
  preco_referencia?: number;
  estoque_minimo?: number;
  per_capita?: number;
  modalidade_id?: number;
  ativo: boolean;
}

export async function getProdutoById(id: number): Promise<Produto> {
  const { data } = await api.get(`/produtos/${id}`);
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function listarProdutos(): Promise<Produto[]> {
  const { data } = await api.get("/produtos");
  return data.data || data; // Handle both new format {success, data} and old format
}

class ProdutoService {
  private baseUrl = '/api/produtos';

  async listar(): Promise<Produto[]> {
    try {
      const response = await api.get(this.baseUrl);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Erro ao listar produtos:', error);
      throw error;
    }
  }

  async buscarPorId(id: number): Promise<Produto> {
    try {
      const response = await api.get(`${this.baseUrl}/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      throw error;
    }
  }

  async criar(dados: CriarProdutoData): Promise<Produto> {
    try {
      const response = await api.post(this.baseUrl, dados);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }
  }

  async atualizar(id: number, dados: Partial<CriarProdutoData>): Promise<Produto> {
    try {
      const response = await api.put(`${this.baseUrl}/${id}`, dados);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  }

  async remover(id: number): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error('Erro ao remover produto:', error);
      throw error;
    }
  }
}

export const produtoService = new ProdutoService();
export default produtoService;
import api from './api';

export interface Modalidade {
  id: number;
  nome: string;
  descricao?: string;
  codigo_financeiro?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CriarModalidadeData {
  nome: string;
  descricao?: string;
  codigo_financeiro?: string;
  ativo: boolean;
}

class ModalidadeService {
  private baseUrl = '/api/modalidades';

  async listar(): Promise<Modalidade[]> {
    try {
      const response = await api.get(this.baseUrl);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Erro ao listar modalidades:', error);
      throw error;
    }
  }

  async buscarPorId(id: number): Promise<Modalidade> {
    try {
      const response = await api.get(`${this.baseUrl}/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Erro ao buscar modalidade:', error);
      throw error;
    }
  }

  async criar(dados: CriarModalidadeData): Promise<Modalidade> {
    try {
      const response = await api.post(this.baseUrl, dados);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Erro ao criar modalidade:', error);
      throw error;
    }
  }

  async atualizar(id: number, dados: Partial<CriarModalidadeData>): Promise<Modalidade> {
    try {
      const response = await api.put(`${this.baseUrl}/${id}`, dados);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Erro ao atualizar modalidade:', error);
      throw error;
    }
  }

  async remover(id: number): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error('Erro ao remover modalidade:', error);
      throw error;
    }
  }
}

// Funções auxiliares para compatibilidade
export async function listarModalidades(): Promise<Modalidade[]> {
  return modalidadeService.listar();
}

export async function criarModalidade(dados: CriarModalidadeData): Promise<Modalidade> {
  return modalidadeService.criar(dados);
}

export async function editarModalidade(id: number, dados: Partial<CriarModalidadeData>): Promise<Modalidade> {
  return modalidadeService.atualizar(id, dados);
}

export async function removerModalidade(id: number): Promise<void> {
  return modalidadeService.remover(id);
}

export const modalidadeService = new ModalidadeService();
export default modalidadeService;
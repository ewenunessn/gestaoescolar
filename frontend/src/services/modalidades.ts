import { apiWithRetry } from "./api";

export interface Modalidade {
  id: number;
  nome: string;
  descricao?: string;
  codigo_financeiro?: string;
  valor_repasse: number;
  parcelas?: number;
  ativo: boolean;
  total_alunos?: number;
  total_escolas?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ModalidadeInput {
  nome: string;
  descricao?: string;
  codigo_financeiro?: string;
  valor_repasse?: number;
  parcelas?: number;
  ativo?: boolean;
}

export async function listarModalidades(): Promise<Modalidade[]> {
  try {
    // Adicionar timestamp para evitar cache do navegador
    const timestamp = Date.now();
    const response = await apiWithRetry.get(`/modalidades?_t=${timestamp}`);
    const { data } = response;
    
    // Verificar se data existe
    if (!data) {
      console.warn('Resposta vazia da API de modalidades');
      return [];
    }
    
    // Verificar se a resposta tem o novo formato { success: true, data: [...] }
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
    
    // Fallback para o formato antigo (array direto)
    if (Array.isArray(data)) {
      return data;
    }
    
    // Se não for nenhum dos formatos esperados, retornar array vazio
    console.warn('Formato de resposta inesperado para modalidades:', data);
    return [];
  } catch (error: any) {
    console.error('Erro ao listar modalidades:', error);
    throw error;
  }
}

export async function buscarModalidade(id: number): Promise<Modalidade> {
  try {
    const response = await apiWithRetry.get(`/modalidades/${id}`);
    const { data } = response;
    
    // Verificar se data existe
    if (!data) {
      throw new Error('Resposta vazia da API');
    }
    
    // Verificar se a resposta tem o novo formato { success: true, data: {...} }
    if (data.success && data.data) {
      return data.data;
    }
    
    // Fallback para o formato antigo (objeto direto)
    return data.data || data;
  } catch (error) {
    console.error('Erro ao buscar modalidade:', error);
    throw error;
  }
}

export async function criarModalidade(modalidade: ModalidadeInput): Promise<Modalidade> {
  try {
    const response = await apiWithRetry.post("/modalidades", modalidade);
    const { data } = response;
    
    // Verificar se data existe
    if (!data) {
      throw new Error('Resposta vazia da API');
    }
    
    // Verificar se a resposta tem o novo formato { success: true, data: {...} }
    if (data.success && data.data) {
      return data.data;
    }
    
    // Fallback para o formato antigo (objeto direto)
    return data.data || data;
  } catch (error) {
    console.error('Erro ao criar modalidade:', error);
    throw error;
  }
}

export async function editarModalidade(id: number, modalidade: ModalidadeInput): Promise<Modalidade> {
  try {
    const response = await apiWithRetry.put(`/modalidades/${id}`, modalidade);
    const { data } = response;
    
    // Verificar se data existe
    if (!data) {
      throw new Error('Resposta vazia da API');
    }
    
    // Verificar se a resposta tem o novo formato { success: true, data: {...} }
    if (data.success && data.data) {
      return data.data;
    }
    
    // Fallback para o formato antigo (objeto direto)
    return data.data || data;
  } catch (error) {
    console.error('Erro ao editar modalidade:', error);
    throw error;
  }
}

export async function removerModalidade(id: number): Promise<void> {
  try {
    await apiWithRetry.delete(`/modalidades/${id}`);
  } catch (error) {
    console.error('Erro ao remover modalidade:', error);
    throw error;
  }
}

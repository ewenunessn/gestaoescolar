import { api, handleAxiosError } from './client';

// Refeições
export async function listarRefeicoes() {
  try {
    const response = await api.get('/refeicoes');
    // A API retorna { success: true, data: [...] }
    return response.data.data || response.data || [];
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
}

export async function criarRefeicao(data: { nome: string; descricao?: string }) {
  try {
    const response = await api.post('/refeicoes', data);
    return response.data.data || response.data;
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
}

export async function atualizarRefeicao(id: number, data: { nome: string; descricao?: string }) {
  try {
    const response = await api.put(`/refeicoes/${id}`, data);
    return response.data.data || response.data;
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
}

export async function deletarRefeicao(id: number) {
  try {
    await api.delete(`/refeicoes/${id}`);
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
}

// Cardápios
export async function listarCardapios() {
  try {
    const response = await api.get('/cardapios');
    // A API pode retornar { success: true, data: [...] } ou apenas [...]
    return response.data.data || response.data || [];
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
}

export async function criarCardapio(data: {
  data: string;
  refeicao_id: number;
  modalidade_id: number;
  observacoes?: string;
}) {
  try {
    const response = await api.post('/cardapios', data);
    return response.data.data || response.data;
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
}

export async function atualizarCardapio(id: number, data: {
  data: string;
  refeicao_id: number;
  modalidade_id: number;
  observacoes?: string;
}) {
  try {
    const response = await api.put(`/cardapios/${id}`, data);
    return response.data.data || response.data;
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
}

export async function deletarCardapio(id: number) {
  try {
    await api.delete(`/cardapios/${id}`);
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
}

// Produtos da Refeição
export async function listarProdutosDaRefeicao(refeicaoId: number) {
  try {
    const response = await api.get(`/refeicoes/${refeicaoId}/produtos`);
    return response.data.data || response.data || [];
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
}

export async function adicionarProdutoNaRefeicao(
  refeicaoId: number,
  produtoId: number,
  perCapita: number,
  tipoMedida: 'gramas' | 'unidades' = 'gramas'
) {
  try {
    const response = await api.post(`/refeicoes/${refeicaoId}/produtos`, {
      produto_id: produtoId,
      per_capita: perCapita,
      tipo_medida: tipoMedida,
    });
    return response.data.data || response.data;
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
}

export async function editarProdutoNaRefeicao(
  assocId: number,
  perCapita: number,
  tipoMedida?: 'gramas' | 'unidades'
) {
  try {
    const response = await api.put(`/refeicoes/produtos/${assocId}`, {
      per_capita: perCapita,
      tipo_medida: tipoMedida,
    });
    return response.data.data || response.data;
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
}

export async function removerProdutoDaRefeicao(assocId: number) {
  try {
    await api.delete(`/refeicoes/produtos/${assocId}`);
  } catch (error) {
    throw new Error(handleAxiosError(error));
  }
}

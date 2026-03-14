import api from './api';

export interface AjusteModalidade {
  modalidade_id: number;
  modalidade_nome?: string;
  per_capita_ajustado: number;
  observacao?: string;
}

export interface ProdutoComModalidades {
  refeicao_produto_id: number;
  refeicao_id: number;
  produto_id: number;
  produto_nome: string;
  per_capita_padrao: number;
  tipo_medida: string;
  observacoes?: string;
  ajustes_modalidades: AjusteModalidade[] | null;
}

export interface PerCapitaEfetivo {
  refeicao_produto_id: number;
  per_capita_padrao: number;
  tipo_medida: string;
  per_capita_efetivo: number;
  tem_ajuste: boolean;
  observacao?: string;
}

// Listar ajustes de um produto da refeição
export async function listarAjustes(refeicaoProdutoId: number): Promise<AjusteModalidade[]> {
  const response = await api.get(`/refeicao-produto/${refeicaoProdutoId}/ajustes`);
  return response.data;
}

// Salvar ajustes em lote
export async function salvarAjustes(
  refeicaoProdutoId: number,
  ajustes: AjusteModalidade[]
): Promise<{ message: string; count: number }> {
  const response = await api.post(`/refeicao-produto/${refeicaoProdutoId}/ajustes`, { ajustes });
  return response.data;
}

// Obter per capita efetivo para uma modalidade
export async function obterPerCapitaEfetivo(
  refeicaoProdutoId: number,
  modalidadeId: number
): Promise<PerCapitaEfetivo> {
  const response = await api.get(`/refeicao-produto/${refeicaoProdutoId}/modalidade/${modalidadeId}`);
  return response.data;
}

// Listar produtos de uma refeição com todas as modalidades
export async function listarProdutosComModalidades(refeicaoId: number): Promise<ProdutoComModalidades[]> {
  const response = await api.get(`/refeicao/${refeicaoId}/produtos-modalidades`);
  return response.data;
}

// Deletar um ajuste específico
export async function deletarAjuste(ajusteId: number): Promise<{ message: string }> {
  const response = await api.delete(`/ajuste/${ajusteId}`);
  return response.data;
}

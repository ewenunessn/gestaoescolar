import { createCrudService, extractResponseData } from './createCrudService';
import { apiWithRetry } from './api';
import {
  Produto,
  CriarProdutoRequest,
  AtualizarProdutoRequest,
  ComposicaoNutricional,
  ImportarProdutoRequest,
  ImportarProdutosResponse
} from '../types/produto';

// CRUD básico via factory
export const produtoService = createCrudService<Produto, CriarProdutoRequest, AtualizarProdutoRequest>('produtos');

// Alias para compatibilidade
export const getProdutoById = produtoService.buscarPorId;
export const deletarProduto = produtoService.remover;

// Importar produtos em lote
export async function importarProdutosLote(produtos: ImportarProdutoRequest[]): Promise<ImportarProdutosResponse> {
  const { data } = await apiWithRetry.post('/produtos/importar-lote', { produtos });
  return extractResponseData<ImportarProdutosResponse>(data);
}

// Operações de composição nutricional
export async function buscarComposicaoNutricional(produtoId: number): Promise<ComposicaoNutricional | null> {
  const { data } = await apiWithRetry.get(`/produtos/${produtoId}/composicao-nutricional`);
  return extractResponseData<ComposicaoNutricional | null>(data, null);
}

export async function salvarComposicaoNutricional(
  produtoId: number,
  composicao: Partial<ComposicaoNutricional>
): Promise<ComposicaoNutricional> {
  const { data } = await apiWithRetry.put(`/produtos/${produtoId}/composicao-nutricional`, composicao);
  return extractResponseData<ComposicaoNutricional>(data);
}

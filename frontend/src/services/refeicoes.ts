import { createCrudService, extractResponseData } from './createCrudService';
import { apiWithRetry } from './api';
import {
  Refeicao,
  CriarRefeicaoRequest,
  AtualizarRefeicaoRequest,
  RefeicaoProduto,
  CriarRefeicaoProdutoRequest,
  AtualizarRefeicaoProdutoRequest
} from '../types/refeicao';

// CRUD básico via factory
export const refeicaoService = createCrudService<Refeicao, CriarRefeicaoRequest, AtualizarRefeicaoRequest>('refeicoes');

// Alias para compatibilidade
export const deletarRefeicao = refeicaoService.remover;
export const listarRefeicoes = refeicaoService.listar;

// Operações específicas de refeição
export const refeicaoServiceExtended = {
  ...refeicaoService,

  duplicarRefeicao: async (id: number, nome: string): Promise<Refeicao> => {
    const { data } = await apiWithRetry.post(`/refeicoes/${id}/duplicar`, { nome });
    return extractResponseData<Refeicao>(data);
  },

  // Produtos da refeição
  listarProdutos: async (refeicaoId: number): Promise<RefeicaoProduto[]> => {
    const { data } = await apiWithRetry.get(`/refeicao-produtos/${refeicaoId}/produtos`);
    return extractResponseData<RefeicaoProduto[]>(data, []);
  },

  adicionarProduto: async (refeicaoProduto: CriarRefeicaoProdutoRequest): Promise<RefeicaoProduto> => {
    if (!refeicaoProduto.refeicao_id) throw new Error('refeicao_id é obrigatório');
    const { data } = await apiWithRetry.post(
      `/refeicao-produtos/${refeicaoProduto.refeicao_id}/produtos`,
      refeicaoProduto
    );
    return extractResponseData<RefeicaoProduto>(data);
  },

  editarProduto: async (id: number, refeicaoProduto: AtualizarRefeicaoProdutoRequest): Promise<RefeicaoProduto> => {
    const { data } = await apiWithRetry.put(`/refeicao-produtos/produtos/${id}`, refeicaoProduto);
    return extractResponseData<RefeicaoProduto>(data);
  },

  removerProduto: async (id: number): Promise<void> => {
    await apiWithRetry.delete(`/refeicao-produtos/produtos/${id}`);
  },
};

// Aliases para compatibilidade com código existente
export const listarProdutosDaRefeicao = refeicaoServiceExtended.listarProdutos;
export const adicionarProdutoNaRefeicao = refeicaoServiceExtended.adicionarProduto;
export const editarProdutoNaRefeicao = refeicaoServiceExtended.editarProduto;
export const removerProdutoDaRefeicao = refeicaoServiceExtended.removerProduto;

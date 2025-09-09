import { apiWithRetry } from './api';
import {
  CarrinhoItem,
  CarrinhoAgrupado,
  AdicionarItemRequest,
  AtualizarQuantidadeRequest,
  ConfirmarPedidoRequest,
  ConfirmarPedidoResponse,
  ProdutoContrato
} from '../types/carrinho';

export const carrinhoService = {
  // Buscar catálogo de produtos
  async getCatalogoProdutos(filtros?: {
    fornecedor_id?: number;
    contrato_id?: number;
    busca?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProdutoContrato[]> {
    const response = await apiWithRetry.get('/produtos/catalogo', {
      params: filtros
    });
    // O backend retorna { produtos: [], paginacao: {} }, então extraímos os produtos
    const produtos = response.data.produtos || response.data.data || response.data;

    // Mapear os dados da API para o formato esperado pelo frontend
    return produtos.map((produto: any) => ({
      produto_id: produto.id || produto.produto_id,
      nome_produto: produto.produto_nome || produto.nome || '',
      unidade: produto.produto_unidade || produto.unidade || '',
      contrato_id: produto.contrato_id || 0,
      numero_contrato: produto.contrato_numero || produto.numero_contrato || '',
      fornecedor_id: produto.fornecedor_id || 0,
      nome_fornecedor: produto.nome_fornecedor || produto.fornecedor_melhor_preco || '',
      preco_contratual: produto.valor_unitario || produto.preco_contratual || produto.preco_contrato || 0,
      quantidade_contratual: produto.quantidade_total || produto.quantidade_contratual || 0,
      quantidade_disponivel: produto.saldo_disponivel || produto.quantidade_disponivel_real || produto.quantidade_disponivel || 0,
      contrato_ativo: produto.contrato_ativo !== false, // Sempre true pois só retornamos produtos com contratos ativos
      data_inicio: produto.data_inicio || '',
      data_fim: produto.data_fim || ''
    }));
  },

  // Buscar produto específico do catálogo
  async getProdutoContrato(produto_id: number, contrato_id: number): Promise<ProdutoContrato> {
    const response = await apiWithRetry.get(`/produtos/catalogo/${produto_id}/${contrato_id}`);
    return response.data.data || response.data;
  },

  // Adicionar item ao carrinho
  async adicionarItem(item: AdicionarItemRequest): Promise<CarrinhoItem> {
    const response = await apiWithRetry.post('/carrinho/adicionar', item);
    return response.data.data || response.data;
  },

  // Buscar itens do carrinho
  async getCarrinho(): Promise<CarrinhoItem[]> {
    const response = await apiWithRetry.get('/carrinho');
    // O backend retorna { success: true, data: { itens: [], total_itens: number, total_geral: number } }
    return response.data.data?.itens || response.data.data || response.data || [];
  },

  // Buscar carrinho agrupado por fornecedor
  async getCarrinhoAgrupado(): Promise<CarrinhoAgrupado[]> {
    const response = await apiWithRetry.get('/carrinho?agrupado=true');
    // O backend retorna { success: true, data: [...] } quando agrupado
    return response.data.data || response.data || [];
  },

  // Atualizar quantidade de item
  async atualizarQuantidade(data: AtualizarQuantidadeRequest): Promise<void> {
    await apiWithRetry.put('/carrinho/alterar', data);
  },

  // Remover item do carrinho
  async removerItem(itemId: number): Promise<void> {
    await apiWithRetry.delete(`/carrinho/${itemId}`);
  },

  // Limpar carrinho completo
  async limparCarrinho(): Promise<void> {
    await apiWithRetry.delete('/carrinho/limpar');
  },

  // Confirmar pedido
  async confirmarPedido(data: ConfirmarPedidoRequest): Promise<ConfirmarPedidoResponse> {
    const response = await apiWithRetry.post('/carrinho/confirmar', data);
    return response.data.data || response.data;
  }
};
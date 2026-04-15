/**
 * @deprecated Use `produtos.ts` instead.
 * Este arquivo existe apenas para compatibilidade com imports antigos.
 * Re-exporta tudo de produtos.ts.
 */
export {
  produtoService,
  produtoService as default,
  getProdutoById,
  deletarProduto,
  importarProdutosLote,
  buscarComposicaoNutricional,
  salvarComposicaoNutricional,
} from './produtos';

// Re-exporta o tipo Produto do arquivo de tipos canônico
export type { Produto, CriarProdutoRequest as CriarProdutoData } from '../types/produto';

import type { Produto } from '../../../services/produtoService';
import type { NovoItemData } from '../../../services/solicitacoesAlimentos';

export function getProdutoUnidadeSolicitacao(produto: Pick<Produto, 'unidade'> | null | undefined): string {
  const unidade = produto?.unidade?.trim();
  return unidade || 'UN';
}

export function buildNovoItemSolicitacao(
  produto: Pick<Produto, 'id' | 'nome' | 'unidade'>,
  quantidade: number,
): NovoItemData {
  return {
    produto_id: produto.id,
    nome_produto: produto.nome,
    quantidade,
    unidade: getProdutoUnidadeSolicitacao(produto),
  };
}

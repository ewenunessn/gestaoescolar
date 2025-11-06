export interface ItemEstoqueEscola {
  id: number;
  escola_id: number;
  produto_id: number;
  quantidade_atual: string | number;
  quantidade_minima: number;
  quantidade_maxima: number;
  status_estoque: 'normal' | 'sem_estoque' | 'baixo' | 'alto';
  data_ultima_movimentacao?: string;
  created_at: string;
  updated_at: string;
  // Dados relacionados
  produto_nome?: string;
  unidade?: string;
  escola_nome?: string;
}

export interface MovimentacaoEstoque {
  id: number;
  escola_id: number;
  produto_id: number;
  tipo_movimentacao: 'entrada' | 'saida' | 'ajuste' | 'transferencia';
  quantidade: number;
  quantidade_anterior: number;
  quantidade_atual: number;
  motivo?: string;
  usuario_id: number;
  created_at: string;
  unidade?: string;
  // Dados relacionados
  produto_nome?: string;
  unidade?: string;
  usuario_nome?: string;
}

export interface CriarMovimentacaoRequest {
  escola_id: number;
  produto_id: number;
  tipo_movimentacao: 'entrada' | 'saida' | 'ajuste' | 'transferencia';
  quantidade: number;
  motivo?: string;
}

export interface AlertaEstoque {
  id: number;
  escola_id: number;
  produto_id: number;
  tipo_alerta: 'estoque_baixo' | 'estoque_zerado' | 'estoque_alto' | 'produto_vencido';
  mensagem: string;
  resolvido: boolean;
  data_resolucao?: string;
  created_at: string;
  // Dados relacionados
  produto_nome?: string;
  escola_nome?: string;
}

export interface LoteEstoque {
  id: number;
  produto_id: number;
  numero_lote: string;
  data_fabricacao: string;
  data_validade: string;
  quantidade_inicial: number;
  quantidade_atual: number;
  fornecedor_id?: number;
  created_at: string;
  updated_at: string;
  // Dados relacionados
  produto_nome?: string;
  fornecedor_nome?: string;
}
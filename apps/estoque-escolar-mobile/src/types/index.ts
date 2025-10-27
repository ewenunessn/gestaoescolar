export interface LoteEstoque {
  id: number;
  produto_id: number;
  lote: string;
  quantidade_inicial: number;
  quantidade_atual: number;
  data_fabricacao?: string;
  data_validade?: string;
  fornecedor_id?: number;
  observacoes?: string;
  status: 'ativo' | 'vencido' | 'bloqueado';
  created_at: string;
  updated_at: string;
}

export interface ItemEstoqueEscola {
  id: number;
  produto_id: number;
  escola_id: number;
  quantidade_atual: number;
  quantidade_minima?: number;
  quantidade_maxima?: number;
  status_estoque: 'sem_estoque' | 'baixo' | 'normal' | 'alto';
  data_ultima_atualizacao: string;
  observacoes?: string;
  ativo?: boolean;
  produto_nome: string;
  produto_descricao?: string;
  unidade_medida: string;
  categoria: string;
  escola_nome: string;
  // Novos campos para lotes
  lotes?: LoteEstoque[];
  // Campos opcionais para compatibilidade
  produto?: {
    id: number;
    nome: string;
    descricao?: string;
    unidade_medida: string;
    categoria?: string;
  };
  escola?: {
    id: number;
    nome: string;
  };
}

export interface HistoricoEstoque {
  id: number;
  estoque_escola_id: number;
  escola_id: number;
  produto_id: number;
  tipo_movimentacao: 'entrada' | 'saida' | 'ajuste' | 'transferencia';
  quantidade_anterior: number;
  quantidade_movimentada: number;
  quantidade_posterior: number;
  motivo?: string;
  documento_referencia?: string;
  usuario_id?: number;
  data_movimentacao: string;
  observacoes?: string;
  produto_nome: string;
  unidade_medida: string;
  usuario_nome?: string;
  // Campos opcionais para compatibilidade
  item_estoque_id?: number;
  tipo_movimento?: 'entrada' | 'saida' | 'ajuste';
  quantidade?: number;
  quantidade_nova?: number;
  data_movimento?: string;
  usuario?: {
    id: number;
    nome: string;
  };
}

export interface ResumoEstoque {
  total_itens: number;
  itens_normais: number;
  itens_baixos: number;
  itens_sem_estoque: number;
}

export interface AtualizacaoLote {
  item_id: number;
  nova_quantidade: number;
  motivo?: string;
  observacoes?: string;
}

export interface MovimentoLote {
  lote_id?: number;
  lote?: string;
  quantidade: number;
  data_validade?: string;
  data_fabricacao?: string;
  observacoes?: string;
}

export interface MovimentoEstoque {
  tipo?: 'entrada' | 'saida' | 'ajuste'; // Campo antigo para compatibilidade
  tipo_movimentacao?: 'entrada' | 'saida' | 'ajuste';
  quantidade?: number; // Campo antigo para compatibilidade
  quantidade_movimentada?: number;
  motivo?: string;
  observacoes?: string;
  documento_referencia?: string;
  usuario_id?: number;
  // Novos campos para lotes
  lotes?: MovimentoLote[];
}

export interface FiltrosEstoque {
  status?: string;
  categoria?: string;
  busca?: string;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  escola_id?: number;
  perfil: string;
}

export interface Escola {
  id: number;
  nome: string;
  endereco?: string;
  telefone?: string;
  email?: string;
}
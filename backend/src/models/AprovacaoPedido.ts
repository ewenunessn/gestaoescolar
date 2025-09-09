export interface AprovacaoPedido {
  id: number;
  pedido_id: number;
  aprovador_id: number;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  valor_limite: number;
  data_solicitacao: Date;
  data_aprovacao?: Date;
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface NovaAprovacao {
  pedido_id: number;
  aprovador_id: number;
  valor_limite: number;
  observacoes?: string;
}

export interface AcaoAprovacao {
  status: 'aprovado' | 'rejeitado';
  observacoes?: string;
}

export interface RegraAprovacao {
  valor_minimo: number;
  nivel_aprovacao: 'supervisor' | 'gerente' | 'diretor';
  usuarios_aprovadores: number[];
}

export const REGRAS_APROVACAO: RegraAprovacao[] = [
  {
    valor_minimo: 500,
    nivel_aprovacao: 'supervisor',
    usuarios_aprovadores: [] // Será preenchido dinamicamente
  },
  {
    valor_minimo: 1000,
    nivel_aprovacao: 'gerente', 
    usuarios_aprovadores: []
  },
  {
    valor_minimo: 5000,
    nivel_aprovacao: 'diretor',
    usuarios_aprovadores: []
  }
];
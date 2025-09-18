export interface Alerta {
  id: number;
  tipo: TipoAlerta;
  titulo: string;
  mensagem: string;
  usuario_id: number;
  lido: boolean;
  data_criacao: Date;
  data_expiracao?: Date;
  metadados?: any;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  created_at: Date;
  updated_at: Date;
}

export enum TipoAlerta {
  PEDIDO_ATRASADO = 'pedido_atrasado',
  DIVERGENCIA_RECEBIMENTO = 'divergencia_recebimento',
  PRODUTO_VENCENDO = 'produto_vencendo',
  ESTOQUE_MINIMO = 'estoque_minimo',
  APROVACAO_PENDENTE = 'aprovacao_pendente',
  FORNECEDOR_ATRASO = 'fornecedor_atraso',
  SISTEMA_MANUTENCAO = 'sistema_manutencao'
}

export interface NovoAlerta {
  tipo: TipoAlerta;
  titulo: string;
  mensagem: string;
  usuario_id?: number; // Se não informado, será enviado para todos os admins
  data_expiracao?: Date;
  metadados?: any;
  prioridade?: 'baixa' | 'media' | 'alta' | 'critica';
}

export interface ConfiguracaoAlerta {
  usuario_id: number;
  tipo_alerta: TipoAlerta;
  ativo: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface FiltroAlertas {
  usuario_id?: number;
  tipo?: TipoAlerta;
  lido?: boolean;
  prioridade?: string;
  data_inicio?: Date;
  data_fim?: Date;
  limit?: number;
  offset?: number;
}
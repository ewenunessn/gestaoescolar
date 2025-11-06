export interface Demanda {
  id: number;
  escola_id?: number;
  escola_nome: string;
  numero_oficio: string;
  data_solicitacao: string;
  data_semead: string;
  objeto: string;
  descricao_itens: string;
  data_resposta_semead?: string;
  dias_solicitacao: number | null;
  status: 'pendente' | 'enviado_semead' | 'atendido' | 'nao_atendido';
  observacoes?: string;
  usuario_criacao_id: number;
  usuario_criacao_nome?: string;
  created_at: string;
  updated_at: string;
}

export const STATUS_DEMANDA = {
  pendente: { label: 'Pendente', color: 'warning' },
  enviado_semead: { label: 'Enviado à SEMAD', color: 'info' },
  atendido: { label: 'Atendido', color: 'success' },
  nao_atendido: { label: 'Não Atendido', color: 'error' }
} as const;

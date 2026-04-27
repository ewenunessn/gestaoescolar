export interface Rota {
  id: number;
  nome: string;
  descricao?: string;
  cor: string;
  ativo: boolean;
  total_escolas?: number;
}

export interface EscolaEntrega {
  id: number;
  nome: string;
  endereco?: string;
  telefone?: string;
  total_itens: number;
  itens_entregues: number;
  percentual_entregue: number;
  data_entrega?: string;
  rota_nome?: string;
  rota_id?: number;
  ordem_rota?: number;
  total_alunos?: number;
}

export interface HistoricoEntrega {
  id: number;
  quantidade_entregue: number;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  data_entrega: string;
  observacao?: string;
  assinatura_base64?: string;
  latitude?: number;
  longitude?: number;
  precisao_gps?: number;
  client_operation_id?: string;
}

export interface ItemEntrega {
  id: number;
  guia_id: number;
  produto_id: number;
  escola_id: number;
  quantidade: number;
  unidade: string;
  lote?: string;
  observacao?: string;
  para_entrega: boolean;
  entrega_confirmada: boolean;
  // Campos para controle de entregas parciais (compatível com app)
  quantidade_entregue?: number;
  quantidade_ja_entregue?: number;
  saldo_pendente?: number;
  data_entrega?: string;
  nome_quem_recebeu?: string;
  nome_quem_entregou?: string;
  produto_nome: string;
  produto_unidade: string;
  mes: number;
  ano: number;
  guia_observacao?: string;
  // Histórico completo de entregas
  historico_entregas?: HistoricoEntrega[];
  // Código único da guia
  codigo_guia?: string;
  // Snapshot dos dados da escola (integridade de dados)
  escola_nome?: string;
  escola_endereco?: string;
  escola_municipio?: string;
  escola_total_alunos?: number;
  escola_modalidades?: Array<{
    modalidade_id: number;
    modalidade_nome: string;
    quantidade_alunos: number;
  }>;
  escola_snapshot_data?: string;
}

export interface ConfirmarEntregaData {
  quantidade_entregue: number;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  observacao?: string;
  assinatura_base64?: string;
  // GPS opcional no web, obrigatório no app
  latitude?: number;
  longitude?: number;
  precisao_gps?: number;
  client_operation_id?: string;
}

export interface EstatisticasEntregas {
  total_escolas: number;
  total_itens: number;
  itens_entregues: number;
  itens_pendentes: number;
  percentual_entregue: number;
}

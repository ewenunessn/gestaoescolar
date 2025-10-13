export interface RotaEntrega {
  id: number;
  nome: string;
  descricao?: string;
  cor: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  total_escolas?: number;
}

export interface RotaEscola {
  id: number;
  rota_id: number;
  escola_id: number;
  ordem: number;
  observacao?: string;
  created_at: string;
  escola_nome?: string;
  escola_endereco?: string;
}

export interface PlanejamentoEntrega {
  id: number;
  guia_id: number;
  rota_id: number;
  data_planejada?: string;
  status: 'planejado' | 'em_andamento' | 'concluido' | 'cancelado';
  responsavel?: string;
  observacao?: string;
  created_at: string;
  updated_at: string;
  rota_nome?: string;
  rota_cor?: string;
  guia_mes?: number;
  guia_ano?: number;
}

export interface CreateRotaData {
  nome: string;
  descricao?: string;
  cor?: string;
}

export interface CreatePlanejamentoData {
  guiaId: number;
  rotaId: number;
  dataPlanejada?: string;
  responsavel?: string;
  observacao?: string;
}

export interface RotaComEntregas {
  id: number;
  nome: string;
  descricao?: string;
  cor: string;
  guia_id: number;
  status: string;
  responsavel?: string;
  data_planejada?: string;
  mes: number;
  ano: number;
  total_escolas: number;
  total_itens: number;
  itens_entregues: number;
}
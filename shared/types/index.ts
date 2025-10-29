/**
 * Tipos compartilhados entre frontend, backend e mobile
 * Garante consistência de tipos em todo o sistema
 */

// ============================================================================
// TIPOS BÁSICOS E UTILITÁRIOS
// ============================================================================

export type ID = number;
export type DateString = string; // ISO date string
export type Status = 'ativo' | 'inativo';

// ============================================================================
// TIPOS DE USUÁRIO E AUTENTICAÇÃO
// ============================================================================

export type TipoUsuario = 'admin' | 'gestor' | 'escola';

export interface Usuario {
  id: ID;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  escola_id?: ID;
  ativo: boolean;
  created_at: DateString;
  updated_at: DateString;
}

export interface UsuarioCreate {
  nome: string;
  email: string;
  senha: string;
  tipo: TipoUsuario;
  escola_id?: ID;
  ativo?: boolean;
}

export interface UsuarioUpdate {
  nome?: string;
  email?: string;
  tipo?: TipoUsuario;
  escola_id?: ID;
  ativo?: boolean;
}

export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: Usuario;
  message?: string;
}

// ============================================================================
// TIPOS DE ESCOLA
// ============================================================================

export interface Escola {
  id: ID;
  nome: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  diretor?: string;
  ativo: boolean;
  created_at: DateString;
  updated_at: DateString;
}

export interface EscolaCreate {
  nome: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  diretor?: string;
  ativo?: boolean;
}

export interface EscolaUpdate extends Partial<EscolaCreate> {}

// ============================================================================
// TIPOS DE PRODUTO
// ============================================================================

export interface Produto {
  id: ID;
  nome: string;
  descricao?: string;
  unidade: string;
  categoria: string;
  ativo: boolean;
  created_at: DateString;
  updated_at: DateString;
}

export interface ProdutoCreate {
  nome: string;
  descricao?: string;
  unidade: string;
  categoria: string;
  ativo?: boolean;
}

export interface ProdutoUpdate extends Partial<ProdutoCreate> {}

// ============================================================================
// TIPOS DE ESTOQUE
// ============================================================================

export type TipoMovimentacao = 'entrada' | 'saida' | 'ajuste';
export type StatusEstoque = 'sem_estoque' | 'baixo_estoque' | 'normal' | 'alto_estoque';
export type StatusLote = 'ativo' | 'esgotado' | 'vencido' | 'cancelado';

export interface EstoqueEscola {
  id: ID;
  escola_id: ID;
  produto_id: ID;
  quantidade_atual: number;
  data_entrada?: DateString;
  data_validade?: DateString;
  created_at: DateString;
  updated_at: DateString;
  
  // Dados relacionados (quando incluídos)
  produto_nome?: string;
  produto_descricao?: string;
  unidade_medida?: string;
  categoria?: string;
  escola_nome?: string;
  status_estoque?: StatusEstoque;
  dias_para_vencimento?: number;
}

export interface EstoqueLote {
  id: ID;
  produto_id: ID;
  lote: string;
  quantidade_inicial: number;
  quantidade_atual: number;
  data_fabricacao?: DateString;
  data_validade?: DateString;
  fornecedor_id?: ID;
  status: StatusLote;
  observacoes?: string;
  created_at: DateString;
  updated_at: DateString;
  
  // Dados relacionados
  produto_nome?: string;
  unidade?: string;
  fornecedor_nome?: string;
}

export interface MovimentacaoEstoque {
  id: ID;
  estoque_escola_id: ID;
  escola_id: ID;
  produto_id: ID;
  tipo_movimentacao: TipoMovimentacao;
  quantidade_anterior: number;
  quantidade_movimentada: number;
  quantidade_posterior: number;
  motivo: string;
  documento_referencia?: string;
  usuario_id?: ID;
  data_movimentacao: DateString;
  created_at: DateString;
  
  // Dados relacionados
  produto_nome?: string;
  unidade?: string;
  escola_nome?: string;
  usuario_nome?: string;
}

export interface MovimentacaoCreate {
  produto_id: ID;
  tipo_movimentacao: TipoMovimentacao;
  quantidade: number;
  motivo: string;
  documento_referencia?: string;
  usuario_id?: ID;
  data_validade?: DateString;
}

// ============================================================================
// TIPOS DE ESTOQUE ESCOLAR (VISÃO GERAL)
// ============================================================================

export interface EstoqueEscolarResumo {
  produto_id: ID;
  produto_nome: string;
  produto_descricao?: string;
  unidade: string;
  categoria?: string;
  total_quantidade: number;
  total_escolas_com_estoque: number;
  total_escolas: number;
}

export interface EstoqueEscolarDetalhado {
  produto_id: ID;
  produto_nome: string;
  produto_descricao?: string;
  unidade: string;
  categoria?: string;
  escolas: EstoqueEscolaProduto[];
  total_quantidade: number;
  total_escolas_com_estoque: number;
  total_escolas: number;
}

export interface EstoqueEscolaProduto {
  escola_id: ID;
  escola_nome: string;
  produto_id: ID;
  quantidade_atual: number;
  unidade: string;
  status_estoque: StatusEstoque;
  data_ultima_atualizacao?: DateString;
}

// ============================================================================
// TIPOS DE DEMANDA
// ============================================================================

export type StatusDemanda = 'pendente' | 'aprovada' | 'recusada' | 'atendida';
export type AcaoDemanda = 'aprovar' | 'recusar' | 'atender';

export interface Demanda {
  id: ID;
  escola_id: ID;
  numero_oficio: string;
  data_solicitacao: DateString;
  objeto: string;
  descricao_itens: string;
  observacoes?: string;
  status: StatusDemanda;
  motivo_recusa?: string;
  data_resposta?: DateString;
  usuario_responsavel_id?: ID;
  created_at: DateString;
  updated_at: DateString;
  
  // Dados relacionados
  escola_nome?: string;
  usuario_responsavel_nome?: string;
}

export interface DemandaCreate {
  escola_id: ID;
  numero_oficio: string;
  data_solicitacao: DateString;
  objeto: string;
  descricao_itens: string;
  observacoes?: string;
}

export interface DemandaUpdate extends Partial<DemandaCreate> {}

export interface DemandaAcao {
  acao: AcaoDemanda;
  motivo_recusa?: string;
  data_resposta?: DateString;
  observacoes?: string;
}

// ============================================================================
// TIPOS DE CONFIGURAÇÃO
// ============================================================================

export type TipoConfiguracao = 'string' | 'number' | 'boolean' | 'json';

export interface Configuracao {
  id: ID;
  chave: string;
  valor: string;
  descricao?: string;
  tipo: TipoConfiguracao;
  created_at: DateString;
  updated_at: DateString;
}

export interface ConfiguracaoCreate {
  chave: string;
  valor: string;
  descricao?: string;
  tipo?: TipoConfiguracao;
}

export interface ConfiguracaoUpdate extends Partial<Omit<ConfiguracaoCreate, 'chave'>> {}

// ============================================================================
// TIPOS DE RESPOSTA DA API
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface ApiListResponse<T = any> extends ApiResponse<T[]> {
  total?: number;
  page?: number;
  limit?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface DateRangeParams {
  data_inicio?: DateString;
  data_fim?: DateString;
}

// ============================================================================
// TIPOS DE FILTROS E BUSCA
// ============================================================================

export interface FiltroEstoque {
  search?: string;
  categoria?: string;
  status?: 'todos' | 'com_estoque' | 'sem_estoque' | 'baixo_estoque';
  escola_id?: ID;
  produto_id?: ID;
}

export interface FiltroValidade {
  status?: 'todos' | 'vencidos' | 'criticos' | 'atencao' | 'normais';
  dias_vencimento?: number;
  produto_id?: ID;
  escola_id?: ID;
}

export interface FiltroHistorico extends DateRangeParams {
  escola_id?: ID;
  produto_id?: ID;
  tipo_movimentacao?: TipoMovimentacao;
}

// ============================================================================
// TIPOS DE RELATÓRIOS
// ============================================================================

export type FormatoRelatorio = 'pdf' | 'excel' | 'csv';

export interface RelatorioEstoque {
  incluir_sem_estoque?: boolean;
  incluir_baixo_estoque?: boolean;
  agrupar_por_categoria?: boolean;
  formato?: FormatoRelatorio;
  escola_ids?: ID[];
  produto_ids?: ID[];
}

export interface RelatorioValidade extends DateRangeParams {
  incluir_vencidos?: boolean;
  incluir_criticos?: boolean;
  incluir_atencao?: boolean;
  formato?: FormatoRelatorio;
  escola_ids?: ID[];
}

export interface RelatorioMovimentacao extends DateRangeParams {
  tipos_movimentacao?: TipoMovimentacao[];
  escola_ids?: ID[];
  produto_ids?: ID[];
  formato?: FormatoRelatorio;
}

// ============================================================================
// TIPOS DE ESTATÍSTICAS
// ============================================================================

export interface EstatisticasEstoque {
  total_produtos: number;
  total_escolas: number;
  itens_com_estoque: number;
  itens_sem_estoque: number;
  quantidade_total_estoque: number;
  lotes_ativos: number;
  lotes_proximos_vencimento: number;
  lotes_vencidos: number;
}

export interface EstatisticasEscola {
  escola_id: ID;
  escola_nome: string;
  total_itens: number;
  itens_normais: number;
  itens_baixos: number;
  itens_sem_estoque: number;
  ultima_atualizacao?: DateString;
}

// ============================================================================
// TIPOS PARA MOBILE APP
// ============================================================================

export interface ConfiguracaoLocal {
  escola_id: ID;
  nome_escola: string;
  servidor_url: string;
  token_acesso?: string;
  sincronizacao_automatica: boolean;
  intervalo_sincronizacao: number; // minutos
  modo_offline: boolean;
}

export interface SincronizacaoStatus {
  ultima_sincronizacao?: DateString;
  sincronizando: boolean;
  erro_sincronizacao?: string;
  itens_pendentes: number;
}

// ============================================================================
// TIPOS DE VALIDAÇÃO
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

// ============================================================================
// TIPOS DE EVENTOS E NOTIFICAÇÕES
// ============================================================================

export type TipoEvento = 'estoque_baixo' | 'produto_vencido' | 'produto_critico' | 'movimentacao' | 'demanda_criada';

export interface Evento {
  id: ID;
  tipo: TipoEvento;
  titulo: string;
  descricao: string;
  dados?: Record<string, any>;
  lido: boolean;
  usuario_id: ID;
  created_at: DateString;
}

// ============================================================================
// EXPORTS ORGANIZADOS
// ============================================================================

// Todos os tipos são exportados automaticamente pelas declarações acima
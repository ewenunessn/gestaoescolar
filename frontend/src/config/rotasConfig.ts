/**
 * Configuração dinâmica de rotas de entrega
 * Permite adicionar/remover rotas facilmente
 */

export interface RotaConfig {
  id: number;
  nome: string;
  cor: string;
  corSecundaria: string;
  icone: string;
  descricao?: string;
  ativa: boolean;
}

// Configuração inicial vazia - rotas serão criadas pelo usuário
export const ROTAS_PADRAO: RotaConfig[] = [];

// Cores para novas rotas
export const CORES_ROTAS_EXTRAS = [
  { cor: '#2563EB', corSecundaria: '#dbeafe' }, // Azul
  { cor: '#F59E0B', corSecundaria: '#fef3c7' }, // Laranja
  { cor: '#10B981', corSecundaria: '#d1fae5' }, // Verde
  { cor: '#8B5CF6', corSecundaria: '#ede9fe' }, // Roxo
  { cor: '#EF4444', corSecundaria: '#fee2e2' }, // Vermelho
  { cor: '#06B6D4', corSecundaria: '#cffafe' }, // Ciano
  { cor: '#84CC16', corSecundaria: '#ecfccb' }, // Lima
  { cor: '#F97316', corSecundaria: '#fed7aa' }, // Laranja escuro
  { cor: '#EC4899', corSecundaria: '#fce7f3' }, // Rosa
  { cor: '#6366F1', corSecundaria: '#e0e7ff' }, // Índigo
];

// Ícones para novas rotas
export const ICONES_ROTAS = ['🚌', '🚐', '🚛', '🚚', '🚙', '🚗', '🚕', '🚖', '🚘', '🚔'];

/**
 * Classe para gerenciar rotas dinamicamente
 */
export class RotasManager {
  private static rotas: RotaConfig[] = [...ROTAS_PADRAO];

  /**
   * Obter todas as rotas (incluindo inativas para exibição)
   */
  static getRotas(): RotaConfig[] {
    return this.rotas;
  }

  /**
   * Obter apenas rotas ativas (para uso em seletores)
   */
  static getRotasAtivas(): RotaConfig[] {
    return this.rotas.filter(rota => rota.ativa);
  }

  /**
   * Obter todas as rotas (incluindo inativas)
   */
  static getTodasRotas(): RotaConfig[] {
    return this.rotas;
  }

  /**
   * Obter rota por ID
   */
  static getRotaPorId(id: number): RotaConfig | undefined {
    return this.rotas.find(rota => rota.id === id);
  }

  /**
   * Adicionar nova rota
   */
  static adicionarRota(nome: string, descricao?: string): RotaConfig {
    // Calcular próximo ID (começar do 1 se não houver rotas)
    const proximoId = this.rotas.length === 0 
      ? 1 
      : Math.max(...this.rotas.map(r => r.id)) + 1;
    
    // Calcular índices para cores e ícones (começar do 0)
    const corIndex = (proximoId - 1) % CORES_ROTAS_EXTRAS.length;
    const iconeIndex = (proximoId - 1) % ICONES_ROTAS.length;
    
    const novaRota: RotaConfig = {
      id: proximoId,
      nome,
      cor: CORES_ROTAS_EXTRAS[corIndex].cor,
      corSecundaria: CORES_ROTAS_EXTRAS[corIndex].corSecundaria,
      icone: ICONES_ROTAS[iconeIndex],
      descricao,
      ativa: true
    };

    this.rotas.push(novaRota);
    this.salvarRotas();
    return novaRota;
  }

  /**
   * Atualizar rota existente
   */
  static atualizarRota(id: number, dados: Partial<RotaConfig>): boolean {
    const index = this.rotas.findIndex(rota => rota.id === id);
    if (index === -1) return false;

    this.rotas[index] = { ...this.rotas[index], ...dados };
    this.salvarRotas();
    return true;
  }

  /**
   * Desativar rota (não remove, apenas desativa)
   */
  static desativarRota(id: number): boolean {
    return this.atualizarRota(id, { ativa: false });
  }

  /**
   * Ativar rota
   */
  static ativarRota(id: number): boolean {
    return this.atualizarRota(id, { ativa: true });
  }

  /**
   * Deletar rota (remove completamente)
   */
  static deletarRota(id: number): boolean {
    const index = this.rotas.findIndex(rota => rota.id === id);
    if (index === -1) return false;

    this.rotas.splice(index, 1);
    this.salvarRotas();
    return true;
  }

  /**
   * Verificar se uma rota pode ser deletada (não tem escolas associadas)
   */
  static async podeSerDeletada(id: number): Promise<{ pode: boolean; motivo?: string }> {
    try {
      // Verificar no localStorage se há escolas com essa rota
      const escolasData = localStorage.getItem('escolas_data');
      if (escolasData) {
        const escolas = JSON.parse(escolasData);
        const escolasComEstaRota = escolas.filter((escola: any) => escola.rota === id);
        
        if (escolasComEstaRota.length > 0) {
          return {
            pode: false,
            motivo: `Esta rota possui ${escolasComEstaRota.length} escola(s) associada(s). Remova as associações primeiro.`
          };
        }
      }

      // Verificar associações na tabela rota_escola_associacoes (se existir)
      const associacoesData = localStorage.getItem('rota_escola_associacoes');
      if (associacoesData) {
        const associacoes = JSON.parse(associacoesData);
        const associacoesComEstaRota = associacoes.filter((assoc: any) => assoc.rota_id === id);
        
        if (associacoesComEstaRota.length > 0) {
          return {
            pode: false,
            motivo: `Esta rota possui ${associacoesComEstaRota.length} associação(ões) com escolas. Remova as associações primeiro.`
          };
        }
      }

      return { pode: true };
    } catch (error) {
      console.error('Erro ao verificar se rota pode ser deletada:', error);
      return {
        pode: false,
        motivo: 'Erro ao verificar associações. Tente novamente.'
      };
    }
  }

  /**
   * Obter opções para select/dropdown (apenas rotas ativas)
   */
  static getOpcoesSelect(): Array<{ value: string; label: string; cor: string }> {
    return this.getRotasAtivas().map(rota => ({
      value: rota.id.toString(),
      label: `${rota.icone} ${rota.nome}`,
      cor: rota.cor
    }));
  }

  /**
   * Obter cores por ID de rota
   */
  static getCoresPorId(id: number): { cor: string; corSecundaria: string } {
    const rota = this.getRotaPorId(id);
    return rota 
      ? { cor: rota.cor, corSecundaria: rota.corSecundaria }
      : { cor: '#6B7280', corSecundaria: '#f3f4f6' }; // Cinza padrão
  }

  /**
   * Salvar rotas no localStorage (em produção, seria no backend)
   */
  private static salvarRotas(): void {
    try {
      localStorage.setItem('rotas_config', JSON.stringify(this.rotas));
    } catch (error) {
      console.warn('Erro ao salvar configuração de rotas:', error);
    }
  }

  /**
   * Carregar rotas do localStorage
   */
  static carregarRotas(): void {
    try {
      const rotasSalvas = localStorage.getItem('rotas_config');
      if (rotasSalvas) {
        this.rotas = JSON.parse(rotasSalvas);
      }
    } catch (error) {
      console.warn('Erro ao carregar configuração de rotas:', error);
      this.rotas = [...ROTAS_PADRAO];
    }
  }



  /**
   * Validar se uma rota existe e está ativa
   */
  static validarRota(id: number): boolean {
    const rota = this.getRotaPorId(id);
    return rota ? rota.ativa : false;
  }

  /**
   * Obter estatísticas das rotas
   */
  static getEstatisticas(): {
    total: number;
    ativas: number;
    inativas: number;
  } {
    return {
      total: this.rotas.length,
      ativas: this.rotas.filter(r => r.ativa).length,
      inativas: this.rotas.filter(r => !r.ativa).length
    };
  }
}

// Inicializar carregamento das rotas
RotasManager.carregarRotas();
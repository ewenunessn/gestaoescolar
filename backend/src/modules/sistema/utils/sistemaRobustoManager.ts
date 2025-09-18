import { SistemaRobustoImpl } from './sistemaRobusto';
import db from '../../../database';

export default class SistemaRobustoManager {
  private sistemaRobusto: SistemaRobustoImpl;

  constructor() {
    this.sistemaRobusto = new SistemaRobustoImpl();
  }

  async buscarAuditoria(filtros: any): Promise<any[]> {
    return await this.sistemaRobusto.buscarAuditoria(filtros);
  }

  async buscarPerformance(filtros: any): Promise<any[]> {
    return await this.sistemaRobusto.buscarPerformance(filtros);
  }

  async getConfiguracao(chave: string): Promise<any> {
    return await this.sistemaRobusto.getConfiguracao(chave);
  }

  async setConfiguracao(chave: string, valor: any): Promise<boolean> {
    return await this.sistemaRobusto.setConfiguracao(chave, valor);
  }

  // Métodos adicionais para compatibilidade
  async fechar(): Promise<void> {
    // Não precisa fazer nada aqui, mas mantém para compatibilidade
    console.log('SistemaRobustoManager fechado');
  }

  async definirConfiguracao(modulo: string, chave: string, valor: any, usuario_id: number): Promise<boolean> {
    const chaveCompleta = `${modulo}.${chave}`;
    return await this.setConfiguracao(chaveCompleta, valor);
  }

  // Métodos do sistemaRobusto que precisam ser expostos
  async validarIntegridade(): Promise<any> {
    return await this.sistemaRobusto.validarIntegridade();
  }

  async limparLogsAntigos(): Promise<any> {
    return await this.sistemaRobusto.limparLogsAntigos();
  }

  async criarBackup(caminho_destino?: string): Promise<boolean> {
    return await this.sistemaRobusto.criarBackup(caminho_destino);
  }

  async otimizarBanco(): Promise<boolean> {
    return await this.sistemaRobusto.otimizarBanco();
  }

  // Métodos do dashboard
  async obterDashboardExecutivo(): Promise<any> {
    // Implementação básica - pode ser expandida
    return {
      total_operacoes: 0,
      operacoes_sucesso: 0,
      operacoes_erro: 0,
      tempo_medio_resposta: 0
    };
  }

  async obterPerformanceFornecedores(): Promise<any[]> {
    // Implementação básica - pode ser expandida
    return [];
  }

  async obterAlertasAtivos(): Promise<any[]> {
    // Implementação básica - pode ser expandida
    return [];
  }

  async obterEstatisticasAuditoria(dias: number): Promise<any[]> {
    // Implementação básica - pode ser expandida
    return [];
  }

  async obterQueriesLentas(limite: number): Promise<any[]> {
    // Implementação básica - pode ser expandida
    return [];
  }

  // Métodos adicionais que podem estar faltando
  async executarLimpezaLogs(): Promise<any> {
    return await this.limparLogsAntigos();
  }

  async obterConfiguracao(modulo: string, chave: string): Promise<any> {
    const chaveCompleta = `${modulo}.${chave}`;
    return await this.getConfiguracao(chaveCompleta);
  }

  async getConfiguracaoBoolean(chave: string): Promise<boolean> {
    const valor = await this.getConfiguracao(chave);
    return valor === true || valor === 'true' || valor === '1';
  }

  async executarVerificacaoConsistencia(): Promise<any> {
    try {
      // Verificar consistência básica do sistema
      const inconsistencias = [];
      let totalVerificacoes = 0;

      // Verificar se há produtos sem estoque mas com movimentações
      const produtosSemEstoque = await db.query(`
        SELECT p.id, p.nome 
        FROM produtos p
        WHERE NOT EXISTS (
          SELECT 1 FROM estoque_lotes el 
          WHERE el.produto_id = p.id AND el.quantidade_atual > 0
        )
        AND EXISTS (
          SELECT 1 FROM estoque_movimentacoes em 
          WHERE em.produto_id = p.id
        )
      `);

      if (produtosSemEstoque.rows.length > 0) {
        inconsistencias.push({
          tipo: 'PRODUTOS_SEM_ESTOQUE_COM_MOVIMENTACAO',
          quantidade: produtosSemEstoque.rows.length,
          detalhes: produtosSemEstoque.rows
        });
      }
      totalVerificacoes++;

      // Verificar lotes com quantidade negativa
      const lotesNegativos = await db.query(`
        SELECT id, lote, quantidade_atual, produto_id
        FROM estoque_lotes
        WHERE quantidade_atual < 0
      `);

      if (lotesNegativos.rows.length > 0) {
        inconsistencias.push({
          tipo: 'LOTES_COM_QUANTIDADE_NEGATIVA',
          quantidade: lotesNegativos.rows.length,
          detalhes: lotesNegativos.rows
        });
      }
      totalVerificacoes++;

      // Verificar movimentações sem lotes
      const movimentacoesSemLotes = await db.query(`
        SELECT em.id, em.produto_id, em.tipo
        FROM estoque_movimentacoes em
        LEFT JOIN estoque_lotes el ON em.lote_id = el.id
        WHERE em.lote_id IS NOT NULL AND el.id IS NULL
      `);

      if (movimentacoesSemLotes.rows.length > 0) {
        inconsistencias.push({
          tipo: 'MOVIMENTACOES_COM_LOTES_INEXISTENTES',
          quantidade: movimentacoesSemLotes.rows.length,
          detalhes: movimentacoesSemLotes.rows
        });
      }
      totalVerificacoes++;

      return {
        total: totalVerificacoes,
        inconsistencias: inconsistencias.length,
        detalhes: inconsistencias,
        status: inconsistencias.length === 0 ? 'CONSISTENTE' : 'INCONSISTENTE'
      };
    } catch (error) {
      console.error('Erro na verificação de consistência:', error);
      throw new Error('Erro ao executar verificação de consistência');
    }
  }
}
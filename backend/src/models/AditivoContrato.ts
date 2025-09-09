import { Pool } from 'pg';

export interface AditivoContrato {
  id?: number;
  contrato_id: number;
  contrato_produto_id?: number;
  tipo: 'QUANTIDADE' | 'PRAZO';
  quantidade_adicional?: number;
  percentual_aumento?: number;
  dias_adicionais?: number;
  nova_data_fim?: Date;
  justificativa: string;
  numero_aditivo?: string;
  data_assinatura: Date;
  valor_adicional?: number;
  ativo?: boolean;
  created_at?: Date;
  updated_at?: Date;
  created_by?: number;
}

export interface AditivoContratoComDetalhes extends AditivoContrato {
  contrato_numero?: string;
  produto_nome?: string;
  quantidade_original?: number;
  fornecedor_nome?: string;
}

export class AditivoContratoModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Criar um novo aditivo de contrato
   */
  async criar(aditivo: Omit<AditivoContrato, 'id' | 'created_at' | 'updated_at'>): Promise<AditivoContrato> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validações específicas por tipo
      if (aditivo.tipo === 'QUANTIDADE') {
        await this.validarAditivoQuantidade(client, aditivo);
      } else if (aditivo.tipo === 'PRAZO') {
        await this.validarAditivoPrazo(client, aditivo);
      }
      
      // Inserir o aditivo
      const query = `
        INSERT INTO aditivos_contratos (
          contrato_id, numero_aditivo, tipo, percentual_acrescimo,
          valor_aditivo, justificativa, data_assinatura,
          criado_por, observacoes, ativo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        aditivo.contrato_id,
        aditivo.numero_aditivo || null,
        aditivo.tipo || 'PRAZO',
        aditivo.percentual_aumento || 0,
        aditivo.valor_adicional || 0,
        aditivo.justificativa,
        aditivo.data_assinatura,
        aditivo.created_by || null,
        null, // observacoes
        true
      ];
      
      const result = await client.query(query, values);
      const novoAditivo = result.rows[0];
      
      // Atualizar quantidade contratada se for aditivo de quantidade
      if (aditivo.tipo === 'QUANTIDADE' && aditivo.contrato_produto_id && aditivo.quantidade_adicional) {
        await this.atualizarQuantidadeContratada(client, aditivo.contrato_produto_id, aditivo.quantidade_adicional);
      }
      
      // Atualizar data fim do contrato se for aditivo de prazo
      if (aditivo.tipo === 'PRAZO' && aditivo.nova_data_fim) {
        await this.atualizarDataFimContrato(client, aditivo.contrato_id, aditivo.nova_data_fim);
      }
      
      await client.query('COMMIT');
      return novoAditivo;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Listar todos os aditivos
   */
  async listar(): Promise<AditivoContrato[]> {
    const query = `
      SELECT 
        a.id,
        a.contrato_id,
        a.numero_aditivo,
        a.tipo_aditivo as tipo,
        a.percentual_alteracao,
        a.valor_total_aditivo as valor_adicional,
        a.justificativa,
        a.data_aditivo as data_assinatura,
        a.status,
        a.ativo,
        a.created_at,
        a.updated_at,
        c.numero as contrato_numero,
        f.nome as fornecedor_nome
      FROM aditivos_contratos a
      INNER JOIN contratos c ON a.contrato_id = c.id
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE a.ativo = true
      ORDER BY a.created_at DESC
    `;
    
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Validar aditivo de quantidade
   */
  private async validarAditivoQuantidade(client: any, aditivo: AditivoContrato): Promise<void> {
    if (!aditivo.contrato_produto_id || !aditivo.quantidade_adicional) {
      throw new Error('Aditivo de quantidade deve ter contrato_produto_id e quantidade_adicional');
    }

    if (aditivo.quantidade_adicional <= 0) {
      throw new Error('Quantidade adicional deve ser maior que zero');
    }

    // Buscar quantidade original
    const quantidadeQuery = 'SELECT quantidade FROM contrato_produtos WHERE id = $1';
    const quantidadeResult = await client.query(quantidadeQuery, [aditivo.contrato_produto_id]);
    
    if (quantidadeResult.rows.length === 0) {
      throw new Error('Produto do contrato não encontrado');
    }
    
    const quantidadeOriginal = parseFloat(quantidadeResult.rows[0].quantidade);
    
    // Buscar total de aditivos existentes
    const aditivosQuery = `
      SELECT COALESCE(SUM(quantidade_adicional), 0) as total_aditivos
      FROM aditivos_contratos 
      WHERE contrato_produto_id = $1 AND tipo = 'QUANTIDADE' AND ativo = true
    `;
    const aditivosResult = await client.query(aditivosQuery, [aditivo.contrato_produto_id]);
    const totalAditivosExistentes = parseFloat(aditivosResult.rows[0].total_aditivos);
    
    // Calcular percentual total
    const percentualTotal = ((totalAditivosExistentes + aditivo.quantidade_adicional) / quantidadeOriginal) * 100;
    
    if (percentualTotal > 25) {
      throw new Error(`O total de aditivos de quantidade não pode ultrapassar 25% da quantidade original. Tentativa: ${percentualTotal.toFixed(2)}%`);
    }
  }

  /**
   * Validar aditivo de prazo
   */
  private async validarAditivoPrazo(client: any, aditivo: AditivoContrato): Promise<void> {
    if (!aditivo.nova_data_fim && !aditivo.dias_adicionais) {
      throw new Error('Aditivo de prazo deve ter nova_data_fim ou dias_adicionais');
    }

    // Se foi informado dias_adicionais, calcular nova_data_fim
    if (aditivo.dias_adicionais && !aditivo.nova_data_fim) {
      const contratoQuery = 'SELECT data_fim FROM contratos WHERE id = $1';
      const contratoResult = await client.query(contratoQuery, [aditivo.contrato_id]);
      
      if (contratoResult.rows.length === 0) {
        throw new Error('Contrato não encontrado');
      }
      
      const dataFimAtual = new Date(contratoResult.rows[0].data_fim);
      const novaDataFim = new Date(dataFimAtual);
      novaDataFim.setDate(novaDataFim.getDate() + aditivo.dias_adicionais);
      
      aditivo.nova_data_fim = novaDataFim;
    }
  }

  /**
   * Atualizar quantidade contratada do produto
   */
  private async atualizarQuantidadeContratada(client: any, contratoProdutoId: number, quantidadeAdicional: number): Promise<void> {
    const query = `
      UPDATE contrato_produtos 
      SET quantidade = quantidade + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    await client.query(query, [quantidadeAdicional, contratoProdutoId]);
  }

  /**
   * Atualizar data fim do contrato
   */
  private async atualizarDataFimContrato(client: any, contratoId: number, novaDataFim: Date): Promise<void> {
    const query = `
      UPDATE contratos 
      SET data_fim = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    await client.query(query, [novaDataFim, contratoId]);
  }

  /**
   * Listar aditivos de um contrato
   */
  async listarPorContrato(contratoId: number): Promise<AditivoContratoComDetalhes[]> {
    const query = `
      SELECT 
        a.id,
        a.contrato_id,
        a.numero_aditivo,
        a.tipo_aditivo as tipo,
        a.percentual_alteracao,
        a.valor_total_aditivo as valor_adicional,
        a.justificativa,
        a.data_aditivo as data_assinatura,
        a.status,
        a.ativo,
        a.created_at,
        a.updated_at,
        c.numero as contrato_numero,
        f.nome as fornecedor_nome
      FROM aditivos_contratos a
      INNER JOIN contratos c ON a.contrato_id = c.id
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE a.contrato_id = $1 AND a.ativo = true
      ORDER BY a.created_at DESC
    `;
    
    const result = await this.pool.query(query, [contratoId]);
    return result.rows;
  }

  /**
   * Buscar aditivo por ID
   */
  async buscarPorId(id: number): Promise<AditivoContratoComDetalhes | null> {
    const query = `
      SELECT 
        a.*,
        c.numero as contrato_numero,
        f.nome as fornecedor_nome
      FROM aditivos_contratos a
      INNER JOIN contratos c ON a.contrato_id = c.id
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE a.id = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Remover aditivo (soft delete)
   */
  async remover(id: number): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Buscar dados do aditivo antes de remover
      const aditivo = await this.buscarPorId(id);
      if (!aditivo) {
        throw new Error('Aditivo não encontrado');
      }
      
      // Marcar como inativo
      await client.query('UPDATE aditivos_contratos SET ativo = false WHERE id = $1', [id]);
      
      // Reverter alterações se necessário
      if (aditivo.tipo === 'QUANTIDADE' && aditivo.contrato_produto_id && aditivo.quantidade_adicional) {
        await this.atualizarQuantidadeContratada(client, aditivo.contrato_produto_id, -aditivo.quantidade_adicional);
      }
      
      if (aditivo.tipo === 'PRAZO') {
        // Para aditivos de prazo, seria necessário calcular a data anterior
        // Por simplicidade, vamos apenas marcar como inativo
        console.log('Aditivo de prazo removido. Revisar data fim do contrato manualmente se necessário.');
      }
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calcular resumo de aditivos por contrato
   */
  async calcularResumoAditivos(contratoId: number): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_aditivos,
        COUNT(CASE WHEN tipo = 'QUANTIDADE' THEN 1 END) as aditivos_quantidade,
        COUNT(CASE WHEN tipo = 'PRAZO' THEN 1 END) as aditivos_prazo,
        COALESCE(SUM(CASE WHEN tipo = 'QUANTIDADE' THEN quantidade_adicional END), 0) as total_quantidade_adicional,
        COALESCE(SUM(valor_adicional), 0) as total_valor_adicional
      FROM aditivos_contratos 
      WHERE contrato_id = $1 AND ativo = true
    `;
    
    const result = await this.pool.query(query, [contratoId]);
    return result.rows[0];
  }
}
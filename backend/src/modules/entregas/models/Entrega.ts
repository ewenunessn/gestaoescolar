import db from '../../../database';
import type { PoolClient } from 'pg';
import HistoricoEntregaModel from './HistoricoEntrega';
import estoqueLedgerService from '../../estoque/services/estoqueLedgerService';

export interface EscolaEntrega {
  id: number;
  nome: string;
  endereco?: string;
  telefone?: string;
  total_itens: number;
  itens_entregues: number;
  percentual_entregue: number;
  data_entrega?: string;
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
  quantidade_entregue?: number; // Mantido para compatibilidade
  quantidade_total_entregue?: number; // Nova: soma de todas as entregas
  data_entrega?: string;
  nome_quem_recebeu?: string;
  nome_quem_entregou?: string;
  observacao_entrega?: string;
  assinatura_base64?: string;
  latitude?: number;
  longitude?: number;
  precisao_gps?: number;
  produto_nome: string;
  produto_unidade: string;
  mes: number;
  ano: number;
  guia_observacao?: string;
}

export interface ConfirmarEntregaData {
  quantidade_entregue: number;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  observacao?: string | null;
  assinatura_base64?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  precisao_gps?: number | null;
}

class EntregaModel {
  async listarEscolasComEntregas(guiaId?: number, rotaId?: number, dataEntrega?: string, dataInicio?: string, dataFim?: string, somentePendentes?: boolean): Promise<EscolaEntrega[]> {
    let whereClause = 'WHERE gpe.para_entrega = true AND g.status = \'aberta\'';
    const params = [];
    let paramCount = 1;

    if (guiaId) {
      whereClause += ` AND g.id = $${paramCount}`;
      params.push(guiaId);
      paramCount++;
    }

    if (rotaId) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM rota_escolas re 
        WHERE re.escola_id = e.id AND re.rota_id = $${paramCount}
      )`;
      params.push(rotaId);
      paramCount++;
    }

    if (dataEntrega) {
      whereClause += ` AND DATE(gpe.data_entrega) = $${paramCount}`;
      params.push(dataEntrega);
      paramCount++;
    }
    if (!dataEntrega && dataInicio) {
      whereClause += ` AND DATE(gpe.data_entrega) >= $${paramCount}`;
      params.push(dataInicio);
      paramCount++;
    }
    if (!dataEntrega && dataFim) {
      whereClause += ` AND DATE(gpe.data_entrega) <= $${paramCount}`;
      params.push(dataFim);
      paramCount++;
    }

    if (somentePendentes) {
      whereClause += ` AND gpe.entrega_confirmada = false AND gpe.status = 'pendente'`;
    }

    const result = await db.query(`
      SELECT
        e.id,
        e.nome,
        e.endereco,
        e.telefone,
        COUNT(gpe.id) as total_itens,
        SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) as itens_entregues,
        ROUND(
          (SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) * 100.0) / COUNT(gpe.id),
          2
        ) as percentual_entregue,
        MIN(DATE(gpe.data_entrega)) as data_entrega,
        COALESCE(er.ordem, 999) as ordem_rota,
        er.rota_nome,
        er.rota_id,
        COALESCE(alunos.total_alunos, 0) as total_alunos
      FROM escolas e
      INNER JOIN guia_produto_escola gpe ON e.id = gpe.escola_id
      INNER JOIN guias g ON gpe.guia_id = g.id
      -- Rota principal da escola
      LEFT JOIN LATERAL (
        SELECT re.ordem, rot.nome as rota_nome, rot.id as rota_id
        FROM rota_escolas re
        INNER JOIN rotas_entrega rot ON rot.id = re.rota_id
        WHERE re.escola_id = e.id
          ${rotaId ? `AND re.rota_id = ${rotaId}` : ''}
        ORDER BY re.ordem ASC
        LIMIT 1
      ) er ON true
      -- Total de alunos somando todas as modalidades da escola
      LEFT JOIN LATERAL (
        SELECT SUM(em.quantidade_alunos) as total_alunos
        FROM escola_modalidades em
        WHERE em.escola_id = e.id
      ) alunos ON true
      ${whereClause}
      GROUP BY e.id, e.nome, e.endereco, e.telefone, er.ordem, er.rota_nome, er.rota_id, alunos.total_alunos
      ORDER BY COALESCE(er.ordem, 999), e.nome
    `, params);
    return result.rows;
  }

  async listarItensEntregaPorEscola(escolaId: number, guiaId?: number, dataEntrega?: string, dataInicio?: string, dataFim?: string, somentePendentes?: boolean): Promise<ItemEntrega[]> {
    let whereClause = 'WHERE gpe.escola_id = $1 AND gpe.para_entrega = true AND g.status = \'aberta\'';
    const params: Array<number | string> = [escolaId];
    let paramCount = 2;

    if (guiaId) {
      whereClause += ` AND g.id = $${paramCount}`;
      params.push(guiaId);
      paramCount++;
    }

    if (dataEntrega) {
      whereClause += ` AND DATE(gpe.data_entrega) = $${paramCount}`;
      params.push(dataEntrega);
      paramCount++;
    }
    if (!dataEntrega && dataInicio) {
      whereClause += ` AND DATE(gpe.data_entrega) >= $${paramCount}`;
      params.push(dataInicio);
      paramCount++;
    }
    if (!dataEntrega && dataFim) {
      whereClause += ` AND DATE(gpe.data_entrega) <= $${paramCount}`;
      params.push(dataFim);
      paramCount++;
    }

    if (somentePendentes) {
      whereClause += ` AND gpe.entrega_confirmada = false AND gpe.status = 'pendente'`;
    }
    // Não aplicar filtro de status quando não for "somente pendentes"
    // Isso permite mostrar todos os itens: pendentes, parciais e entregues

    const result = await db.query(`
      SELECT 
        gpe.id,
        gpe.guia_id,
        gpe.produto_id,
        gpe.escola_id,
        gpe.quantidade,
        gpe.unidade,
        gpe.lote,
        gpe.observacao,
        gpe.entrega_confirmada,
        gpe.para_entrega,
        gpe.status,
        gpe.data_entrega,
        gpe.nome_quem_recebeu,
        gpe.nome_quem_entregou,
        -- Campos de snapshot da escola
        gpe.escola_nome,
        gpe.escola_endereco,
        gpe.escola_municipio,
        gpe.escola_total_alunos,
        gpe.escola_modalidades,
        gpe.escola_snapshot_data,
        p.nome as produto_nome,
        gpe.unidade as produto_unidade,
        g.mes,
        g.ano,
        g.codigo_guia,
        g.observacao as guia_observacao,
        COALESCE(gpe.quantidade_total_entregue, 0) as quantidade_ja_entregue,
        (gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0)) as saldo_pendente,
        -- Buscar a última entrega do histórico
        (
          SELECT json_agg(
            json_build_object(
              'id', he.id,
              'quantidade_entregue', he.quantidade_entregue,
              'data_entrega', he.data_entrega,
              'nome_quem_entregou', he.nome_quem_entregou,
              'nome_quem_recebeu', he.nome_quem_recebeu,
              'observacao', he.observacao
            ) ORDER BY he.data_entrega DESC
          )
          FROM historico_entregas he
          WHERE he.guia_produto_escola_id = gpe.id
        ) as historico_entregas
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN guias g ON gpe.guia_id = g.id
      ${whereClause}
      ORDER BY 
        gpe.entrega_confirmada ASC,
        g.mes DESC, 
        g.ano DESC, 
        p.nome, 
        gpe.lote
    `, params);
    return result.rows;
  }

  async buscarItemEntrega(
    itemId: number,
    client?: PoolClient,
    lockRow = false,
  ): Promise<ItemEntrega | null> {
    const query = client ? client.query.bind(client) : db.query;
    const result = await query(`
      SELECT 
        gpe.*,
        p.nome as produto_nome,
        gpe.unidade as produto_unidade,
        g.mes,
        g.ano,
        g.observacao as guia_observacao,
        e.nome as escola_nome
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN guias g ON gpe.guia_id = g.id
      INNER JOIN escolas e ON gpe.escola_id = e.id
      WHERE gpe.id = $1
      ${lockRow ? 'FOR UPDATE OF gpe' : ''}
    `, [itemId]);
    return result.rows[0] || null;
  }

  async confirmarEntrega(itemId: number, dados: ConfirmarEntregaData): Promise<ItemEntrega & { historico_id?: number }> {
    return db.transaction(async (client) => {
      const item = await this.buscarItemEntrega(itemId, client, true);
      if (!item) {
        throw new Error('Item nao encontrado');
      }

      if (!item.para_entrega) {
        throw new Error('Este item nao esta marcado para entrega');
      }

      const saldoPendente = Number(item.quantidade) - Number(item.quantidade_total_entregue || 0);
      if (dados.quantidade_entregue > saldoPendente) {
        throw new Error(
          `Quantidade a entregar (${dados.quantidade_entregue}) e maior que o saldo pendente (${saldoPendente})`
        );
      }

      await estoqueLedgerService.registrarTransferenciaParaEscolaWithClient(client, {
        escola_id: Number(item.escola_id),
        produto_id: Number(item.produto_id),
        quantidade: Number(dados.quantidade_entregue),
        motivo: dados.observacao || 'Entrega confirmada',
        observacao: dados.observacao || undefined,
        referencia_tipo: 'guia_produto_escola',
        referencia_id: Number(itemId),
        usuario_nome_snapshot: dados.nome_quem_entregou,
      });

      const historico = await HistoricoEntregaModel.criar({
        guia_produto_escola_id: itemId,
        quantidade_entregue: dados.quantidade_entregue,
        nome_quem_entregou: dados.nome_quem_entregou,
        nome_quem_recebeu: dados.nome_quem_recebeu,
        observacao: dados.observacao,
        assinatura_base64: dados.assinatura_base64,
        latitude: dados.latitude,
        longitude: dados.longitude,
        precisao_gps: dados.precisao_gps
      }, client);

      const updatedItem = await this.buscarItemEntrega(itemId, client);
      if (!updatedItem) {
        throw new Error('Erro ao buscar item atualizado');
      }

      return {
        ...updatedItem,
        historico_id: historico.id
      };
    });
  }

  async cancelarEntrega(itemId: number): Promise<ItemEntrega> {
    return db.transaction(async (client) => {
      const item = await this.buscarItemEntrega(itemId, client, true);
      if (!item) {
        throw new Error('Item nao encontrado');
      }

      const historicoResult = await client.query(`
        SELECT COALESCE(SUM(quantidade_entregue), 0) AS quantidade_entregue
        FROM historico_entregas
        WHERE guia_produto_escola_id = $1
      `, [itemId]);
      const quantidadeEntregue = Number(historicoResult.rows[0]?.quantidade_entregue ?? 0);

      if (quantidadeEntregue <= 0) {
        throw new Error('Este item nao foi entregue ainda');
      }

      const saldoEscola = await estoqueLedgerService.getCurrentBalanceWithClient(
        client,
        'escola',
        Number(item.produto_id),
        Number(item.escola_id),
      );
      if (saldoEscola < quantidadeEntregue) {
        throw new Error('Saldo escolar insuficiente para estornar esta entrega');
      }

      await estoqueLedgerService.appendEventWithClient(client, {
        escopo: 'escola',
        escola_id: Number(item.escola_id),
        produto_id: Number(item.produto_id),
        tipo_evento: 'estorno_evento',
        origem: 'estorno',
        quantidade_delta: quantidadeEntregue * -1,
        motivo: 'Cancelamento de entrega',
        referencia_tipo: 'guia_produto_escola',
        referencia_id: Number(itemId),
      });

      await estoqueLedgerService.appendEventWithClient(client, {
        escopo: 'central',
        produto_id: Number(item.produto_id),
        tipo_evento: 'estorno_evento',
        origem: 'estorno',
        quantidade_delta: quantidadeEntregue,
        motivo: 'Cancelamento de entrega',
        referencia_tipo: 'guia_produto_escola',
        referencia_id: Number(itemId),
      });

      await client.query(`
        DELETE FROM historico_entregas
        WHERE guia_produto_escola_id = $1
      `, [itemId]);

      await client.query(`
        UPDATE guia_produto_escola
        SET
          entrega_confirmada = false,
          status = 'pendente',
          quantidade_total_entregue = 0,
          quantidade_entregue = NULL,
          data_entrega = NULL,
          nome_quem_entregou = NULL,
          nome_quem_recebeu = NULL,
          observacao_entrega = NULL,
          latitude = NULL,
          longitude = NULL,
          precisao_gps = NULL,
          updated_at = NOW()
        WHERE id = $1
      `, [itemId]);

      const updatedItem = await this.buscarItemEntrega(itemId, client);
      if (!updatedItem) {
        throw new Error('Erro ao buscar item atualizado');
      }
      return updatedItem;
    });
  }

  async obterEstatisticasEntregas(guiaId?: number, rotaId?: number, dataEntrega?: string, dataInicio?: string, dataFim?: string, somentePendentes?: boolean): Promise<any> {
    let whereClause = 'WHERE gpe.para_entrega = true AND g.status = \'aberta\'';
    const params = [];
    let paramCount = 1;

    if (guiaId) {
      whereClause += ` AND g.id = $${paramCount}`;
      params.push(guiaId);
      paramCount++;
    }

    if (rotaId) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM rota_escolas re 
        WHERE re.escola_id = gpe.escola_id AND re.rota_id = $${paramCount}
      )`;
      params.push(rotaId);
      paramCount++;
    }

    if (dataEntrega) {
      whereClause += ` AND DATE(gpe.data_entrega) = $${paramCount}`;
      params.push(dataEntrega);
      paramCount++;
    }
    if (!dataEntrega && dataInicio) {
      whereClause += ` AND DATE(gpe.data_entrega) >= $${paramCount}`;
      params.push(dataInicio);
      paramCount++;
    }
    if (!dataEntrega && dataFim) {
      whereClause += ` AND DATE(gpe.data_entrega) <= $${paramCount}`;
      params.push(dataFim);
      paramCount++;
    }

    if (somentePendentes) {
      whereClause += ` AND gpe.entrega_confirmada = false AND gpe.status = 'pendente'`;
    }

    const result = await db.query(`
      SELECT 
        COUNT(DISTINCT gpe.escola_id) as total_escolas,
        COUNT(gpe.id) as total_itens,
        SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) as itens_entregues,
        SUM(CASE WHEN gpe.entrega_confirmada = false THEN 1 ELSE 0 END) as itens_pendentes,
        ROUND(
          (SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) * 100.0) / COUNT(gpe.id), 
          2
        ) as percentual_entregue
      FROM guia_produto_escola gpe
      INNER JOIN guias g ON gpe.guia_id = g.id
      ${whereClause}
    `, params);
    return result.rows[0];
  }
}

export default new EntregaModel();

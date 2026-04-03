import { Request, Response } from 'express';
import db from '../../../database';

// Listar todos os anos letivos
export const listarCalendariosLetivos = async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        cl.*,
        (SELECT COUNT(*) FROM periodos_avaliativos WHERE calendario_letivo_id = cl.id) as total_periodos,
        (SELECT COUNT(*) FROM eventos_calendario WHERE calendario_letivo_id = cl.id) as total_eventos
      FROM calendario_letivo cl
      ORDER BY cl.ano_letivo DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Erro ao listar calendários letivos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar calendários letivos',
      error: error.message
    });
  }
};

// Buscar calendário letivo por ID
export const buscarCalendarioLetivo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT * FROM calendario_letivo WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendário letivo não encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao buscar calendário letivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar calendário letivo',
      error: error.message
    });
  }
};

// Buscar calendário letivo ativo
export const buscarCalendarioLetivoAtivo = async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT * FROM calendario_letivo WHERE ativo = true ORDER BY ano_letivo DESC LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum calendário letivo ativo encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao buscar calendário letivo ativo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar calendário letivo ativo',
      error: error.message
    });
  }
};

// Buscar calendário letivo por período
export const buscarCalendarioPorPeriodo = async (req: Request, res: Response) => {
  try {
    const { periodo_id } = req.params;

    // Buscar o período para pegar o ano
    const periodo = await db.query(`
      SELECT ano FROM periodos WHERE id = $1
    `, [periodo_id]);

    if (periodo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Período não encontrado'
      });
    }

    const ano = periodo.rows[0].ano;

    // Buscar calendário do ano
    const result = await db.query(`
      SELECT * FROM calendario_letivo WHERE ano_letivo = $1
    `, [ano]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Nenhum calendário letivo encontrado para o ano ${ano}`
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao buscar calendário por período:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar calendário por período',
      error: error.message
    });
  }
};

// Criar novo calendário letivo
export const criarCalendarioLetivo = async (req: Request, res: Response) => {
  try {
    const {
      ano_letivo,
      data_inicio,
      data_fim,
      total_dias_letivos_obrigatorio,
      divisao_ano,
      dias_semana_letivos,
      ativo
    } = req.body;

    // Validações
    if (!ano_letivo || !data_inicio || !data_fim) {
      return res.status(400).json({
        success: false,
        message: 'Ano letivo, data de início e data de fim são obrigatórios'
      });
    }

    // Verificar se já existe calendário para este ano
    const existente = await db.query(
      'SELECT id FROM calendario_letivo WHERE ano_letivo = $1',
      [ano_letivo]
    );

    if (existente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um calendário letivo para este ano'
      });
    }

    // Se este calendário for ativo, desativar os outros
    if (ativo) {
      await db.query('UPDATE calendario_letivo SET ativo = false');
    }

    const result = await db.query(`
      INSERT INTO calendario_letivo (
        ano_letivo, data_inicio, data_fim, total_dias_letivos_obrigatorio,
        divisao_ano, dias_semana_letivos, ativo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      ano_letivo,
      data_inicio,
      data_fim,
      total_dias_letivos_obrigatorio || 200,
      divisao_ano || 'bimestral',
      JSON.stringify(dias_semana_letivos || ['seg', 'ter', 'qua', 'qui', 'sex']),
      ativo !== undefined ? ativo : true
    ]);

    res.status(201).json({
      success: true,
      message: 'Calendário letivo criado com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao criar calendário letivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar calendário letivo',
      error: error.message
    });
  }
};

// Atualizar calendário letivo
export const atualizarCalendarioLetivo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      ano_letivo,
      data_inicio,
      data_fim,
      total_dias_letivos_obrigatorio,
      divisao_ano,
      dias_semana_letivos,
      ativo
    } = req.body;

    // Se este calendário for ativo, desativar os outros
    if (ativo) {
      await db.query('UPDATE calendario_letivo SET ativo = false WHERE id != $1', [id]);
    }

    const result = await db.query(`
      UPDATE calendario_letivo SET
        ano_letivo = COALESCE($1, ano_letivo),
        data_inicio = COALESCE($2, data_inicio),
        data_fim = COALESCE($3, data_fim),
        total_dias_letivos_obrigatorio = COALESCE($4, total_dias_letivos_obrigatorio),
        divisao_ano = COALESCE($5, divisao_ano),
        dias_semana_letivos = COALESCE($6, dias_semana_letivos),
        ativo = COALESCE($7, ativo)
      WHERE id = $8
      RETURNING *
    `, [
      ano_letivo,
      data_inicio,
      data_fim,
      total_dias_letivos_obrigatorio,
      divisao_ano,
      dias_semana_letivos ? JSON.stringify(dias_semana_letivos) : null,
      ativo,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendário letivo não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Calendário letivo atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao atualizar calendário letivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar calendário letivo',
      error: error.message
    });
  }
};

// Excluir calendário letivo
export const excluirCalendarioLetivo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM calendario_letivo WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendário letivo não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Calendário letivo excluído com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao excluir calendário letivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir calendário letivo',
      error: error.message
    });
  }
};

// Calcular dias letivos
export const calcularDiasLetivos = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Buscar calendário
    const calendario = await db.query(
      'SELECT * FROM calendario_letivo WHERE id = $1',
      [id]
    );

    if (calendario.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendário letivo não encontrado'
      });
    }

    const cal = calendario.rows[0];
    const dataInicio = new Date(cal.data_inicio);
    const dataFim = new Date(cal.data_fim);
    const diasSemanaLetivos = cal.dias_semana_letivos;

    // Buscar exceções
    const excecoes = await db.query(
      'SELECT data, eh_letivo FROM dias_letivos_excecoes WHERE calendario_letivo_id = $1',
      [id]
    );

    const excecoesMap = new Map();
    excecoes.rows.forEach(exc => {
      excecoesMap.set(exc.data.toISOString().split('T')[0], exc.eh_letivo);
    });

    // Buscar eventos que tornam dias não letivos
    const eventosNaoLetivos = await db.query(`
      SELECT data_inicio, data_fim FROM eventos_calendario 
      WHERE calendario_letivo_id = $1 
      AND tipo_evento IN ('feriado_nacional', 'feriado_estadual', 'feriado_municipal', 'feriado_escolar', 'recesso', 'ferias')
    `, [id]);

    const diasNaoLetivos = new Set();
    eventosNaoLetivos.rows.forEach(evento => {
      const inicio = new Date(evento.data_inicio);
      const fim = evento.data_fim ? new Date(evento.data_fim) : inicio;
      
      for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        diasNaoLetivos.add(d.toISOString().split('T')[0]);
      }
    });

    // Mapear dias da semana
    const diasSemanaMap: { [key: string]: number } = {
      'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6
    };

    const diasLetivosNumeros = diasSemanaLetivos.map((d: string) => diasSemanaMap[d]);

    // Contar dias letivos
    let totalDiasLetivos = 0;
    const diasLetivosDetalhados = [];

    for (let d = new Date(dataInicio); d <= dataFim; d.setDate(d.getDate() + 1)) {
      const dataStr = d.toISOString().split('T')[0];
      const diaSemana = d.getDay();
      
      // Verificar se tem exceção
      if (excecoesMap.has(dataStr)) {
        if (excecoesMap.get(dataStr)) {
          totalDiasLetivos++;
          diasLetivosDetalhados.push({ data: dataStr, motivo: 'excecao_letivo' });
        }
        continue;
      }

      // Verificar se é evento não letivo
      if (diasNaoLetivos.has(dataStr)) {
        continue;
      }

      // Verificar se é dia da semana letivo
      if (diasLetivosNumeros.includes(diaSemana)) {
        totalDiasLetivos++;
        diasLetivosDetalhados.push({ data: dataStr, motivo: 'dia_normal' });
      }
    }

    res.json({
      success: true,
      data: {
        total_dias_letivos: totalDiasLetivos,
        total_obrigatorio: cal.total_dias_letivos_obrigatorio,
        diferenca: totalDiasLetivos - cal.total_dias_letivos_obrigatorio,
        atende_minimo: totalDiasLetivos >= cal.total_dias_letivos_obrigatorio,
        dias_letivos: diasLetivosDetalhados
      }
    });
  } catch (error: any) {
    console.error('Erro ao calcular dias letivos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular dias letivos',
      error: error.message
    });
  }
};


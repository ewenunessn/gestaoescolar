import { Request, Response } from 'express';
import db from '../../../database';

// Listar períodos avaliativos
export const listarPeriodos = async (req: Request, res: Response) => {
  try {
    const { calendario_id } = req.params;

    const result = await db.query(`
      SELECT * FROM periodos_avaliativos
      WHERE calendario_letivo_id = $1
      ORDER BY numero_periodo ASC
    `, [calendario_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Erro ao listar períodos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar períodos',
      error: error.message
    });
  }
};

// Criar período avaliativo
export const criarPeriodo = async (req: Request, res: Response) => {
  try {
    const {
      calendario_letivo_id,
      nome,
      numero_periodo,
      data_inicio,
      data_fim,
      data_entrega_notas
    } = req.body;

    if (!calendario_letivo_id || !nome || !numero_periodo || !data_inicio || !data_fim) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos obrigatórios devem ser preenchidos'
      });
    }

    const result = await db.query(`
      INSERT INTO periodos_avaliativos (
        calendario_letivo_id, nome, numero_periodo, data_inicio, data_fim, data_entrega_notas
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [calendario_letivo_id, nome, numero_periodo, data_inicio, data_fim, data_entrega_notas]);

    res.status(201).json({
      success: true,
      message: 'Período criado com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao criar período:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar período',
      error: error.message
    });
  }
};

// Atualizar período avaliativo
export const atualizarPeriodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, data_inicio, data_fim, data_entrega_notas } = req.body;

    const result = await db.query(`
      UPDATE periodos_avaliativos SET
        nome = COALESCE($1, nome),
        data_inicio = COALESCE($2, data_inicio),
        data_fim = COALESCE($3, data_fim),
        data_entrega_notas = COALESCE($4, data_entrega_notas)
      WHERE id = $5
      RETURNING *
    `, [nome, data_inicio, data_fim, data_entrega_notas, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Período não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Período atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao atualizar período:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar período',
      error: error.message
    });
  }
};

// Excluir período avaliativo
export const excluirPeriodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM periodos_avaliativos WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Período não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Período excluído com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao excluir período:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir período',
      error: error.message
    });
  }
};

// Gerar períodos automaticamente
export const gerarPeriodosAutomaticamente = async (req: Request, res: Response) => {
  try {
    const { calendario_id } = req.params;

    // Buscar calendário
    const calendario = await db.query(
      'SELECT * FROM calendario_letivo WHERE id = $1',
      [calendario_id]
    );

    if (calendario.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendário não encontrado'
      });
    }

    const cal = calendario.rows[0];
    const dataInicio = new Date(cal.data_inicio);
    const dataFim = new Date(cal.data_fim);
    const divisao = cal.divisao_ano;

    // Calcular número de períodos
    const numeroPeriodos = divisao === 'bimestral' ? 4 : divisao === 'trimestral' ? 3 : 2;
    const diasTotais = Math.floor((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasPorPeriodo = Math.floor(diasTotais / numeroPeriodos);

    const periodos = [];
    let dataAtual = new Date(dataInicio);

    for (let i = 1; i <= numeroPeriodos; i++) {
      const inicioPeriodo = new Date(dataAtual);
      dataAtual.setDate(dataAtual.getDate() + diasPorPeriodo);
      
      // Último período vai até o fim
      const fimPeriodo = i === numeroPeriodos ? new Date(dataFim) : new Date(dataAtual);
      fimPeriodo.setDate(fimPeriodo.getDate() - 1);

      const nomePeriodo = divisao === 'bimestral' ? `${i}º Bimestre` :
                         divisao === 'trimestral' ? `${i}º Trimestre` : `${i}º Semestre`;

      periodos.push({
        nome: nomePeriodo,
        numero_periodo: i,
        data_inicio: inicioPeriodo.toISOString().split('T')[0],
        data_fim: fimPeriodo.toISOString().split('T')[0]
      });
    }

    // Inserir períodos
    for (const periodo of periodos) {
      await db.query(`
        INSERT INTO periodos_avaliativos (
          calendario_letivo_id, nome, numero_periodo, data_inicio, data_fim
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (calendario_letivo_id, numero_periodo) DO UPDATE SET
          nome = EXCLUDED.nome,
          data_inicio = EXCLUDED.data_inicio,
          data_fim = EXCLUDED.data_fim
      `, [calendario_id, periodo.nome, periodo.numero_periodo, periodo.data_inicio, periodo.data_fim]);
    }

    res.json({
      success: true,
      message: `${numeroPeriodos} períodos gerados com sucesso`,
      data: periodos
    });
  } catch (error: any) {
    console.error('Erro ao gerar períodos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar períodos',
      error: error.message
    });
  }
};

// Listar exceções de dias letivos
export const listarExcecoes = async (req: Request, res: Response) => {
  try {
    const { calendario_id } = req.params;

    const result = await db.query(`
      SELECT * FROM dias_letivos_excecoes
      WHERE calendario_letivo_id = $1
      ORDER BY data ASC
    `, [calendario_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Erro ao listar exceções:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar exceções',
      error: error.message
    });
  }
};

// Criar exceção de dia letivo
export const criarExcecao = async (req: Request, res: Response) => {
  try {
    const { calendario_letivo_id, data, eh_letivo, motivo } = req.body;

    if (!calendario_letivo_id || !data || eh_letivo === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Calendário, data e tipo (letivo/não letivo) são obrigatórios'
      });
    }

    const result = await db.query(`
      INSERT INTO dias_letivos_excecoes (calendario_letivo_id, data, eh_letivo, motivo)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (calendario_letivo_id, data) DO UPDATE SET
        eh_letivo = EXCLUDED.eh_letivo,
        motivo = EXCLUDED.motivo
      RETURNING *
    `, [calendario_letivo_id, data, eh_letivo, motivo]);

    res.status(201).json({
      success: true,
      message: 'Exceção criada com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao criar exceção:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar exceção',
      error: error.message
    });
  }
};

// Excluir exceção
export const excluirExcecao = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM dias_letivos_excecoes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exceção não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Exceção excluída com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao excluir exceção:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir exceção',
      error: error.message
    });
  }
};


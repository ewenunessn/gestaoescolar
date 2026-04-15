import { Request, Response } from 'express';
import db from '../../../database';

// Listar eventos de um calendário
export const listarEventos = async (req: Request, res: Response) => {
  try {
    const { calendario_id } = req.params;
    const { tipo_evento, data_inicio, data_fim } = req.query;

    let query = `
      SELECT 
        ec.*,
        u.nome as criado_por_nome
      FROM eventos_calendario ec
      LEFT JOIN usuarios u ON ec.criado_por = u.id
      WHERE ec.calendario_letivo_id = $1
    `;
    
    const params: any[] = [calendario_id];
    let paramIndex = 2;

    if (tipo_evento) {
      query += ` AND ec.tipo_evento = $${paramIndex}`;
      params.push(tipo_evento);
      paramIndex++;
    }

    if (data_inicio) {
      query += ` AND ec.data_inicio >= $${paramIndex}`;
      params.push(data_inicio);
      paramIndex++;
    }

    if (data_fim) {
      query += ` AND ec.data_fim <= $${paramIndex}`;
      params.push(data_fim);
      paramIndex++;
    }

    query += ' ORDER BY ec.data_inicio ASC';

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Erro ao listar eventos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar eventos',
      error: error.message
    });
  }
};

// Buscar evento por ID
export const buscarEvento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        ec.*,
        u.nome as criado_por_nome
      FROM eventos_calendario ec
      LEFT JOIN usuarios u ON ec.criado_por = u.id
      WHERE ec.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento não encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao buscar evento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar evento',
      error: error.message
    });
  }
};

// Criar novo evento
export const criarEvento = async (req: Request, res: Response) => {
  try {
    const {
      calendario_letivo_id,
      titulo,
      descricao,
      tipo_evento,
      data_inicio,
      data_fim,
      hora_inicio,
      hora_fim,
      local,
      responsavel,
      cor,
      recorrente,
      recorrencia_config,
      observacoes,
      anexos
    } = req.body;

    const usuario_id = req.usuario?.id;

    // Validações
    if (!titulo || !tipo_evento || !data_inicio) {
      return res.status(400).json({
        success: false,
        message: 'Título, tipo de evento e data de início são obrigatórios'
      });
    }

    // Tratar campos vazios como null
    const dataFimFinal = data_fim && data_fim !== '' ? data_fim : null;
    const horaInicioFinal = hora_inicio && hora_inicio !== '' ? hora_inicio : null;
    const horaFimFinal = hora_fim && hora_fim !== '' ? hora_fim : null;
    const localFinal = local && local !== '' ? local : null;
    const responsavelFinal = responsavel && responsavel !== '' ? responsavel : null;
    const descricaoFinal = descricao && descricao !== '' ? descricao : null;
    const observacoesFinal = observacoes && observacoes !== '' ? observacoes : null;

    const result = await db.query(`
      INSERT INTO eventos_calendario (
        calendario_letivo_id, titulo, descricao, tipo_evento,
        data_inicio, data_fim, hora_inicio, hora_fim,
        local, responsavel, cor, recorrente, recorrencia_config,
        observacoes, anexos, criado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      calendario_letivo_id || null,
      titulo,
      descricaoFinal,
      tipo_evento,
      data_inicio,
      dataFimFinal,
      horaInicioFinal,
      horaFimFinal,
      localFinal,
      responsavelFinal,
      cor || '#3788d8',
      recorrente || false,
      recorrencia_config ? JSON.stringify(recorrencia_config) : null,
      observacoesFinal,
      anexos ? JSON.stringify(anexos) : null,
      usuario_id || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Evento criado com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao criar evento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar evento',
      error: error.message
    });
  }
};

// Atualizar evento
export const atualizarEvento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descricao,
      tipo_evento,
      data_inicio,
      data_fim,
      hora_inicio,
      hora_fim,
      local,
      responsavel,
      cor,
      recorrente,
      recorrencia_config,
      observacoes,
      anexos
    } = req.body;

    const result = await db.query(`
      UPDATE eventos_calendario SET
        titulo = COALESCE($1, titulo),
        descricao = COALESCE($2, descricao),
        tipo_evento = COALESCE($3, tipo_evento),
        data_inicio = COALESCE($4, data_inicio),
        data_fim = COALESCE($5, data_fim),
        hora_inicio = COALESCE($6, hora_inicio),
        hora_fim = COALESCE($7, hora_fim),
        local = COALESCE($8, local),
        responsavel = COALESCE($9, responsavel),
        cor = COALESCE($10, cor),
        recorrente = COALESCE($11, recorrente),
        recorrencia_config = COALESCE($12, recorrencia_config),
        observacoes = COALESCE($13, observacoes),
        anexos = COALESCE($14, anexos)
      WHERE id = $15
      RETURNING *
    `, [
      titulo,
      descricao,
      tipo_evento,
      data_inicio,
      data_fim,
      hora_inicio,
      hora_fim,
      local,
      responsavel,
      cor,
      recorrente,
      recorrencia_config ? JSON.stringify(recorrencia_config) : null,
      observacoes,
      anexos ? JSON.stringify(anexos) : null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Evento atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao atualizar evento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar evento',
      error: error.message
    });
  }
};

// Excluir evento
export const excluirEvento = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM eventos_calendario WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evento não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Evento excluído com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao excluir evento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir evento',
      error: error.message
    });
  }
};

// Listar eventos por mês (sem precisar de calendário específico)
export const listarEventosPorMes = async (req: Request, res: Response) => {
  try {
    const { calendario_id, ano, mes } = req.params;

    const primeiroDia = `${ano}-${mes.padStart(2, '0')}-01`;
    const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
    const ultimaData = `${ano}-${mes.padStart(2, '0')}-${ultimoDia}`;

    let query = `
      SELECT 
        ec.*,
        u.nome as criado_por_nome
      FROM eventos_calendario ec
      LEFT JOIN usuarios u ON ec.criado_por = u.id
      WHERE (
        (ec.data_inicio >= $1 AND ec.data_inicio <= $2)
        OR (ec.data_fim >= $1 AND ec.data_fim <= $2)
        OR (ec.data_inicio <= $1 AND ec.data_fim >= $2)
      )
    `;

    const params: any[] = [primeiroDia, ultimaData];

    // Se calendario_id for fornecido e diferente de 0, filtrar por ele
    if (calendario_id && parseInt(calendario_id) !== 0) {
      query += ` AND ec.calendario_letivo_id = $3`;
      params.push(calendario_id);
    }

    query += ` ORDER BY ec.data_inicio ASC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Erro ao listar eventos por mês:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar eventos por mês',
      error: error.message
    });
  }
};

// Importar feriados nacionais
export const importarFeriadosNacionais = async (req: Request, res: Response) => {
  try {
    const { calendario_id, ano } = req.body;

    // Feriados nacionais fixos e móveis do Brasil
    const feriados = [
      { data: `${ano}-01-01`, titulo: 'Confraternização Universal', tipo: 'feriado_nacional' },
      { data: `${ano}-04-21`, titulo: 'Tiradentes', tipo: 'feriado_nacional' },
      { data: `${ano}-05-01`, titulo: 'Dia do Trabalho', tipo: 'feriado_nacional' },
      { data: `${ano}-09-07`, titulo: 'Independência do Brasil', tipo: 'feriado_nacional' },
      { data: `${ano}-10-12`, titulo: 'Nossa Senhora Aparecida', tipo: 'feriado_nacional' },
      { data: `${ano}-11-02`, titulo: 'Finados', tipo: 'feriado_nacional' },
      { data: `${ano}-11-15`, titulo: 'Proclamação da República', tipo: 'feriado_nacional' },
      { data: `${ano}-11-20`, titulo: 'Consciência Negra', tipo: 'feriado_nacional' },
      { data: `${ano}-12-25`, titulo: 'Natal', tipo: 'feriado_nacional' }
    ];

    const usuario_id = req.usuario?.id;
    let importados = 0;

    for (const feriado of feriados) {
      try {
        await db.query(`
          INSERT INTO eventos_calendario (
            calendario_letivo_id, titulo, tipo_evento, data_inicio, cor, criado_por
          ) VALUES ($1, $2, $3, $4, '#dc3545', $5)
          ON CONFLICT DO NOTHING
        `, [calendario_id, feriado.titulo, feriado.tipo, feriado.data, usuario_id]);
        importados++;
      } catch (err) {
      }
    }

    res.json({
      success: true,
      message: `${importados} feriados importados com sucesso`
    });
  } catch (error: any) {
    console.error('Erro ao importar feriados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao importar feriados',
      error: error.message
    });
  }
};


import { Request, Response } from 'express';
import db from '../../../database';

/**
 * Listar todos os períodos
 */
export const listarPeriodos = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM pedidos WHERE periodo_id = p.id) as total_pedidos,
        (SELECT COUNT(*) FROM guias WHERE periodo_id = p.id) as total_guias,
        (SELECT COUNT(*) FROM cardapios_modalidade WHERE periodo_id = p.id) as total_cardapios
      FROM periodos p
      ORDER BY p.ano DESC
    `;

    const result = await db.query(query);

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

/**
 * Obter período ativo ou período do usuário
 */
export const obterPeriodoAtivo = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    // Se usuário está logado, verificar se tem período selecionado
    if (userId) {
      const usuarioPeriodo = await db.query(
        'SELECT periodo_selecionado_id FROM usuarios WHERE id = $1',
        [userId]
      );
      
      if (usuarioPeriodo.rows.length > 0 && usuarioPeriodo.rows[0].periodo_selecionado_id) {
        const periodoUsuario = await db.query(
          'SELECT * FROM periodos WHERE id = $1',
          [usuarioPeriodo.rows[0].periodo_selecionado_id]
        );
        
        if (periodoUsuario.rows.length > 0) {
          return res.json({
            success: true,
            data: periodoUsuario.rows[0],
            fonte: 'usuario'
          });
        }
      }
    }
    
    // Caso contrário, retornar período ativo global
    const query = 'SELECT * FROM periodos WHERE ativo = true LIMIT 1';
    const result = await db.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum período ativo encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      fonte: 'global'
    });
  } catch (error: any) {
    console.error('Erro ao obter período ativo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter período ativo',
      error: error.message
    });
  }
};

/**
 * Criar novo período
 */
export const criarPeriodo = async (req: Request, res: Response) => {
  try {
    const { ano, descricao, data_inicio, data_fim } = req.body;

    // Validações
    if (!ano || !data_inicio || !data_fim) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: ano, data_inicio, data_fim'
      });
    }

    // Verificar se já existe período para este ano
    const existente = await db.query('SELECT id FROM periodos WHERE ano = $1', [ano]);
    if (existente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Já existe um período cadastrado para o ano ${ano}`
      });
    }

    const query = `
      INSERT INTO periodos (ano, descricao, data_inicio, data_fim)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [
      ano,
      descricao || `Ano Letivo ${ano}`,
      data_inicio,
      data_fim
    ]);

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

/**
 * Atualizar período
 */
export const atualizarPeriodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { descricao, data_inicio, data_fim, ocultar_dados } = req.body;

    // Verificar se período existe e se está ativo
    const periodoAtual = await db.query('SELECT ativo FROM periodos WHERE id = $1', [id]);
    
    if (periodoAtual.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Período não encontrado'
      });
    }

    // Validação: período ativo não pode ter ocultar_dados = true
    if (periodoAtual.rows[0].ativo && ocultar_dados === true) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível ocultar dados do período ativo. Ative outro período primeiro.'
      });
    }

    const query = `
      UPDATE periodos
      SET 
        descricao = COALESCE($1, descricao),
        data_inicio = COALESCE($2, data_inicio),
        data_fim = COALESCE($3, data_fim),
        ocultar_dados = COALESCE($4, ocultar_dados),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const result = await db.query(query, [descricao, data_inicio, data_fim, ocultar_dados, id]);

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

/**
 * Ativar período
 */
export const ativarPeriodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se período existe
    const periodo = await db.query('SELECT * FROM periodos WHERE id = $1', [id]);
    if (periodo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Período não encontrado'
      });
    }

    // Verificar se está fechado
    if (periodo.rows[0].fechado) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível ativar um período fechado'
      });
    }

    // Ativar período e garantir que ocultar_dados seja false
    const query = `
      UPDATE periodos
      SET ativo = true, ocultar_dados = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id]);

    res.json({
      success: true,
      message: `Período ${result.rows[0].ano} ativado com sucesso`,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao ativar período:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao ativar período',
      error: error.message
    });
  }
};

/**
 * Fechar período
 */
export const fecharPeriodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se período existe
    const periodo = await db.query('SELECT * FROM periodos WHERE id = $1', [id]);
    if (periodo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Período não encontrado'
      });
    }

    // Não pode fechar período ativo
    if (periodo.rows[0].ativo) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível fechar o período ativo. Ative outro período primeiro.'
      });
    }

    const query = `
      UPDATE periodos
      SET fechado = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id]);

    res.json({
      success: true,
      message: `Período ${result.rows[0].ano} fechado com sucesso`,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao fechar período:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fechar período',
      error: error.message
    });
  }
};

/**
 * Reabrir período
 */
export const reabrirPeriodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE periodos
      SET fechado = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Período não encontrado'
      });
    }

    res.json({
      success: true,
      message: `Período ${result.rows[0].ano} reaberto com sucesso`,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao reabrir período:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao reabrir período',
      error: error.message
    });
  }
};

/**
 * Deletar período
 */
export const deletarPeriodo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se período existe
    const periodo = await db.query('SELECT * FROM periodos WHERE id = $1', [id]);
    if (periodo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Período não encontrado'
      });
    }

    // Não pode deletar período ativo
    if (periodo.rows[0].ativo) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível deletar o período ativo'
      });
    }

    // Verificar se tem registros vinculados
    const pedidos = await db.query('SELECT COUNT(*) FROM pedidos WHERE periodo_id = $1', [id]);
    const guias = await db.query('SELECT COUNT(*) FROM guias WHERE periodo_id = $1', [id]);
    const cardapios = await db.query('SELECT COUNT(*) FROM cardapios_modalidade WHERE periodo_id = $1', [id]);

    const totalRegistros = 
      parseInt(pedidos.rows[0].count) + 
      parseInt(guias.rows[0].count) + 
      parseInt(cardapios.rows[0].count);

    if (totalRegistros > 0) {
      return res.status(400).json({
        success: false,
        message: `Não é possível deletar período com ${totalRegistros} registros vinculados. Feche o período ao invés de deletar.`
      });
    }

    await db.query('DELETE FROM periodos WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Período deletado com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao deletar período:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar período',
      error: error.message
    });
  }
};


/**
 * Selecionar período do usuário
 */
export const selecionarPeriodoUsuario = async (req: Request, res: Response) => {
  try {
    const { periodoId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    if (!periodoId) {
      return res.status(400).json({
        success: false,
        message: 'periodoId é obrigatório'
      });
    }

    // Verificar se período existe
    const periodo = await db.query('SELECT * FROM periodos WHERE id = $1', [periodoId]);
    if (periodo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Período não encontrado'
      });
    }

    // Atualizar período selecionado do usuário
    await db.query(
      'UPDATE usuarios SET periodo_selecionado_id = $1 WHERE id = $2',
      [periodoId, userId]
    );

    res.json({
      success: true,
      message: `Período ${periodo.rows[0].ano} selecionado com sucesso`,
      data: periodo.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao selecionar período:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao selecionar período',
      error: error.message
    });
  }
};

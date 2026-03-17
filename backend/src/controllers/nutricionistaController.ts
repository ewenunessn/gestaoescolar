// Controller de nutricionistas
import { Request, Response } from 'express';
import db from '../database';

export async function listarNutricionistas(req: Request, res: Response) {
  try {
    const { ativo } = req.query;
    
    let query = 'SELECT * FROM nutricionistas';
    const params: any[] = [];
    
    if (ativo !== undefined) {
      query += ' WHERE ativo = $1';
      params.push(ativo === 'true');
    }
    
    query += ' ORDER BY nome';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error: any) {
    console.error('❌ Erro ao listar nutricionistas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar nutricionistas',
      error: error.message
    });
  }
}

export async function buscarNutricionista(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT * FROM nutricionistas WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nutricionista não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar nutricionista:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar nutricionista',
      error: error.message
    });
  }
}

export async function criarNutricionista(req: Request, res: Response) {
  try {
    const {
      nome,
      crn,
      crn_regiao,
      cpf,
      email,
      telefone,
      especialidade,
      ativo = true
    } = req.body;
    
    // Validações
    if (!nome || !crn || !crn_regiao) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: nome, crn, crn_regiao'
      });
    }
    
    const result = await db.query(
      `INSERT INTO nutricionistas 
       (nome, crn, crn_regiao, cpf, email, telefone, especialidade, ativo, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       RETURNING *`,
      [nome, crn, crn_regiao, cpf, email, telefone, especialidade, ativo]
    );
    
    res.status(201).json({
      success: true,
      message: 'Nutricionista criado com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('❌ Erro ao criar nutricionista:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        success: false,
        message: 'CRN ou CPF já cadastrado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro ao criar nutricionista',
      error: error.message
    });
  }
}

export async function editarNutricionista(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      nome,
      crn,
      crn_regiao,
      cpf,
      email,
      telefone,
      especialidade,
      ativo
    } = req.body;
    
    const result = await db.query(
      `UPDATE nutricionistas SET
        nome = COALESCE($1, nome),
        crn = COALESCE($2, crn),
        crn_regiao = COALESCE($3, crn_regiao),
        cpf = COALESCE($4, cpf),
        email = COALESCE($5, email),
        telefone = COALESCE($6, telefone),
        especialidade = COALESCE($7, especialidade),
        ativo = COALESCE($8, ativo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *`,
      [nome, crn, crn_regiao, cpf, email, telefone, especialidade, ativo, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nutricionista não encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Nutricionista atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('❌ Erro ao editar nutricionista:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'CRN ou CPF já cadastrado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro ao editar nutricionista',
      error: error.message
    });
  }
}

export async function removerNutricionista(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Verificar se há cardápios vinculados
    const cardapios = await db.query(
      'SELECT COUNT(*) as total FROM cardapios_modalidade WHERE nutricionista_id = $1',
      [id]
    );
    
    if (parseInt(cardapios.rows[0].total) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir. Existem cardápios vinculados a este nutricionista.'
      });
    }
    
    const result = await db.query(
      'DELETE FROM nutricionistas WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nutricionista não encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Nutricionista removido com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('❌ Erro ao remover nutricionista:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover nutricionista',
      error: error.message
    });
  }
}

export async function desativarNutricionista(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      `UPDATE nutricionistas SET
        ativo = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nutricionista não encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Nutricionista desativado com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('❌ Erro ao desativar nutricionista:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao desativar nutricionista',
      error: error.message
    });
  }
}

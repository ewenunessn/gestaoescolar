// Controller de refeições para PostgreSQL - CRUD Completo
import { Request, Response } from "express";
const db = require("../../../database");

// Interface para tipagem
interface Refeicao {
  id?: number;
  nome: string;
  descricao?: string;
  tipo?: string;
  ativo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Listar todas as refeições
export async function listarRefeicoes(req: Request, res: Response) {
  try {
    const { ativo, tipo, search } = req.query;
    
    let query = `
      SELECT 
        id,
        nome,
        descricao,
        tipo,
        ativo,
        created_at,
        updated_at
      FROM refeicoes 
      WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
    `;
    
    const params: any[] = [];
    let paramCount = 0;
    
    // Filtros opcionais
    if (ativo !== undefined) {
      paramCount++;
      query += ` AND ativo = $${paramCount}`;
      params.push(ativo === 'true');
    }
    
    if (tipo) {
      paramCount++;
      query += ` AND tipo = $${paramCount}`;
      params.push(tipo);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (nome ILIKE $${paramCount} OR descricao ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY nome`;
    
    const result = await db.query(query, params);
    const refeicoes = result.rows;

    res.json({
      success: true,
      data: refeicoes,
      total: refeicoes.length,
      filters: { ativo, tipo, search }
    });
  } catch (error) {
    console.error("❌ Erro ao listar refeições:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar refeições",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Buscar refeição por ID
export async function buscarRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID inválido"
      });
    }
    
    );
    }
    
    // IMPORTANTE: Filtrar por tenant_id para segurança
    const result = await db.query(`
      SELECT * FROM refeicoes WHERE id = $1 AND tenant_id = $2
    `, [id]);
    
    const refeicao = result.rows[0];

    if (!refeicao) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }

    res.json({
      success: true,
      data: refeicao
    });
  } catch (error) {
    console.error("❌ Erro ao buscar refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Criar nova refeição
export async function criarRefeicao(req: Request, res: Response) {
  try {
    const { nome, descricao, tipo, ativo = true }: Refeicao = req.body;
    
    // Validações
    if (!nome || nome.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nome é obrigatório"
      });
    }
    
    if (nome.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Nome deve ter no máximo 255 caracteres"
      });
    }
    
    // Verificar se já existe refeição com o mesmo nome NO MESMO TENANT
    const existente = await db.query(
      `SELECT id FROM refeicoes 
       WHERE LOWER(nome) = LOWER($1) 
       AND tenant_id = current_setting('app.current_tenant_id')::uuid`,
      [nome.trim()]
    );
    
    if (existente.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Já existe uma refeição com este nome"
      });
    }
    
    const result = await db.query(`
      INSERT INTO refeicoes (nome, descricao, tipo, ativo, updated_at) 
      VALUES ($1, $2, $3, $4, current_setting('app.current_tenant_id')::uuid, CURRENT_TIMESTAMP) 
      RETURNING *
    `, [nome.trim(), descricao?.trim() || null, tipo?.trim() || null, ativo]);
    
    const novaRefeicao = result.rows[0];

    res.status(201).json({
      success: true,
      message: "Refeição criada com sucesso",
      data: novaRefeicao
    });
  } catch (error) {
    console.error("❌ Erro ao criar refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Atualizar refeição
export async function atualizarRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nome, descricao, tipo, ativo }: Partial<Refeicao> = req.body;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID inválido"
      });
    }
    
    // Verificar se a refeição existe NO MESMO TENANT
    const existeResult = await db.query(
      `SELECT id FROM refeicoes 
       WHERE id = $1 
       AND tenant_id = current_setting('app.current_tenant_id')::uuid`, 
      [id]
    );
    if (existeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }
    
    // Validações
    if (nome !== undefined) {
      if (!nome || nome.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Nome não pode ser vazio"
        });
      }
      
      if (nome.length > 255) {
        return res.status(400).json({
          success: false,
          message: "Nome deve ter no máximo 255 caracteres"
        });
      }
      
      // Verificar se já existe outra refeição com o mesmo nome NO MESMO TENANT
      const existente = await db.query(
        `SELECT id FROM refeicoes 
         WHERE LOWER(nome) = LOWER($1) 
         AND id != $2 
         AND tenant_id = current_setting('app.current_tenant_id')::uuid`,
        [nome.trim(), id]
      );
      
      if (existente.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Já existe uma refeição com este nome"
        });
      }
    }
    
    // Construir query de atualização dinamicamente
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;
    
    if (nome !== undefined) {
      paramCount++;
      updates.push(`nome = $${paramCount}`);
      values.push(nome.trim());
    }
    
    if (descricao !== undefined) {
      paramCount++;
      updates.push(`descricao = $${paramCount}`);
      values.push(descricao?.trim() || null);
    }
    
    if (tipo !== undefined) {
      paramCount++;
      updates.push(`tipo = $${paramCount}`);
      values.push(tipo?.trim() || null);
    }
    
    if (ativo !== undefined) {
      paramCount++;
      updates.push(`ativo = $${paramCount}`);
      values.push(ativo);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nenhum campo para atualizar"
      });
    }
    
    // Adicionar updated_at
    paramCount++;
    updates.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    
    // Adicionar ID no final
    paramCount++;
    values.push(id);
    
    const query = `
      UPDATE refeicoes 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    const refeicaoAtualizada = result.rows[0];

    res.json({
      success: true,
      message: "Refeição atualizada com sucesso",
      data: refeicaoAtualizada
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Deletar refeição
export async function deletarRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID inválido"
      });
    }
    
    );
    }
    
    // IMPORTANTE: Verificar se a refeição existe NO MESMO TENANT
    const existeResult = await db.query('SELECT id, nome FROM refeicoes WHERE id = $1 AND tenant_id = $2', [id]);
    if (existeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }
    
    const refeicao = existeResult.rows[0];
    
    // Verificar se a refeição está sendo usada em cardápios
    try {
      const usoResult = await db.query(
        'SELECT COUNT(*) as total FROM cardapio_refeicoes WHERE refeicao_id = $1',
        [id]
      );
      
      if (usoResult.rows[0].total > 0) {
        return res.status(409).json({
          success: false,
          message: "Não é possível deletar esta refeição pois ela está sendo usada em cardápios",
          details: `A refeição '${refeicao.nome}' está associada a ${usoResult.rows[0].total} cardápio(s)`
        });
      }
    } catch (checkError) {
      // Se a tabela cardapio_refeicoes não existir, continuar com a exclusão
      console.warn('Aviso: Não foi possível verificar uso em cardápios:', checkError instanceof Error ? checkError.message : 'Erro desconhecido');
    }
    
    // IMPORTANTE: Deletar a refeição apenas do tenant atual
    const result = await db.query('DELETE FROM refeicoes WHERE id = $1 AND tenant_id = $2', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }

    res.json({
      success: true,
      message: `Refeição '${refeicao.nome}' deletada com sucesso`
    });
  } catch (error) {
    console.error("❌ Erro ao deletar refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao deletar refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Ativar/Desativar refeição
export async function toggleAtivoRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "ID inválido"
      });
    }
    
    );
    }
    
    // IMPORTANTE: Buscar estado atual NO MESMO TENANT
    const result = await db.query('SELECT id, nome, ativo FROM refeicoes WHERE id = $1 AND tenant_id = $2', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }
    
    const refeicao = result.rows[0];
    const novoStatus = !refeicao.ativo;
    
    // IMPORTANTE: Atualizar status apenas no tenant atual
    const updateResult = await db.query(`
      UPDATE refeicoes 
      SET ativo = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [novoStatus, id]);
    
    const refeicaoAtualizada = updateResult.rows[0];

    res.json({
      success: true,
      message: `Refeição '${refeicao.nome}' ${novoStatus ? 'ativada' : 'desativada'} com sucesso`,
      data: refeicaoAtualizada
    });
  } catch (error) {
    console.error("❌ Erro ao alterar status da refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao alterar status da refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
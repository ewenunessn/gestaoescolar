// Controller de cardápios refatorado - organizado por modalidade
import { Request, Response } from "express";
const db = require("../../../database");

// ============= CARDÁPIOS POR MODALIDADE =============

export async function listarCardapiosModalidade(req: Request, res: Response) {
  try {
    const { modalidade_id, ativo } = req.query;
    
    let query = `
      SELECT 
        cm.id,
        cm.modalidade_id,
        cm.nome,
        cm.data_inicio,
        cm.data_fim,
        cm.ativo,
        cm.observacao,
        cm.created_at,
        cm.updated_at,
        m.nome as modalidade_nome,
        COUNT(DISTINCT crd.id) as total_refeicoes,
        COUNT(DISTINCT crd.data) as total_dias
      FROM cardapios_modalidade cm
      LEFT JOIN modalidades m ON cm.modalidade_id = m.id
      LEFT JOIN cardapio_refeicoes_dia crd ON cm.id = crd.cardapio_modalidade_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (modalidade_id) {
      params.push(modalidade_id);
      query += ` AND cm.modalidade_id = $${params.length}`;
    }
    
    if (ativo !== undefined) {
      params.push(ativo === 'true');
      query += ` AND cm.ativo = $${params.length}`;
    }
    
    query += `
      GROUP BY cm.id, cm.modalidade_id, cm.nome, cm.data_inicio, cm.data_fim, 
               cm.ativo, cm.observacao, cm.created_at, cm.updated_at, m.nome
      ORDER BY cm.data_inicio DESC, m.nome
    `;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar cardápios:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar cardápios",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarCardapioModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        cm.*,
        m.nome as modalidade_nome
      FROM cardapios_modalidade cm
      LEFT JOIN modalidades m ON cm.modalidade_id = m.id
      WHERE cm.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cardápio não encontrado"
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarCardapioModalidade(req: Request, res: Response) {
  try {
    const {
      modalidade_id,
      nome,
      data_inicio,
      data_fim,
      observacao,
      ativo = true
    } = req.body;
    
    if (!modalidade_id || !nome || !data_inicio || !data_fim) {
      return res.status(400).json({
        success: false,
        message: "Modalidade, nome, data início e data fim são obrigatórios"
      });
    }
    
    const result = await db.query(`
      INSERT INTO cardapios_modalidade 
        (modalidade_id, nome, data_inicio, data_fim, observacao, ativo, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `, [modalidade_id, nome, data_inicio, data_fim, observacao, ativo]);
    
    res.json({
      success: true,
      message: "Cardápio criado com sucesso",
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar cardápio:", error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: "Já existe um cardápio com este nome para esta modalidade"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Erro ao criar cardápio",
      error: error.message
    });
  }
}

export async function editarCardapioModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      modalidade_id,
      nome,
      data_inicio,
      data_fim,
      observacao,
      ativo
    } = req.body;
    
    const result = await db.query(`
      UPDATE cardapios_modalidade SET
        modalidade_id = $1,
        nome = $2,
        data_inicio = $3,
        data_fim = $4,
        observacao = $5,
        ativo = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [modalidade_id, nome, data_inicio, data_fim, observacao, ativo, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cardápio não encontrado"
      });
    }
    
    res.json({
      success: true,
      message: "Cardápio atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerCardapioModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      DELETE FROM cardapios_modalidade WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cardápio não encontrado"
      });
    }
    
    res.json({
      success: true,
      message: "Cardápio removido com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao remover cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// ============= REFEIÇÕES DO DIA =============

export async function listarRefeicoesCardapio(req: Request, res: Response) {
  try {
    const { cardapio_id } = req.params;
    const { data_inicio, data_fim, tipo_refeicao } = req.query;
    
    let query = `
      SELECT 
        crd.id,
        crd.cardapio_modalidade_id,
        crd.data,
        crd.tipo_refeicao,
        crd.descricao,
        crd.observacao,
        crd.ativo,
        crd.created_at,
        crd.updated_at,
        COUNT(crp.id) as total_produtos
      FROM cardapio_refeicoes_dia crd
      LEFT JOIN cardapio_refeicao_produtos crp ON crd.id = crp.cardapio_refeicao_dia_id
      WHERE crd.cardapio_modalidade_id = $1
    `;
    
    const params: any[] = [cardapio_id];
    
    if (data_inicio) {
      params.push(data_inicio);
      query += ` AND crd.data >= $${params.length}`;
    }
    
    if (data_fim) {
      params.push(data_fim);
      query += ` AND crd.data <= $${params.length}`;
    }
    
    if (tipo_refeicao) {
      params.push(tipo_refeicao);
      query += ` AND crd.tipo_refeicao = $${params.length}`;
    }
    
    query += `
      GROUP BY crd.id, crd.cardapio_modalidade_id, crd.data, crd.tipo_refeicao, 
               crd.descricao, crd.observacao, crd.ativo, crd.created_at, crd.updated_at
      ORDER BY crd.data, 
        CASE crd.tipo_refeicao
          WHEN 'cafe_manha' THEN 1
          WHEN 'lanche_manha' THEN 2
          WHEN 'almoco' THEN 3
          WHEN 'lanche_tarde' THEN 4
          WHEN 'jantar' THEN 5
        END
    `;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
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

export async function buscarRefeicaoDia(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        crd.*,
        cm.nome as cardapio_nome,
        cm.modalidade_id,
        m.nome as modalidade_nome
      FROM cardapio_refeicoes_dia crd
      LEFT JOIN cardapios_modalidade cm ON crd.cardapio_modalidade_id = cm.id
      LEFT JOIN modalidades m ON cm.modalidade_id = m.id
      WHERE crd.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
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

export async function criarRefeicaoDia(req: Request, res: Response) {
  try {
    const { cardapio_id } = req.params;
    const {
      data,
      tipo_refeicao,
      descricao,
      observacao,
      ativo = true
    } = req.body;
    
    if (!data || !tipo_refeicao) {
      return res.status(400).json({
        success: false,
        message: "Data e tipo de refeição são obrigatórios"
      });
    }
    
    const tiposValidos = ['cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar'];
    if (!tiposValidos.includes(tipo_refeicao)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de refeição inválido. Use: cafe_manha, lanche_manha, almoco, lanche_tarde ou jantar"
      });
    }
    
    const result = await db.query(`
      INSERT INTO cardapio_refeicoes_dia 
        (cardapio_modalidade_id, data, tipo_refeicao, descricao, observacao, ativo, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `, [cardapio_id, data, tipo_refeicao, descricao, observacao, ativo]);
    
    res.json({
      success: true,
      message: "Refeição criada com sucesso",
      data: result.rows[0]
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

export async function editarRefeicaoDia(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      data,
      tipo_refeicao,
      descricao,
      observacao,
      ativo
    } = req.body;
    
    const result = await db.query(`
      UPDATE cardapio_refeicoes_dia SET
        data = $1,
        tipo_refeicao = $2,
        descricao = $3,
        observacao = $4,
        ativo = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [data, tipo_refeicao, descricao, observacao, ativo, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }
    
    res.json({
      success: true,
      message: "Refeição atualizada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerRefeicaoDia(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      DELETE FROM cardapio_refeicoes_dia WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }
    
    res.json({
      success: true,
      message: "Refeição removida com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao remover refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// ============= PRODUTOS DA REFEIÇÃO =============

export async function listarProdutosRefeicao(req: Request, res: Response) {
  try {
    const { refeicao_id } = req.params;
    
    const result = await db.query(`
      SELECT 
        crp.id,
        crp.cardapio_refeicao_dia_id,
        crp.produto_id,
        crp.quantidade,
        crp.per_capita,
        crp.observacao,
        crp.created_at,
        crp.updated_at,
        p.nome as produto_nome,
        p.unidade,
        p.categoria
      FROM cardapio_refeicao_produtos crp
      LEFT JOIN produtos p ON crp.produto_id = p.id
      WHERE crp.cardapio_refeicao_dia_id = $1
      ORDER BY p.nome
    `, [refeicao_id]);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar produtos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar produtos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function adicionarProdutoRefeicao(req: Request, res: Response) {
  try {
    const { refeicao_id } = req.params;
    const {
      produto_id,
      quantidade,
      per_capita = false,
      observacao
    } = req.body;
    
    if (!produto_id || !quantidade) {
      return res.status(400).json({
        success: false,
        message: "Produto e quantidade são obrigatórios"
      });
    }
    
    const result = await db.query(`
      INSERT INTO cardapio_refeicao_produtos 
        (cardapio_refeicao_dia_id, produto_id, quantidade, per_capita, observacao, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `, [refeicao_id, produto_id, quantidade, per_capita, observacao]);
    
    res.json({
      success: true,
      message: "Produto adicionado com sucesso",
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error("❌ Erro ao adicionar produto:", error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: "Este produto já foi adicionado a esta refeição"
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Erro ao adicionar produto",
      error: error.message
    });
  }
}

export async function editarProdutoRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      quantidade,
      per_capita,
      observacao
    } = req.body;
    
    const result = await db.query(`
      UPDATE cardapio_refeicao_produtos SET
        quantidade = $1,
        per_capita = $2,
        observacao = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [quantidade, per_capita, observacao, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }
    
    res.json({
      success: true,
      message: "Produto atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerProdutoRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      DELETE FROM cardapio_refeicao_produtos WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }
    
    res.json({
      success: true,
      message: "Produto removido com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao remover produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

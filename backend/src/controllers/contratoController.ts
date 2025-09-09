// Controller de contratos para PostgreSQL - Versão Corrigida
import { Request, Response } from "express";
const db = require("../database");

export async function listarContratos(req: Request, res: Response) {
  try {
    const { status, fornecedor_id, busca, page = 1, limit = 50 } = req.query;
    
    let whereClause = '1=1';
    const params: any[] = [];
    let paramCount = 0;
    
    // Filtro por status
    if (status) {
      paramCount++;
      whereClause += ` AND c.status = $${paramCount}`;
      params.push(status);
    }
    
    // Filtro por fornecedor
    if (fornecedor_id) {
      paramCount++;
      whereClause += ` AND c.fornecedor_id = $${paramCount}`;
      params.push(fornecedor_id);
    }
    
    // Filtro de busca por número ou descrição
    if (busca) {
      paramCount++;
      whereClause += ` AND (c.numero ILIKE $${paramCount} OR f.nome ILIKE $${paramCount})`;
      params.push(`%${busca}%`);
    }
    
    // Paginação
    const offset = (Number(page) - 1) * Number(limit);
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;
    params.push(Number(limit), offset);
    
    const contratosResult = await db.query(`
      SELECT 
        c.id,
        c.numero,
        c.fornecedor_id,
        f.nome as fornecedor_nome,
        f.cnpj as fornecedor_cnpj,
        c.data_inicio,
        c.data_fim,
        COALESCE(c.valor_total, 0) as valor_total_original,
        COALESCE(SUM(cp.quantidade * cp.preco_unitario), c.valor_total, 0) as valor_total,
        COALESCE(SUM(cp.quantidade * cp.preco_unitario), c.valor_total, 0) as valor_total_contrato,
        c.status,
        c.ativo,
        c.created_at,
        COUNT(cp.id) as total_produtos,
        -- COUNT(a.id) as total_aditivos, -- Removido - módulo de aditivos excluído
      -- COALESCE(SUM(CASE WHEN a.ativo = true THEN 1 ELSE 0 END), 0) as aditivos_ativos, -- Removido - módulo de aditivos excluído
      0 as total_aditivos,
      0 as aditivos_ativos,
        -- Valor calculado baseado nos produtos do contrato
        COALESCE(SUM(cp.quantidade * cp.preco_unitario), 0) as valor_calculado
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id
      -- LEFT JOIN aditivos_contratos a ON c.id = a.contrato_id -- Removido - módulo de aditivos excluído
      WHERE ${whereClause}
      GROUP BY c.id, c.numero, c.fornecedor_id, f.nome, f.cnpj, c.data_inicio, c.data_fim, c.valor_total, c.status, c.ativo, c.created_at
      ORDER BY c.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `, params);
    
    const contratos = contratosResult.rows;

    // Contar total para paginação
    const totalResult = await db.query(`
      SELECT COUNT(*) as total 
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE ${whereClause}
    `, params.slice(0, -2)); // Remove limit e offset

    res.json({
      success: true,
      data: contratos,
      total: Number(totalResult.rows[0].total),
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(Number(totalResult.rows[0].total) / Number(limit))
    });
  } catch (error) {
    console.error("❌ Erro ao listar contratos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar contratos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarContrato(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const contratoResult = await db.query(`
      SELECT 
        c.*,
        f.nome as fornecedor_nome,
        COALESCE(SUM(cp.quantidade * cp.preco_unitario), 0) as valor_calculado
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id
      WHERE c.id = $1
      GROUP BY c.id, f.nome
    `, [id]);

    if (contratoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato não encontrado"
      });
    }

    res.json({
      success: true,
      data: contratoResult.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar contrato:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar contrato",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarContratosPorFornecedor(req: Request, res: Response) {
  try {
    const { fornecedor_id } = req.params;
    
    const contratosResult = await db.query(`
      SELECT 
        c.*,
        f.nome as fornecedor_nome,
        COALESCE(SUM(cp.quantidade * cp.preco_unitario), 0) as valor_calculado
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id
      WHERE c.fornecedor_id = $1
      GROUP BY c.id, f.nome
      ORDER BY c.created_at DESC
    `, [fornecedor_id]);

    res.json({
      success: true,
      data: contratosResult.rows,
      total: contratosResult.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar contratos por fornecedor:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar contratos por fornecedor",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarContrato(req: Request, res: Response) {
  try {
    const {
      numero,
      fornecedor_id,
      data_inicio,
      data_fim,
      valor_total,
      status = 'ativo',
      ativo = true
    } = req.body;

    // Validações
    if (!numero || numero.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Número do contrato é obrigatório e deve ter pelo menos 3 caracteres"
      });
    }

    if (!fornecedor_id) {
      return res.status(400).json({
        success: false,
        message: "Fornecedor é obrigatório"
      });
    }

    if (!data_inicio || !data_fim) {
      return res.status(400).json({
        success: false,
        message: "Datas de início e fim são obrigatórias"
      });
    }

    // Verificar se data_fim é posterior a data_inicio
    if (new Date(data_fim) <= new Date(data_inicio)) {
      return res.status(400).json({
        success: false,
        message: "Data de fim deve ser posterior à data de início"
      });
    }

    // Verificar se fornecedor existe
    const fornecedorResult = await db.query(`
      SELECT id, nome FROM fornecedores WHERE id = $1 AND ativo = true
    `, [fornecedor_id]);

    if (fornecedorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Fornecedor não encontrado ou inativo"
      });
    }

    // Verificar se número já existe
    const numeroExistenteResult = await db.query(`
      SELECT id FROM contratos WHERE numero = $1
    `, [numero]);

    if (numeroExistenteResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Número de contrato já existe no sistema"
      });
    }

    const result = await db.query(`
      INSERT INTO contratos (
        numero, fornecedor_id, data_inicio, data_fim, valor_total, 
        status, ativo, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `, [numero, fornecedor_id, data_inicio, data_fim, valor_total || 0, status, ativo]);

    // Buscar dados completos do contrato criado
    const contratoCompletoResult = await db.query(`
      SELECT 
        c.*,
        f.nome as fornecedor_nome,
        f.cnpj as fornecedor_cnpj
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE c.id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      message: "Contrato criado com sucesso",
      data: contratoCompletoResult.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar contrato:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar contrato",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarContrato(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      numero,
      fornecedor_id,
      data_inicio,
      data_fim,
      valor_total,
      status,
      ativo
    } = req.body;

    const result = await db.query(`
      UPDATE contratos SET
        numero = $1,
        fornecedor_id = $2,
        data_inicio = $3,
        data_fim = $4,
        valor_total = $5,
        status = $6,
        ativo = $7
      WHERE id = $8
      RETURNING *
    `, [numero, fornecedor_id, data_inicio, data_fim, valor_total, status, ativo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Contrato atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar contrato:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar contrato",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerContrato(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { force } = req.query; // Parâmetro opcional para forçar exclusão

    // Verificar se há dependências vinculadas ao contrato
    const dependenciasResult = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM contrato_produtos WHERE contrato_id = $1) as produtos,
        -- (SELECT COUNT(*) FROM aditivos_contratos WHERE contrato_id = $1) as aditivos, -- Removido - módulo de aditivos excluído
      0 as aditivos,
        (SELECT COUNT(*) FROM pedidos_itens WHERE contrato_id = $1) as pedidos_itens
    `, [id]);

    const dependencias = dependenciasResult.rows[0];
    const totalDependencias = Number(dependencias.produtos) + 0 + // Number(dependencias.aditivos) removido - módulo de aditivos excluído 
                             Number(dependencias.pedidos_itens);

    if (totalDependencias > 0 && force !== 'true') {
      const mensagens = [];
      if (Number(dependencias.produtos) > 0) {
        mensagens.push(`${dependencias.produtos} produtos`);
      }
      // if (Number(dependencias.aditivos) > 0) { // Removido - módulo de aditivos excluído
    //   mensagens.push(`${dependencias.aditivos} aditivos`);
    // }
      if (Number(dependencias.pedidos_itens) > 0) {
        mensagens.push(`${dependencias.pedidos_itens} itens de pedidos`);
      }

      return res.status(409).json({
        success: false,
        message: `Não é possível remover contrato. Existem ${mensagens.join(', ')} vinculados.`,
        details: "Remova todas as dependências antes de excluir o contrato ou use force=true para exclusão em cascata",
        dependencias: {
          produtos: Number(dependencias.produtos),
          // aditivos: Number(dependencias.aditivos), // Removido - módulo de aditivos excluído
          pedidos_itens: Number(dependencias.pedidos_itens)
        }
      });
    }

    // Se force=true, remover dependências em cascata
    if (force === 'true' && totalDependencias > 0) {
      console.log(`🔄 Removendo dependências do contrato ${id} em cascata...`);
      
      // Remover em ordem de dependência
      await db.query(`DELETE FROM pedidos_itens WHERE contrato_id = $1`, [id]);
      // await db.query(`DELETE FROM aditivos_contratos WHERE contrato_id = $1`, [id]); // Removido - módulo de aditivos excluído
      await db.query(`DELETE FROM contrato_produtos WHERE contrato_id = $1`, [id]);
      
      console.log(`✅ Dependências removidas com sucesso`);
    }

    const result = await db.query(`
      DELETE FROM contratos WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato não encontrado"
      });
    }

    res.json({
      success: true,
      message: force === 'true' ? "Contrato e dependências removidos com sucesso" : "Contrato removido com sucesso",
      dependenciasRemovidas: force === 'true' ? dependencias : null
    });
  } catch (error) {
    console.error("❌ Erro ao remover contrato:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover contrato",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function obterEstatisticasContratos(req: Request, res: Response) {
  try {
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_contratos,
        COUNT(CASE WHEN status = 'ativo' THEN 1 END) as contratos_ativos,
        COUNT(CASE WHEN status = 'inativo' THEN 1 END) as contratos_inativos,
        COUNT(CASE WHEN status = 'vencido' THEN 1 END) as contratos_vencidos,
        COALESCE(SUM(valor_total), 0) as valor_total_contratos,
        COALESCE(AVG(valor_total), 0) as valor_medio_contratos,
        COUNT(DISTINCT fornecedor_id) as fornecedores_com_contratos
      FROM contratos
    `);

    const estatisticasPorMesResult = await db.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) as contratos_criados,
        COALESCE(SUM(valor_total), 0) as valor_total_mes
      FROM contratos
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes DESC
    `);

    const contratosPorFornecedorResult = await db.query(`
      SELECT 
        f.nome as fornecedor_nome,
        COUNT(c.id) as total_contratos,
        COALESCE(SUM(c.valor_total), 0) as valor_total
      FROM fornecedores f
      LEFT JOIN contratos c ON f.id = c.fornecedor_id
      GROUP BY f.id, f.nome
      HAVING COUNT(c.id) > 0
      ORDER BY COUNT(c.id) DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        resumo: statsResult.rows[0],
        por_mes: estatisticasPorMesResult.rows,
        por_fornecedor: contratosPorFornecedorResult.rows
      }
    });
  } catch (error) {
    console.error("❌ Erro ao obter estatísticas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter estatísticas",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
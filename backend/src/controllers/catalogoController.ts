import { Request, Response } from "express";
const db = require("../database");

// Interface para filtros de busca
interface CatalogoFiltros {
  fornecedor_id?: number;
  contrato_id?: number;
  busca?: string;
  limit?: number;
  offset?: number;
}

// Interface para produto contrato
interface ProdutoContrato {
  produto_id: number;
  nome_produto: string;
  unidade: string;
  contrato_id: number;
  numero_contrato: string;
  fornecedor_id: number;
  nome_fornecedor: string;
  preco_contratual: number;
  quantidade_contratual: number;
  quantidade_disponivel: number;
  contrato_ativo: boolean;
  data_inicio: string;
  data_fim: string;
}

/**
 * Lista produtos do catálogo com informações contratuais
 * GET /api/produtos/catalogo
 */
export async function listarCatalogoProdutos(req: Request, res: Response) {
  try {
    console.log('📋 Listando catálogo de produtos...', req.query);

    // Extrair e validar filtros da query
    const filtros: CatalogoFiltros = {};

    if (req.query.fornecedor_id) {
      const fornecedorId = parseInt(req.query.fornecedor_id as string);
      if (isNaN(fornecedorId)) {
        return res.status(400).json({
          message: "fornecedor_id deve ser um número válido"
        });
      }
      filtros.fornecedor_id = fornecedorId;
    }

    if (req.query.contrato_id) {
      const contratoId = parseInt(req.query.contrato_id as string);
      if (isNaN(contratoId)) {
        return res.status(400).json({
          message: "contrato_id deve ser um número válido"
        });
      }
      filtros.contrato_id = contratoId;
    }

    if (req.query.busca) {
      filtros.busca = req.query.busca as string;
    }

    // Paginação
    if (req.query.limit) {
      const limit = parseInt(req.query.limit as string);
      if (isNaN(limit) || limit <= 0 || limit > 100) {
        return res.status(400).json({
          message: "limit deve ser um número entre 1 e 100"
        });
      }
      filtros.limit = limit;
    } else {
      filtros.limit = 20; // Padrão
    }

    if (req.query.offset) {
      const offset = parseInt(req.query.offset as string);
      if (isNaN(offset) || offset < 0) {
        return res.status(400).json({
          message: "offset deve ser um número maior ou igual a 0"
        });
      }
      filtros.offset = offset;
    }

    // Construir query base usando PostgreSQL com view_saldo_contratos_itens
    let query = `
      SELECT 
        v.produto_id,
        v.produto_nome as nome_produto,
        v.produto_unidade as unidade,
        v.contrato_id,
        v.contrato_numero as numero_contrato,
        c.fornecedor_id,
        f.nome as nome_fornecedor,
        v.valor_unitario as preco_contratual,
        v.quantidade_total as quantidade_contratual,
        v.quantidade_disponivel_real as quantidade_disponivel,
        c.ativo as contrato_ativo,
        v.data_inicio,
        v.data_fim
      FROM view_saldo_contratos_itens v
      INNER JOIN contratos c ON v.contrato_id = c.id
      INNER JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE c.ativo = true
        AND c.data_fim >= CURRENT_DATE`;

    // Aplicar filtros
    const params: any[] = [];
    let paramCount = 0;

    if (filtros.fornecedor_id) {
      paramCount++;
      query += ` AND c.fornecedor_id = $${paramCount}`;
      params.push(filtros.fornecedor_id);
    }

    if (filtros.contrato_id) {
      paramCount++;
      query += ` AND v.contrato_id = $${paramCount}`;
      params.push(filtros.contrato_id);
    }

    if (filtros.busca) {
      paramCount++;
      query += ` AND (v.produto_nome ILIKE $${paramCount} OR f.nome ILIKE $${paramCount})`;
      params.push(`%${filtros.busca}%`);
    }

    query += ` ORDER BY v.produto_nome, f.nome`;

    if (filtros.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filtros.limit);
    }

    if (filtros.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filtros.offset);
    }

    // Buscar produtos usando PostgreSQL
    const result = await db.query(query, params);
    const produtos = result.rows;

    console.log(`✅ Encontrados ${produtos.length} produtos no catálogo`);

    // Contar total de produtos
    const totalResult = await db.query(`
      SELECT COUNT(DISTINCT cp.produto_id) as total
      FROM contratos_produtos cp
      INNER JOIN contratos c ON cp.contrato_id = c.id
      WHERE c.ativo = true AND c.data_fim >= CURRENT_DATE
    `);
    const total = parseInt(totalResult.rows[0]?.total || 0);

    const response = {
      produtos,
      paginacao: {
        total,
        limit: filtros.limit,
        offset: filtros.offset || 0,
        hasNext: (filtros.offset || 0) + filtros.limit < total,
        hasPrev: (filtros.offset || 0) > 0
      }
    };

    res.json(response);

  } catch (error: any) {
    console.error('❌ Erro ao listar catálogo de produtos:', error);
    res.status(500).json({
      message: "Erro interno do servidor ao buscar produtos",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Busca detalhes de um produto específico no catálogo
 * GET /api/produtos/catalogo/:produto_id/:contrato_id
 */
export async function buscarProdutoCatalogo(req: Request, res: Response) {
  try {
    const produto_id = parseInt(req.params.produto_id);
    const contrato_id = parseInt(req.params.contrato_id);

    console.log(`🔍 Buscando produto ${produto_id} do contrato ${contrato_id}...`);

    // Validar parâmetros
    if (isNaN(produto_id) || produto_id <= 0) {
      return res.status(400).json({
        message: "produto_id deve ser um número válido maior que 0"
      });
    }

    if (isNaN(contrato_id) || contrato_id <= 0) {
      return res.status(400).json({
        message: "contrato_id deve ser um número válido maior que 0"
      });
    }

    // Buscar produto usando PostgreSQL
    const result = await db.query(`
      SELECT 
        cp.produto_id,
        p.nome as nome_produto,
        p.unidade,
        cp.contrato_id,
        c.numero as numero_contrato,
        c.fornecedor_id,
        f.nome as nome_fornecedor,
        cp.preco_unitario as preco_contratual,
        cp.quantidade as quantidade_contratual,
        COALESCE(cp.quantidade - COALESCE(SUM(ci.quantidade), 0), cp.quantidade) as quantidade_disponivel,
        c.ativo as contrato_ativo,
        c.data_inicio,
        c.data_fim
      FROM contratos_produtos cp
      INNER JOIN contratos c ON cp.contrato_id = c.id
      INNER JOIN produtos p ON cp.produto_id = p.id
      INNER JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN carrinho_itens ci ON cp.produto_id = ci.produto_id AND cp.contrato_id = ci.contrato_id
      WHERE cp.produto_id = $1 AND cp.contrato_id = $2
        AND c.ativo = true
        AND c.data_fim >= CURRENT_DATE
      GROUP BY cp.produto_id, p.nome, p.unidade, cp.contrato_id, c.numero, 
               c.fornecedor_id, f.nome, cp.preco_unitario, cp.quantidade, 
               c.ativo, c.data_inicio, c.data_fim
    `, [produto_id, contrato_id]);
    
    const produtoEncontrado = result.rows[0];

    if (!produtoEncontrado) {
      console.log(`❌ Produto ${produto_id} não encontrado no contrato ${contrato_id}`);
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado no catálogo ou contrato inativo"
      });
    }
    if (!produtoEncontrado || produtoEncontrado.quantidade_disponivel <= 0) {
      console.log(`⚠️ Produto ${produto_id} sem quantidade disponível`);
      return res.status(400).json({
        message: "Produto sem quantidade disponível no contrato",
        produto: produtoEncontrado
      });
    }

    console.log(`✅ Produto encontrado: ${produtoEncontrado.nome_produto}`);
    res.json(produtoEncontrado);

  } catch (error: any) {
    console.error('❌ Erro ao buscar produto do catálogo:', error);
    res.status(500).json({
      message: "Erro interno do servidor ao buscar produto",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Busca produtos por fornecedor específico
 * GET /api/produtos/catalogo/fornecedor/:fornecedor_id
 */
export async function listarProdutosPorFornecedor(req: Request, res: Response) {
  try {
    const fornecedor_id = parseInt(req.params.fornecedor_id);

    console.log(`🏪 Listando produtos do fornecedor ${fornecedor_id}...`);

    // Validar parâmetro
    if (isNaN(fornecedor_id) || fornecedor_id <= 0) {
      return res.status(400).json({
        message: "fornecedor_id deve ser um número válido maior que 0"
      });
    }

    // Buscar produtos do fornecedor usando PostgreSQL
    const result = await db.query(`
      SELECT 
        v.produto_id,
        v.produto_nome as nome_produto,
        v.produto_unidade as unidade,
        v.contrato_id,
        v.contrato_numero as numero_contrato,
        c.fornecedor_id,
        f.nome as nome_fornecedor,
        v.valor_unitario as preco_contratual,
        v.quantidade_total as quantidade_contratual,
        v.quantidade_disponivel_real as quantidade_disponivel,
        c.ativo as contrato_ativo,
        v.data_inicio,
        v.data_fim
      FROM view_saldo_contratos_itens v
      INNER JOIN contratos c ON v.contrato_id = c.id
      INNER JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE c.fornecedor_id = $1
        AND c.ativo = true
        AND c.data_fim >= CURRENT_DATE
      ORDER BY v.produto_nome
    `, [fornecedor_id]);
    
    const produtos = result.rows;

    console.log(`✅ Encontrados ${produtos.length} produtos do fornecedor ${fornecedor_id}`);

    res.json({
      fornecedor_id,
      produtos,
      total: produtos.length
    });

  } catch (error: any) {
    console.error('❌ Erro ao listar produtos por fornecedor:', error);
    res.status(500).json({
      message: "Erro interno do servidor ao buscar produtos do fornecedor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Busca produtos disponíveis (com quantidade > 0)
 * GET /api/produtos/catalogo/disponiveis
 */
export async function listarProdutosDisponiveis(req: Request, res: Response) {
  try {
    console.log('📦 Listando produtos disponíveis...');

    // Buscar produtos disponíveis usando PostgreSQL com view_saldo_contratos_itens
    const produtosDisponiveis = await db.query(`
      SELECT 
        v.produto_id,
        v.produto_nome as nome_produto,
        v.produto_unidade as unidade,
        v.contrato_id,
        v.contrato_numero as numero_contrato,
        c.fornecedor_id,
        f.nome as nome_fornecedor,
        v.valor_unitario as preco_contratual,
        v.quantidade_total as quantidade_contratual,
        v.quantidade_disponivel_real as quantidade_disponivel,
        c.ativo as contrato_ativo,
        v.data_inicio,
        v.data_fim
      FROM view_saldo_contratos_itens v
      INNER JOIN contratos c ON v.contrato_id = c.id
      INNER JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE c.ativo = true
        AND c.data_fim >= CURRENT_DATE
        AND v.quantidade_disponivel_real > 0
      ORDER BY v.produto_nome, f.nome
    `);

    console.log(`✅ Encontrados ${produtosDisponiveis.rows.length} produtos disponíveis`);

    res.json({
      produtos: produtosDisponiveis.rows,
      total: produtosDisponiveis.rows.length
    });

  } catch (error: any) {
    console.error('❌ Erro ao listar produtos disponíveis:', error);
    res.status(500).json({
      message: "Erro interno do servidor ao buscar produtos disponíveis",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Busca estatísticas do catálogo
 * GET /api/produtos/catalogo/stats
 */
export async function obterEstatisticasCatalogo(req: Request, res: Response) {
  try {
    console.log('📊 Calculando estatísticas do catálogo...');

    // Buscar estatísticas usando PostgreSQL
    const estatisticasResult = await db.query(`
      SELECT 
        COUNT(DISTINCT v.produto_id) as total_produtos,
        COUNT(DISTINCT c.fornecedor_id) as total_fornecedores,
        COUNT(DISTINCT v.contrato_id) as total_contratos,
        SUM(v.quantidade_total) as quantidade_total_contratada,
        SUM(v.quantidade_disponivel_real) as quantidade_disponivel_total,
        AVG(v.valor_unitario) as preco_medio
      FROM view_saldo_contratos_itens v
      INNER JOIN contratos c ON v.contrato_id = c.id
      WHERE c.ativo = true AND c.data_fim >= CURRENT_DATE
    `);
    
    const estatisticas = estatisticasResult.rows[0];

    const produtosResult = await db.query(`
      SELECT 
        v.produto_id,
        v.produto_nome as nome_produto,
        v.valor_unitario as preco_contratual,
        v.quantidade_disponivel_real as quantidade_disponivel
      FROM view_saldo_contratos_itens v
      INNER JOIN contratos c ON v.contrato_id = c.id
      WHERE c.ativo = true AND c.data_fim >= CURRENT_DATE
    `);
    
    const produtos = produtosResult.rows;

    // Calcular estatísticas adicionais
    const produtosDisponiveis = produtos.filter((p: any) => p.quantidade_disponivel > 0);
    const produtosEsgotados = produtos.filter((p: any) => p.quantidade_disponivel <= 0);

    const stats = {
      total_produtos: parseInt(estatisticas.total_produtos) || 0,
      produtos_disponiveis: produtosDisponiveis.length,
      produtos_esgotados: produtosEsgotados.length,
      total_fornecedores: parseInt(estatisticas.total_fornecedores) || 0,
      total_contratos: parseInt(estatisticas.total_contratos) || 0,
      quantidade_total_contratada: parseFloat(estatisticas.quantidade_total_contratada) || 0,
      quantidade_disponivel_total: parseFloat(estatisticas.quantidade_disponivel_total) || 0,
      preco_medio: parseFloat(estatisticas.preco_medio) || 0,
      valor_total_disponivel: produtos.reduce((total: number, p: any) =>
        total + (p.quantidade_disponivel * p.preco_contratual), 0
      )
    };

    console.log('✅ Estatísticas calculadas:', {
      total: stats.total_produtos,
      disponíveis: stats.produtos_disponiveis,
      fornecedores: stats.total_fornecedores
    });

    res.json(stats);

  } catch (error: any) {
    console.error('❌ Erro ao calcular estatísticas do catálogo:', error);
    res.status(500).json({
      message: "Erro interno do servidor ao calcular estatísticas",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
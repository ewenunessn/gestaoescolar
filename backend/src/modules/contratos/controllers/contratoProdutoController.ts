// Controller de contrato-produtos para PostgreSQL
import { Request, Response } from "express";
import db from "../../../database";

export async function listarContratoProdutos(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT 
        cp.id,
        cp.contrato_id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada,
        cp.ativo,
        p.nome as produto_nome,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      INNER JOIN produtos p ON cp.produto_id = p.id
      INNER JOIN contratos c ON cp.contrato_id = c.id
      ORDER BY c.numero, p.nome
    `);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar contrato-produtos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar contrato-produtos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarProdutosPorContrato(req: Request, res: Response) {
  try {
    const { contrato_id } = req.params;

    console.log('🔍 Listando produtos do contrato:', contrato_id);

    // Buscar colunas disponíveis em produtos
    const produtosColumns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'produtos'
    `);
    
    const produtosColumnNames = produtosColumns.rows.map(r => r.column_name);
    console.log('📋 Colunas em produtos:', produtosColumnNames);
    
    const hasProdutosPeso = produtosColumnNames.includes('peso');
    const hasProdutosUnidade = produtosColumnNames.includes('unidade');

    // Buscar colunas disponíveis em contrato_produtos
    const cpColumns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contrato_produtos'
    `);
    
    const cpColumnNames = cpColumns.rows.map(r => r.column_name);
    console.log('📋 Colunas em contrato_produtos:', cpColumnNames);
    
    const hasCpPeso = cpColumnNames.includes('peso');
    const hasCpMarca = cpColumnNames.includes('marca');

    // Construir query dinamicamente
    let pesoSelect = 'NULL as peso';
    if (hasCpPeso && hasProdutosPeso) {
      pesoSelect = 'COALESCE(cp.peso, p.peso) as peso';
    } else if (hasCpPeso) {
      pesoSelect = 'cp.peso';
    } else if (hasProdutosPeso) {
      pesoSelect = 'p.peso';
    }

    const marcaSelect = hasCpMarca ? 'cp.marca' : 'NULL as marca';
    const unidadeSelect = hasProdutosUnidade ? 'p.unidade' : 'NULL as unidade';

    const sqlQuery = `
      SELECT 
        cp.id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada,
        ${marcaSelect},
        ${pesoSelect},
        cp.ativo,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.categoria,
        ${unidadeSelect},
        COALESCE(cp.quantidade_contratada, 0) - COALESCE(
          (SELECT COALESCE(SUM(pi.quantidade), 0) 
           FROM pedido_itens pi 
           WHERE pi.contrato_produto_id = cp.id), 0
        ) as saldo,
        (cp.quantidade_contratada * cp.preco_unitario) as valor_total
      FROM contrato_produtos cp
      INNER JOIN produtos p ON cp.produto_id = p.id
      WHERE cp.contrato_id = $1
      ORDER BY cp.ativo DESC, p.nome
    `;

    console.log('📝 Query SQL:', sqlQuery);

    const result = await db.query(sqlQuery, [contrato_id]);

    console.log('✅ Produtos encontrados:', result.rows.length);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar produtos por contrato:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : 'N/A');
    res.status(500).json({
      success: false,
      message: "Erro ao listar produtos por contrato",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarProdutosPorFornecedor(req: Request, res: Response) {
  try {
    const { fornecedor_id } = req.params;

    const result = await db.query(`
      SELECT 
        cp.id,
        cp.contrato_id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada,
        p.nome as produto_nome,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      INNER JOIN produtos p ON cp.produto_id = p.id
      INNER JOIN contratos c ON cp.contrato_id = c.id
      WHERE c.fornecedor_id = $1 AND cp.ativo = true
      ORDER BY c.numero, p.nome
    `, [fornecedor_id]);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar produtos por fornecedor:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar produtos por fornecedor",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarContratoProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        cp.id,
        cp.contrato_id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada,
        cp.ativo,
        p.nome as produto_nome,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      INNER JOIN produtos p ON cp.produto_id = p.id
      INNER JOIN contratos c ON cp.contrato_id = c.id
      WHERE cp.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato-produto não encontrado"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar contrato-produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar contrato-produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarContratoProduto(req: Request, res: Response) {
  try {
    const { 
      contrato_id, 
      produto_id, 
      preco_unitario, 
      quantidade_contratada,
      marca,
      peso,
      ativo = true 
    } = req.body;

    console.log('🔍 Criando contrato-produto');
    console.log('📦 Dados recebidos:', { contrato_id, produto_id, preco_unitario, quantidade_contratada, marca, peso, ativo });

    if (!contrato_id || !produto_id || preco_unitario === undefined || quantidade_contratada === undefined) {
      return res.status(400).json({ 
        success: false,
        message: 'Campos obrigatórios: contrato_id, produto_id, preco_unitario, quantidade_contratada' 
      });
    }

    // Verificar se o contrato existe
    const contratoCheck = await db.query(`
      SELECT id FROM contratos WHERE id = $1
    `, [contrato_id]);

    if (contratoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato não encontrado"
      });
    }

    // Verificar se o produto existe
    const produtoCheck = await db.query(`
      SELECT id, nome FROM produtos WHERE id = $1
    `, [produto_id]);

    if (produtoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    // Check if product already exists in this contract
    const existingCheck = await db.query(`
      SELECT cp.id 
      FROM contrato_produtos cp
      WHERE cp.contrato_id = $1 AND cp.produto_id = $2
    `, [contrato_id, produto_id]);

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Este produto já está adicionado a este contrato"
      });
    }

    // Verificar se coluna peso existe em contrato_produtos
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contrato_produtos' 
      AND column_name = 'peso'
    `);
    
    const pesoExists = columnCheck.rows.length > 0;
    console.log('📋 Coluna peso existe em contrato_produtos:', pesoExists);

    // Verificar se coluna marca existe
    const marcaCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contrato_produtos' 
      AND column_name = 'marca'
    `);
    
    const marcaExists = marcaCheck.rows.length > 0;
    console.log('📋 Coluna marca existe em contrato_produtos:', marcaExists);

    let result;
    if (pesoExists && marcaExists) {
      const sqlQuery = `
        INSERT INTO contrato_produtos (
          contrato_id, produto_id, preco_unitario, quantidade_contratada, 
          marca, peso, ativo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      console.log('📝 Query SQL (com peso e marca)');
      result = await db.query(sqlQuery, [contrato_id, produto_id, preco_unitario, quantidade_contratada, marca, peso, ativo]);
    } else if (marcaExists) {
      const sqlQuery = `
        INSERT INTO contrato_produtos (
          contrato_id, produto_id, preco_unitario, quantidade_contratada, 
          marca, ativo
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      console.log('📝 Query SQL (só com marca)');
      result = await db.query(sqlQuery, [contrato_id, produto_id, preco_unitario, quantidade_contratada, marca, ativo]);
    } else {
      const sqlQuery = `
        INSERT INTO contrato_produtos (
          contrato_id, produto_id, preco_unitario, quantidade_contratada, ativo
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      console.log('📝 Query SQL (sem marca e peso)');
      result = await db.query(sqlQuery, [contrato_id, produto_id, preco_unitario, quantidade_contratada, ativo]);
    }

    console.log('✅ Contrato-produto criado com sucesso');

    res.json({
      success: true,
      message: "Contrato-produto criado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar contrato-produto:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : 'N/A');
    res.status(500).json({
      success: false,
      message: "Erro ao criar contrato-produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarContratoProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { 
      preco_unitario, 
      quantidade_contratada, 
      marca,
      peso,
      ativo
    } = req.body;

    console.log('🔍 Editando contrato-produto:', id);
    console.log('📦 Dados recebidos:', { preco_unitario, quantidade_contratada, marca, peso, ativo });

    // Verificar se coluna peso existe em contrato_produtos
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contrato_produtos' 
      AND column_name = 'peso'
    `);
    
    const pesoExists = columnCheck.rows.length > 0;
    console.log('📋 Coluna peso existe em contrato_produtos:', pesoExists);

    // Verificar se coluna marca existe
    const marcaCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contrato_produtos' 
      AND column_name = 'marca'
    `);
    
    const marcaExists = marcaCheck.rows.length > 0;
    console.log('📋 Coluna marca existe em contrato_produtos:', marcaExists);

    // Construir query dinamicamente apenas com campos fornecidos
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (preco_unitario !== undefined) {
      updates.push(`preco_unitario = $${paramIndex++}`);
      values.push(preco_unitario);
    }

    if (quantidade_contratada !== undefined) {
      updates.push(`quantidade_contratada = $${paramIndex++}`);
      values.push(quantidade_contratada);
    }

    if (marcaExists && marca !== undefined) {
      updates.push(`marca = $${paramIndex++}`);
      values.push(marca);
    }

    if (pesoExists && peso !== undefined) {
      updates.push(`peso = $${paramIndex++}`);
      values.push(peso);
    }

    if (ativo !== undefined) {
      updates.push(`ativo = $${paramIndex++}`);
      values.push(ativo);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nenhum campo para atualizar"
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sqlQuery = `
      UPDATE contrato_produtos SET
        ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    console.log('📝 Query SQL:', sqlQuery);
    console.log('📝 Valores:', values);

    const result = await db.query(sqlQuery, values);

    if (result.rows.length === 0) {
      console.log('❌ Contrato-produto não encontrado');
      return res.status(404).json({
        success: false,
        message: "Contrato-produto não encontrado"
      });
    }

    console.log('✅ Contrato-produto atualizado com sucesso');

    res.json({
      success: true,
      message: "Contrato-produto atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar contrato-produto:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : 'N/A');
    res.status(500).json({
      success: false,
      message: "Erro ao editar contrato-produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerContratoProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Verificar se o contrato-produto está sendo usado em pedidos
    const usageCheck = await db.query(`
      SELECT COUNT(*) as count 
      FROM pedido_itens 
      WHERE contrato_produto_id = $1
    `, [id]);

    const isUsed = parseInt(usageCheck.rows[0].count) > 0;

    if (isUsed) {
      return res.status(400).json({
        success: false,
        message: "Não é possível excluir este item pois ele está sendo usado em pedidos. Exclua os pedidos relacionados primeiro ou desative o item.",
        error: "Item em uso"
      });
    }

    // Se não está sendo usado, pode deletar
    const result = await db.query(`
      DELETE FROM contrato_produtos WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato-produto não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Contrato-produto removido com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao remover contrato-produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover contrato-produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
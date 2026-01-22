// Controller de contrato-produtos para PostgreSQL - Versão Segura
import { Request, Response } from "express";
import { setTenantContextFromRequest } from "../../../utils/tenantContext";
const db = require("../../../database");

export async function listarContratoProdutos(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }
    
    // Check if unidade column exists in contrato_produtos table
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name = 'unidade'
    `);
    const unidadeColumnExists = columnCheck.rows.length > 0;

    let query;
    if (unidadeColumnExists) {
      query = `
        SELECT 
          cp.id,
          cp.contrato_id,
          cp.produto_id,
          cp.preco_unitario,
          cp.quantidade_contratada as limite,
          cp.preco_unitario as preco,
          cp.quantidade_contratada as saldo,
          COALESCE(cp.unidade, 'Kg') as unidade_medida,
          cp.marca,
          cp.peso,
          p.nome as produto_nome,
          c.numero as contrato_numero
        FROM contrato_produtos cp
        LEFT JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN contratos c ON cp.contrato_id = c.id
        ORDER BY c.numero, p.nome
      `;
    } else {
      query = `
        SELECT 
          cp.id,
          cp.contrato_id,
          cp.produto_id,
          cp.preco_unitario,
          cp.quantidade_contratada as limite,
          cp.preco_unitario as preco,
          cp.quantidade_contratada as saldo,
          'Kg' as unidade_medida,
          cp.marca,
          cp.peso,
          p.nome as produto_nome,
          c.numero as contrato_numero
        FROM contrato_produtos cp
        LEFT JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN contratos c ON cp.contrato_id = c.id
        ORDER BY c.numero, p.nome
      `;
    }
    
    // IMPORTANTE: Filtrar por tenant_id através do contrato
    const result = await db.query(query, []);

    const contratoProdutos = result.rows;
    
    res.json({
      success: true,
      data: contratoProdutos,
      total: contratoProdutos.length
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
    
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }
    
    // Check if unidade column exists in contrato_produtos table
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name = 'unidade'
    `);
    const unidadeColumnExists = columnCheck.rows.length > 0;

    let query;
    if (unidadeColumnExists) {
      // Use contract unit if column exists
      query = `
        SELECT 
          cp.id,
          cp.contrato_id,
          cp.produto_id,
          cp.preco_unitario,
          cp.quantidade_contratada as limite,
          cp.preco_unitario as preco,
          cp.quantidade_contratada as saldo,
          COALESCE(cp.unidade, 'Kg') as unidade_medida,
          cp.marca,
          cp.peso,
          p.nome as produto_nome,
          p.descricao as produto_descricao,
          p.categoria,
          c.numero as contrato_numero,
          f.nome as fornecedor_nome
        FROM contrato_produtos cp
        LEFT JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN contratos c ON cp.contrato_id = c.id
        LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.contrato_id = $1
        ORDER BY p.nome
      `;
    } else {
      // Use product unit if contract unit column doesn't exist yet
      query = `
        SELECT 
          cp.id,
          cp.contrato_id,
          cp.produto_id,
          cp.preco_unitario,
          cp.quantidade_contratada as limite,
          cp.preco_unitario as preco,
          cp.quantidade_contratada as saldo,
          'Kg' as unidade_medida,
          cp.marca,
          cp.peso,
          p.nome as produto_nome,
          p.descricao as produto_descricao,
          p.categoria,
          c.numero as contrato_numero,
          f.nome as fornecedor_nome
        FROM contrato_produtos cp
        LEFT JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN contratos c ON cp.contrato_id = c.id
        LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.contrato_id = $1
        ORDER BY p.nome
      `;
    }
    
    // IMPORTANTE: Filtrar por contrato
    const result = await db.query(query, [contrato_id]);

    const produtos = result.rows;
    
    res.json({
      success: true,
      data: produtos,
      total: produtos.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar produtos por contrato:", error);
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
    
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }
    
    // Check if unidade column exists in contrato_produtos table
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name = 'unidade'
    `);
    const unidadeColumnExists = columnCheck.rows.length > 0;

    let query;
    if (unidadeColumnExists) {
      query = `
        SELECT 
          cp.id,
          cp.contrato_id,
          cp.produto_id,
          cp.preco_unitario,
          cp.quantidade_contratada,
          COALESCE(cp.unidade, 'Kg') as unidade,
          cp.marca,
          cp.peso,
          p.nome as produto_nome,
          c.numero as contrato_numero
        FROM contrato_produtos cp
        INNER JOIN produtos p ON cp.produto_id = p.id
        INNER JOIN contratos c ON cp.contrato_id = c.id
        WHERE c.fornecedor_id = $1 AND cp.ativo = true
        ORDER BY c.numero, p.nome
      `;
    } else {
      query = `
        SELECT 
          cp.id,
          cp.contrato_id,
          cp.produto_id,
          cp.preco_unitario,
          cp.quantidade_contratada,
          'Kg' as unidade,
          cp.marca,
          cp.peso,
          p.nome as produto_nome,
          c.numero as contrato_numero
        FROM contrato_produtos cp
        INNER JOIN produtos p ON cp.produto_id = p.id
        INNER JOIN contratos c ON cp.contrato_id = c.id
        WHERE c.fornecedor_id = $1 AND cp.ativo = true
        ORDER BY c.numero, p.nome
      `;
    }
    
    // IMPORTANTE: Filtrar por fornecedor
    const result = await db.query(query, [fornecedor_id]);

    const produtos = result.rows;
    
    res.json({
      success: true,
      data: produtos,
      total: produtos.length
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
    
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }
    
    // Check if unidade column exists in contrato_produtos table
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name = 'unidade'
    `);
    const unidadeColumnExists = columnCheck.rows.length > 0;

    let query;
    if (unidadeColumnExists) {
      query = `
        SELECT 
          cp.*,
          p.nome as produto_nome,
          COALESCE(cp.unidade, 'Kg') as unidade_medida,
          cp.marca,
          cp.peso,
          c.numero as contrato_numero
        FROM contrato_produtos cp
        LEFT JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN contratos c ON cp.contrato_id = c.id
        WHERE cp.id = $1
      `;
    } else {
      query = `
        SELECT 
          cp.*,
          p.nome as produto_nome,
          'Kg' as unidade_medida,
          cp.marca,
          cp.peso,
          c.numero as contrato_numero
        FROM contrato_produtos cp
        LEFT JOIN produtos p ON cp.produto_id = p.id
        LEFT JOIN contratos c ON cp.contrato_id = c.id
        WHERE cp.id = $1
      `;
    }
    
    // IMPORTANTE: Buscar contrato-produto por ID
    const result = await db.query(query, [id]);

    const contratoProduto = result.rows[0];

    if (!contratoProduto) {
      return res.status(404).json({
        success: false,
        message: "Contrato-produto não encontrado"
      });
    }

    res.json({
      success: true,
      data: contratoProduto
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
    const { contrato_id, produto_id, preco_unitario, quantidade_contratada, unidade, marca, peso, ativo = true } = req.body;

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    if (!contrato_id || !produto_id || preco_unitario === undefined || quantidade_contratada === undefined) {
      return res.status(400).json({ 
        success: false,
        message: 'Campos obrigatórios: contrato_id, produto_id, preco_unitario, quantidade_contratada' 
      });
    }

    // IMPORTANTE: Verificar se o contrato existe (sem tenant_id pois contratos não tem essa coluna)
    const contratoCheck = await db.query(`
      SELECT id FROM contratos WHERE id = $1
    `, [contrato_id]);

    if (contratoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato não encontrado"
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

    // Check if unidade, marca, and peso columns exist
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name IN ('unidade', 'marca', 'peso')
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const hasUnidade = existingColumns.includes('unidade');
    const hasMarca = existingColumns.includes('marca');
    const hasPeso = existingColumns.includes('peso');

    let result;
    const fields = ['contrato_id', 'produto_id', 'preco_unitario', 'quantidade_contratada'];
    const values = [contrato_id, produto_id, preco_unitario, quantidade_contratada];
    let paramCount = 5;
    
    if (hasUnidade && unidade) {
      fields.push('unidade');
      values.push(unidade);
      paramCount++;
    }
    
    if (hasMarca && marca) {
      fields.push('marca');
      values.push(marca);
      paramCount++;
    }
    
    if (hasPeso && peso) {
      fields.push('peso');
      values.push(peso);
      paramCount++;
    }
    
    fields.push('ativo');
    values.push(ativo);
    
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    result = await db.query(`
      INSERT INTO contrato_produtos (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `, values);

    res.json({
      success: true,
      message: "Contrato-produto criado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar contrato-produto:", error);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: "Este produto já está adicionado a este contrato"
      });
    }
    
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
      contrato_id,
      produto_id,
      quantidade_contratada,
      preco_unitario,
      unidade,
      marca,
      peso,
      ativo
    } = req.body;

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    // Check if unidade, marca, and peso columns exist
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name IN ('unidade', 'marca', 'peso')
    `);
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const unidadeColumnExists = existingColumns.includes('unidade');
    const marcaColumnExists = existingColumns.includes('marca');
    const pesoColumnExists = existingColumns.includes('peso');

    const campos: string[] = [];
    const valores: any[] = [];
    let paramCount = 1;

    if (contrato_id !== undefined) {
      campos.push(`contrato_id = $${paramCount}`);
      valores.push(contrato_id);
      paramCount++;
    }

    if (produto_id !== undefined) {
      campos.push(`produto_id = $${paramCount}`);
      valores.push(produto_id);
      paramCount++;
    }

    if (preco_unitario !== undefined) {
      campos.push(`preco_unitario = $${paramCount}`);
      valores.push(preco_unitario);
      paramCount++;
    }

    if (quantidade_contratada !== undefined) {
      campos.push(`quantidade_contratada = $${paramCount}`);
      valores.push(quantidade_contratada);
      paramCount++;
    }

    if (unidade !== undefined && unidadeColumnExists) {
      campos.push(`unidade = $${paramCount}`);
      valores.push(unidade);
      paramCount++;
    }

    if (marca !== undefined && marcaColumnExists) {
      campos.push(`marca = $${paramCount}`);
      valores.push(marca);
      paramCount++;
    }

    if (peso !== undefined && pesoColumnExists) {
      campos.push(`peso = $${paramCount}`);
      valores.push(peso);
      paramCount++;
    }

    if (ativo !== undefined) {
      campos.push(`ativo = $${paramCount}`);
      valores.push(ativo);
      paramCount++;
    }

    if (campos.length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
    }

    valores.push(id);

    // IMPORTANTE: Atualizar contrato-produto
    const query = `
      UPDATE contrato_produtos cp
      SET ${campos.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE cp.id = $${paramCount}
      RETURNING cp.*
    `;

    const result = await db.query(query, valores);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato-produto não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Contrato-produto atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar contrato-produto:", error);
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

    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    // IMPORTANTE: Verificar se o contrato-produto existe
    const checkResult = await db.query(`
      SELECT cp.* 
      FROM contrato_produtos cp
      WHERE cp.id = $1
    `, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato-produto não encontrado"
      });
    }

    // Remover o contrato-produto
    const result = await db.query(`
      DELETE FROM contrato_produtos cp
      WHERE cp.id = $1
      RETURNING cp.*
    `, [id]);

    res.json({
      success: true,
      message: "Contrato-produto removido com sucesso",
      data: {
        contrato_produto: result.rows[0]
      }
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

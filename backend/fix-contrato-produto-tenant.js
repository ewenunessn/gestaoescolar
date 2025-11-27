const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/contratos/controllers/contratoProdutoController.ts');

const newContent = `// Controller de contrato-produtos para PostgreSQL - Versão Segura
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
    
    // IMPORTANTE: Filtrar por tenant_id através do contrato
    const result = await db.query(\`
      SELECT 
        cp.id,
        cp.contrato_id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada as limite,
        cp.preco_unitario as preco,
        cp.quantidade_contratada as saldo,
        p.nome as produto_nome,
        p.unidade as unidade_medida,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      LEFT JOIN produtos p ON cp.produto_id = p.id
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      WHERE c.tenant_id = $1
      ORDER BY c.numero, p.nome
    \`, [req.tenant.id]);

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
    
    // IMPORTANTE: Filtrar por tenant_id através do contrato
    const result = await db.query(\`
      SELECT 
        cp.id,
        cp.contrato_id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada as limite,
        cp.preco_unitario as preco,
        cp.quantidade_contratada as saldo,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.unidade as unidade_medida,
        p.categoria,
        c.numero as contrato_numero,
        f.nome as fornecedor_nome
      FROM contrato_produtos cp
      LEFT JOIN produtos p ON cp.produto_id = p.id
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE cp.contrato_id = $1 AND c.tenant_id = $2
      ORDER BY p.nome
    \`, [contrato_id, req.tenant.id]);

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
    
    // IMPORTANTE: Filtrar por tenant_id através do contrato
    const result = await db.query(\`
      SELECT 
        cp.id,
        cp.contrato_id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada,
        p.nome as produto_nome,
        p.marca,
        p.unidade,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      INNER JOIN produtos p ON cp.produto_id = p.id
      INNER JOIN contratos c ON cp.contrato_id = c.id
      WHERE c.fornecedor_id = $1 AND cp.ativo = true AND c.tenant_id = $2
      ORDER BY c.numero, p.nome
    \`, [fornecedor_id, req.tenant.id]);

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
    
    // IMPORTANTE: Filtrar por tenant_id através do contrato
    const result = await db.query(\`
      SELECT 
        cp.*,
        p.nome as produto_nome,
        p.unidade as unidade_medida,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      LEFT JOIN produtos p ON cp.produto_id = p.id
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      WHERE cp.id = $1 AND c.tenant_id = $2
    \`, [id, req.tenant.id]);

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
    const { contrato_id, produto_id, preco_unitario, quantidade_contratada, ativo = true } = req.body;

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
        erro: 'Campos obrigatórios: contrato_id, produto_id, preco_unitario, quantidade_contratada' 
      });
    }

    // IMPORTANTE: Verificar se o contrato pertence ao tenant
    const contratoCheck = await db.query(\`
      SELECT id FROM contratos WHERE id = $1 AND tenant_id = $2
    \`, [contrato_id, req.tenant.id]);

    if (contratoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato não encontrado ou você não tem permissão"
      });
    }

    const result = await db.query(\`
      INSERT INTO contrato_produtos (contrato_id, produto_id, preco_unitario, quantidade_contratada, ativo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    \`, [contrato_id, produto_id, preco_unitario, quantidade_contratada, ativo]);

    res.json({
      success: true,
      message: "Contrato-produto criado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar contrato-produto:", error);
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

    const campos: string[] = [];
    const valores: any[] = [];
    let paramCount = 1;

    if (contrato_id !== undefined) {
      campos.push(\`contrato_id = $\${paramCount}\`);
      valores.push(contrato_id);
      paramCount++;
    }

    if (produto_id !== undefined) {
      campos.push(\`produto_id = $\${paramCount}\`);
      valores.push(produto_id);
      paramCount++;
    }

    if (preco_unitario !== undefined) {
      campos.push(\`preco_unitario = $\${paramCount}\`);
      valores.push(preco_unitario);
      paramCount++;
    }

    if (quantidade_contratada !== undefined) {
      campos.push(\`quantidade_contratada = $\${paramCount}\`);
      valores.push(quantidade_contratada);
      paramCount++;
    }

    if (ativo !== undefined) {
      campos.push(\`ativo = $\${paramCount}\`);
      valores.push(ativo);
      paramCount++;
    }

    if (campos.length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
    }

    valores.push(id);
    valores.push(req.tenant.id);

    // IMPORTANTE: Filtrar por tenant_id através do contrato
    const query = \`
      UPDATE contrato_produtos cp
      SET \${campos.join(', ')}, updated_at = CURRENT_TIMESTAMP
      FROM contratos c
      WHERE cp.id = $\${paramCount} 
        AND cp.contrato_id = c.id 
        AND c.tenant_id = $\${paramCount + 1}
      RETURNING cp.*
    \`;

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

    // IMPORTANTE: Verificar se o contrato-produto pertence ao tenant antes de remover
    const checkResult = await db.query(\`
      SELECT cp.* 
      FROM contrato_produtos cp
      INNER JOIN contratos c ON cp.contrato_id = c.id
      WHERE cp.id = $1 AND c.tenant_id = $2
    \`, [id, req.tenant.id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato-produto não encontrado"
      });
    }

    // Remover o contrato-produto
    const result = await db.query(\`
      DELETE FROM contrato_produtos cp
      USING contratos c
      WHERE cp.id = $1 
        AND cp.contrato_id = c.id 
        AND c.tenant_id = $2
      RETURNING cp.*
    \`, [id, req.tenant.id]);

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
`;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ contratoProdutoController.ts corrigido com segurança de tenant!');

const fs = require('fs');
const path = require('path');

// Templates básicos para controllers
const templates = {
  produto: `// Controller de produtos para PostgreSQL
import { Request, Response } from "express";
const db = require("../../../database");

export async function listarProdutos(req: Request, res: Response) {
  try {
    const result = await db.query(\`
      SELECT 
        p.id,
        p.nome,
        p.descricao,
        p.unidade,
        p.ativo,
        p.created_at
      FROM produtos p
      ORDER BY p.nome
    \`);

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

export async function buscarProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(\`
      SELECT * FROM produtos WHERE id = $1
    \`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarProduto(req: Request, res: Response) {
  try {
    const { nome, descricao, unidade, ativo = true } = req.body;

    const result = await db.query(\`
      INSERT INTO produtos (nome, descricao, unidade, ativo, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    \`, [nome, descricao, unidade, ativo]);

    res.json({
      success: true,
      message: "Produto criado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nome, descricao, unidade, ativo } = req.body;

    const result = await db.query(\`
      UPDATE produtos SET
        nome = $1,
        descricao = $2,
        unidade = $3,
        ativo = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    \`, [nome, descricao, unidade, ativo, id]);

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

export async function removerProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(\`
      DELETE FROM produtos WHERE id = $1 RETURNING *
    \`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Produto removido com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao remover produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}`,

  contrato: `// Controller de contratos para PostgreSQL
import { Request, Response } from "express";
const db = require("../../../database");

export async function listarContratos(req: Request, res: Response) {
  try {
    const result = await db.query(\`
      SELECT 
        c.id,
        c.numero,
        c.fornecedor_id,
        f.nome as fornecedor_nome,
        c.data_inicio,
        c.data_fim,
        c.valor_total,
        c.status,
        c.ativo,
        c.created_at
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      ORDER BY c.numero
    \`);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
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

    const result = await db.query(\`
      SELECT * FROM contratos WHERE id = $1
    \`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato não encontrado"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
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

export async function criarContrato(req: Request, res: Response) {
  try {
    const { numero, fornecedor_id, data_inicio, data_fim, valor_total, status = 'ativo', ativo = true } = req.body;

    const result = await db.query(\`
      INSERT INTO contratos (numero, fornecedor_id, data_inicio, data_fim, valor_total, status, ativo, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    \`, [numero, fornecedor_id, data_inicio, data_fim, valor_total, status, ativo]);

    res.json({
      success: true,
      message: "Contrato criado com sucesso",
      data: result.rows[0]
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
    const { numero, fornecedor_id, data_inicio, data_fim, valor_total, status, ativo } = req.body;

    const result = await db.query(\`
      UPDATE contratos SET
        numero = $1,
        fornecedor_id = $2,
        data_inicio = $3,
        data_fim = $4,
        valor_total = $5,
        status = $6,
        ativo = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    \`, [numero, fornecedor_id, data_inicio, data_fim, valor_total, status, ativo, id]);

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

    const result = await db.query(\`
      DELETE FROM contratos WHERE id = $1 RETURNING *
    \`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Contrato removido com sucesso",
      data: result.rows[0]
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
    const result = await db.query(\`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'ativo' THEN 1 END) as ativos,
        COUNT(CASE WHEN status = 'inativo' THEN 1 END) as inativos,
        SUM(valor_total) as valor_total
      FROM contratos
    \`);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao obter estatísticas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter estatísticas",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}`
};

function recreateControllers() {
  console.log('🔧 Recriando controllers quebrados...');
  
  const controllersToFix = [
    { path: 'src/modules/produtos/controllers/produtoController.ts', template: 'produto' },
    { path: 'src/modules/contratos/controllers/contratoController.ts', template: 'contrato' }
  ];
  
  controllersToFix.forEach(({ path: filePath, template }) => {
    const fullPath = path.join(__dirname, filePath);
    
    try {
      fs.writeFileSync(fullPath, templates[template]);
      console.log(\`✅ Recriado: \${filePath}\`);
    } catch (error) {
      console.error(\`❌ Erro ao recriar \${filePath}:\`, error.message);
    }
  });
  
  console.log('✅ Recriação de controllers concluída!');
}

recreateControllers();
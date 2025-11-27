const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/contratos/controllers/contratoController.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Encontrar e substituir a função buscarContratos
const oldFunction = `export const buscarContratos = async (req: Request, res: Response) => {
  try {
    const { 
      ativo = 'true',
      fornecedor_id,
      escola_id,
      data_inicio,
      data_fim,
      search
    } = req.query;

    let query = \`
      SELECT 
        c.id,
        c.fornecedor_id,
        f.nome as fornecedor_nome,
        c.escola_id,
        e.nome as escola_nome,
        c.numero_contrato,
        c.data_inicio,
        c.data_fim,
        c.valor_total,
        c.descricao,
        c.ativo,
        c.created_at,
        COALESCE(SUM(cp.quantidade_contratada * cp.preco_unitario), c.valor_total, 0) as valor_total_calculado,
        COALESCE(SUM(cp.quantidade_contratada * cp.preco_unitario), 0) as valor_calculado,
        COUNT(cp.id) as total_produtos
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      JOIN escolas e ON c.escola_id = e.id
      LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id AND cp.ativo = true
    \`;
    
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (ativo !== undefined && ativo !== '') {
      conditions.push(\`c.ativo = \${paramCount}\`);
      values.push(ativo === 'true');
      paramCount++;
    }

    if (fornecedor_id) {
      conditions.push(\`c.fornecedor_id = \${paramCount}\`);
      values.push(parseInt(fornecedor_id as string));
      paramCount++;
    }

    if (escola_id) {
      conditions.push(\`c.escola_id = \${paramCount}\`);
      values.push(parseInt(escola_id as string));
      paramCount++;
    }

    if (data_inicio) {
      conditions.push(\`c.data_inicio >= \${paramCount}\`);
      values.push(data_inicio);
      paramCount++;
    }

    if (data_fim) {
      conditions.push(\`c.data_fim <= \${paramCount}\`);
      values.push(data_fim);
      paramCount++;
    }

    if (search) {
      conditions.push(\`(
        LOWER(f.nome) LIKE LOWER(\${paramCount}) OR
        LOWER(e.nome) LIKE LOWER(\${paramCount}) OR
        LOWER(c.numero_contrato) LIKE LOWER(\${paramCount}) OR
        LOWER(c.descricao) LIKE LOWER(\${paramCount})
      )\`);
      values.push(\`%\${search}%\`);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += \` WHERE \${conditions.join(' AND ')}\`;
    }

    query += \`
      GROUP BY 
        c.id, c.fornecedor_id, f.nome, c.escola_id, e.nome,
        c.numero_contrato, c.data_inicio, c.data_fim, c.valor_total,
        c.descricao, c.ativo, c.created_at
      ORDER BY c.created_at DESC
    \`;

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    res.status(500).json({ erro: 'Erro ao buscar contratos' });
  }
};`;

const newFunction = `export const buscarContratos = async (req: Request, res: Response) => {
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
    
    const { 
      ativo = 'true',
      fornecedor_id,
      escola_id,
      data_inicio,
      data_fim,
      search
    } = req.query;

    let query = \`
      SELECT 
        c.id,
        c.fornecedor_id,
        f.nome as fornecedor_nome,
        c.escola_id,
        e.nome as escola_nome,
        c.numero_contrato,
        c.data_inicio,
        c.data_fim,
        c.valor_total,
        c.descricao,
        c.ativo,
        c.created_at,
        COALESCE(SUM(cp.quantidade_contratada * cp.preco_unitario), c.valor_total, 0) as valor_total_calculado,
        COALESCE(SUM(cp.quantidade_contratada * cp.preco_unitario), 0) as valor_calculado,
        COUNT(cp.id) as total_produtos
      FROM contratos c
      JOIN fornecedores f ON c.fornecedor_id = f.id
      JOIN escolas e ON c.escola_id = e.id
      LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id AND cp.ativo = true
    \`;
    
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // IMPORTANTE: Sempre filtrar por tenant_id
    conditions.push(\`c.tenant_id = $\${paramCount}\`);
    values.push(req.tenant.id);
    paramCount++;

    if (ativo !== undefined && ativo !== '') {
      conditions.push(\`c.ativo = $\${paramCount}\`);
      values.push(ativo === 'true');
      paramCount++;
    }

    if (fornecedor_id) {
      conditions.push(\`c.fornecedor_id = $\${paramCount}\`);
      values.push(parseInt(fornecedor_id as string));
      paramCount++;
    }

    if (escola_id) {
      conditions.push(\`c.escola_id = $\${paramCount}\`);
      values.push(parseInt(escola_id as string));
      paramCount++;
    }

    if (data_inicio) {
      conditions.push(\`c.data_inicio >= $\${paramCount}\`);
      values.push(data_inicio);
      paramCount++;
    }

    if (data_fim) {
      conditions.push(\`c.data_fim <= $\${paramCount}\`);
      values.push(data_fim);
      paramCount++;
    }

    if (search) {
      conditions.push(\`(
        LOWER(f.nome) LIKE LOWER($\${paramCount}) OR
        LOWER(e.nome) LIKE LOWER($\${paramCount}) OR
        LOWER(c.numero_contrato) LIKE LOWER($\${paramCount}) OR
        LOWER(c.descricao) LIKE LOWER($\${paramCount})
      )\`);
      values.push(\`%\${search}%\`);
      paramCount++;
    }

    query += \` WHERE \${conditions.join(' AND ')}\`;

    query += \`
      GROUP BY 
        c.id, c.fornecedor_id, f.nome, c.escola_id, e.nome,
        c.numero_contrato, c.data_inicio, c.data_fim, c.valor_total,
        c.descricao, c.ativo, c.created_at
      ORDER BY c.created_at DESC
    \`;

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar contratos:', error);
    res.status(500).json({ erro: 'Erro ao buscar contratos' });
  }
};`;

if (content.includes('export const buscarContratos')) {
  content = content.replace(oldFunction, newFunction);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Função buscarContratos corrigida com sucesso!');
} else {
  console.log('❌ Função buscarContratos não encontrada');
}

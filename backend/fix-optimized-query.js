// Fix for the optimized query parameter issue
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/utils/optimizedQueries.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the problematic function
const functionStart = content.indexOf('export const getEstoqueEscolarResumoOptimized = async (');
const functionEnd = content.indexOf('};', functionStart) + 2;

const newFunction = `export const getEstoqueEscolarResumoOptimized = async (
  tenantId?: string, 
  options: { limit?: number; offset?: number; categoria?: string } = {}
) => {
  const { limit = 100, offset = 0, categoria } = options;
  
  // Build parameters array with consistent indexing
  let params: any[] = [];
  let tenantParam = '';
  let categoriaParam = '';
  let limitParam = '';
  let offsetParam = '';
  
  if (tenantId) {
    params.push(tenantId);
    tenantParam = \`$\${params.length}\`;
  }
  
  if (categoria) {
    params.push(categoria);
    categoriaParam = \`$\${params.length}\`;
  }
  
  params.push(limit);
  limitParam = \`$\${params.length}\`;
  
  params.push(offset);
  offsetParam = \`$\${params.length}\`;
  
  // Build WHERE clause
  let whereClause = 'WHERE p.ativo = true';
  if (tenantId) {
    whereClause += \` AND p.tenant_id = \${tenantParam}\`;
  }
  if (categoria) {
    whereClause += \` AND p.categoria = \${categoriaParam}\`;
  }
  
  const query = \`
    WITH produtos_filtrados AS (
      SELECT p.id, p.nome, p.descricao, p.unidade, p.categoria
      FROM produtos p
      \${whereClause}
      ORDER BY p.categoria NULLS LAST, p.nome
      LIMIT \${limitParam} OFFSET \${offsetParam}
    ),
    escolas_tenant AS (
      SELECT COUNT(*) as total_escolas_tenant
      FROM escolas e
      WHERE e.ativo = true \${tenantId ? \`AND e.tenant_id = \${tenantParam}\` : ''}
    ),
    estoque_agregado AS (
      SELECT 
        pf.id as produto_id,
        pf.nome as produto_nome,
        pf.descricao as produto_descricao,
        pf.unidade,
        pf.categoria,
        et.total_escolas_tenant as total_escolas,
        COUNT(DISTINCT ee.escola_id) FILTER (WHERE ee.quantidade_atual > 0) as total_escolas_com_estoque,
        COALESCE(SUM(ee.quantidade_atual), 0) as total_quantidade,
        COALESCE(SUM(el.quantidade_atual), 0) as total_quantidade_lotes
      FROM produtos_filtrados pf
      CROSS JOIN escolas_tenant et
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = pf.id \${tenantId ? \`AND ee.tenant_id = \${tenantParam}\` : ''})
      LEFT JOIN estoque_lotes el ON (el.produto_id = pf.id AND el.status = 'ativo' \${tenantId ? \`AND el.tenant_id = \${tenantParam}\` : ''})
      GROUP BY pf.id, pf.nome, pf.descricao, pf.unidade, pf.categoria, et.total_escolas_tenant
    )
    SELECT *,
      (total_quantidade + total_quantidade_lotes) as quantidade_total_real
    FROM estoque_agregado
    ORDER BY categoria NULLS LAST, produto_nome
  \`;
  
  const result = await db.query(query, params);
  return result.rows;
}`;

// Replace the function
const newContent = content.substring(0, functionStart) + newFunction + content.substring(functionEnd);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ Fixed optimized query parameter issue');
const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function verificarProdutos() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('📦 Verificando produtos por tenant...\n');
    
    // Verificar distribuição de produtos
    const result = await client.query(`
      SELECT 
        COALESCE(t.nome, 'SEM TENANT') as tenant_nome,
        COALESCE(p.tenant_id::text, 'NULL') as tenant_id,
        COUNT(*) as total_produtos
      FROM produtos p
      LEFT JOIN tenants t ON p.tenant_id = t.id
      GROUP BY p.tenant_id, t.nome
      ORDER BY total_produtos DESC
    `);
    
    console.log('📊 Distribuição de produtos:\n');
    
    let totalGeral = 0;
    result.rows.forEach(row => {
      console.log(`   ${row.tenant_nome.padEnd(40)} - ${row.total_produtos} produtos`);
      totalGeral += parseInt(row.total_produtos);
    });
    
    console.log(`\n   ${'TOTAL GERAL'.padEnd(40)} - ${totalGeral} produtos`);
    
    // Listar alguns produtos de cada tenant
    console.log('\n\n📋 Primeiros produtos de cada tenant:\n');
    
    for (const row of result.rows) {
      console.log(`\n${row.tenant_nome}:`);
      
      const produtos = await client.query(`
        SELECT nome, unidade 
        FROM produtos 
        WHERE ${row.tenant_id === 'NULL' ? 'tenant_id IS NULL' : 'tenant_id = $1'}
        ORDER BY nome
        LIMIT 5
      `, row.tenant_id === 'NULL' ? [] : [row.tenant_id]);
      
      produtos.rows.forEach((produto, index) => {
        console.log(`   ${index + 1}. ${produto.nome} (${produto.unidade || 'sem unidade'})`);
      });
      
      if (parseInt(row.total_produtos) > 5) {
        console.log(`   ... e mais ${parseInt(row.total_produtos) - 5} produtos`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

verificarProdutos();

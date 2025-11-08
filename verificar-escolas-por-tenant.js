const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function verificarEscolas() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('🏫 Verificando distribuição de escolas por tenant...\n');
    
    const result = await client.query(`
      SELECT 
        COALESCE(t.nome, 'SEM TENANT') as tenant_nome,
        COALESCE(e.tenant_id::text, 'NULL') as tenant_id,
        COUNT(*) as total_escolas
      FROM escolas e
      LEFT JOIN tenants t ON e.tenant_id = t.id
      GROUP BY e.tenant_id, t.nome
      ORDER BY total_escolas DESC
    `);
    
    console.log('📊 Distribuição de escolas:\n');
    
    let totalGeral = 0;
    result.rows.forEach(row => {
      console.log(`   ${row.tenant_nome.padEnd(40)} - ${row.total_escolas} escolas`);
      totalGeral += parseInt(row.total_escolas);
    });
    
    console.log(`\n   ${'TOTAL GERAL'.padEnd(40)} - ${totalGeral} escolas`);
    
    // Listar algumas escolas de cada tenant
    console.log('\n\n📋 Primeiras escolas de cada tenant:\n');
    
    for (const row of result.rows) {
      console.log(`\n${row.tenant_nome}:`);
      
      const escolas = await client.query(`
        SELECT nome, municipio 
        FROM escolas 
        WHERE ${row.tenant_id === 'NULL' ? 'tenant_id IS NULL' : 'tenant_id = $1'}
        ORDER BY nome
        LIMIT 5
      `, row.tenant_id === 'NULL' ? [] : [row.tenant_id]);
      
      escolas.rows.forEach((escola, index) => {
        console.log(`   ${index + 1}. ${escola.nome} - ${escola.municipio || 'Sem município'}`);
      });
      
      if (parseInt(row.total_escolas) > 5) {
        console.log(`   ... e mais ${parseInt(row.total_escolas) - 5} escolas`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

verificarEscolas();

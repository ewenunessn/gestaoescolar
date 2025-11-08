const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function verificarTabelas() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('🔍 Verificando tabelas que precisam de tenant_id...\n');
    
    // Buscar todas as tabelas
    const tabelas = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE 'tenant_%'
      ORDER BY table_name
    `);
    
    console.log(`📋 Total de tabelas: ${tabelas.rows.length}\n`);
    
    for (const row of tabelas.rows) {
      const tabela = row.table_name;
      
      // Verificar se tem tenant_id
      const temTenantId = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'tenant_id'
      `, [tabela]);
      
      // Contar registros
      const count = await client.query(`SELECT COUNT(*) as count FROM ${tabela}`);
      const total = parseInt(count.rows[0].count);
      
      if (temTenantId.rows.length > 0) {
        console.log(`✅ ${tabela.padEnd(30)} - ${total} registros (tem tenant_id)`);
      } else if (total > 0) {
        console.log(`⚠️  ${tabela.padEnd(30)} - ${total} registros (SEM tenant_id)`);
      } else {
        console.log(`   ${tabela.padEnd(30)} - vazia`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

verificarTabelas();

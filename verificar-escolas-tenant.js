const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function verificarEscolas() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const tenantId = '00000000-0000-0000-0000-000000000000';
    console.log('🔍 Verificando escolas do tenant Sistema Principal...');
    console.log('Tenant ID:', tenantId);
    
    // Verificar se a tabela escolas tem coluna tenant_id
    const colunas = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'escolas'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Colunas da tabela escolas:');
    colunas.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    const temTenantId = colunas.rows.some(col => col.column_name === 'tenant_id');
    
    if (temTenantId) {
      // Contar escolas do tenant
      const count = await client.query(`
        SELECT COUNT(*) as total FROM escolas WHERE tenant_id = $1
      `, [tenantId]);
      
      console.log(`\n📊 Total de escolas do tenant: ${count.rows[0].total}`);
      
      // Listar algumas escolas
      const escolas = await client.query(`
        SELECT id, nome, tenant_id FROM escolas WHERE tenant_id = $1 LIMIT 5
      `, [tenantId]);
      
      if (escolas.rows.length > 0) {
        console.log('\n🏫 Primeiras escolas:');
        escolas.rows.forEach(e => {
          console.log(`  - ${e.nome} (ID: ${e.id})`);
        });
      } else {
        console.log('\n⚠️ Nenhuma escola encontrada para este tenant!');
      }
    } else {
      console.log('\n⚠️ Tabela escolas NÃO tem coluna tenant_id!');
      console.log('Isso significa que o sistema não está usando multi-tenancy para escolas.');
      
      // Contar total de escolas
      const count = await client.query('SELECT COUNT(*) as total FROM escolas');
      console.log(`\n📊 Total de escolas (sem filtro de tenant): ${count.rows[0].total}`);
      
      // Listar algumas escolas
      const escolas = await client.query('SELECT id, nome FROM escolas LIMIT 5');
      if (escolas.rows.length > 0) {
        console.log('\n🏫 Primeiras escolas:');
        escolas.rows.forEach(e => {
          console.log(`  - ${e.nome} (ID: ${e.id})`);
        });
      }
    }
    
  } finally {
    await client.end();
  }
}

verificarEscolas();

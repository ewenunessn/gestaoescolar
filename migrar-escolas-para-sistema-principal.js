const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const SISTEMA_PRINCIPAL_ID = '00000000-0000-0000-0000-000000000000';
const ESCOLA_PADRAO_ID = '00000000-0000-0000-0000-000000000001';

async function migrarEscolas() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('🔄 Migrando escolas do tenant "Escola Padrão" para "Sistema Principal"...\n');
    
    // Contar escolas antes
    const antes = await client.query(`
      SELECT COUNT(*) as count FROM escolas WHERE tenant_id = $1
    `, [ESCOLA_PADRAO_ID]);
    
    console.log(`📊 Escolas no tenant "Escola Padrão": ${antes.rows[0].count}`);
    
    // Migrar escolas
    const result = await client.query(`
      UPDATE escolas 
      SET tenant_id = $1 
      WHERE tenant_id = $2
      RETURNING id, nome
    `, [SISTEMA_PRINCIPAL_ID, ESCOLA_PADRAO_ID]);
    
    console.log(`✅ ${result.rowCount} escolas migradas!\n`);
    
    // Mostrar algumas escolas migradas
    console.log('📋 Primeiras 10 escolas migradas:');
    result.rows.slice(0, 10).forEach((escola, index) => {
      console.log(`   ${index + 1}. ${escola.nome}`);
    });
    
    if (result.rowCount > 10) {
      console.log(`   ... e mais ${result.rowCount - 10} escolas`);
    }
    
    // Contar total no Sistema Principal
    const total = await client.query(`
      SELECT COUNT(*) as count FROM escolas WHERE tenant_id = $1
    `, [SISTEMA_PRINCIPAL_ID]);
    
    console.log(`\n📊 Total de escolas no Sistema Principal: ${total.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

migrarEscolas();

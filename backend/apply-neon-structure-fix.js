const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function applyFix() {
  console.log('🔧 Aplicando correções estruturais no banco Neon...\n');
  
  try {
    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'fix-neon-database-structure.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Executando script SQL...\n');
    
    // Executar o script
    const result = await neonPool.query(sql);
    
    console.log('✅ Script executado com sucesso!');
    console.log('\n📊 Resultado da verificação final:');
    
    // Verificar estrutura final
    const verification = await neonPool.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('institutions', 'tenants', 'institution_users', 'tenant_users')
      ORDER BY table_name, ordinal_position
    `);
    
    let currentTable = '';
    verification.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        currentTable = row.table_name;
        console.log(`\n📋 ${currentTable}:`);
      }
      console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao aplicar correções:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await neonPool.end();
  }
}

applyFix();

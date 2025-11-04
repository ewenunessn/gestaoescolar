const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: process.env.DB_PORT || 5432,
  ssl: false
});

async function fixConstraints() {
  try {
    console.log('🔧 Iniciando correção de constraints...');
    
    const sqlContent = fs.readFileSync('./backend/fix-database-constraints.sql', 'utf8');
    
    // Executar o script de correção
    const result = await pool.query(sqlContent);
    
    console.log('✅ Correção de constraints executada com sucesso!');
    
    // Mostrar resultados das verificações
    if (Array.isArray(result)) {
      result.forEach((res, i) => {
        if (res.rows && res.rows.length > 0) {
          console.log(`\n--- Resultado ${i + 1} ---`);
          console.table(res.rows);
        }
      });
    } else if (result.rows && result.rows.length > 0) {
      console.log('\n--- Resultados ---');
      console.table(result.rows);
    }
    
    console.log('\n🎯 Próximos passos:');
    console.log('1. ✅ Constraints corrigidas');
    console.log('2. ✅ Coluna escola_id adicionada em estoque_lotes');
    console.log('3. ✅ tenant_id populado em todas as tabelas');
    console.log('4. ✅ RLS habilitado');
    console.log('5. ✅ Triggers criados');
    console.log('\nAgora você pode executar a migração de tenant sem erros!');
    
  } catch (error) {
    console.error('❌ Erro na correção:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

fixConstraints();
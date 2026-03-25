const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function aplicarMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Aplicando migration: fix_tipo_processamento_valores\n');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '20260324_fix_tipo_processamento_valores.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar a migration
    await client.query('BEGIN');
    
    console.log('📝 Executando SQL...');
    await client.query(sql);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration aplicada com sucesso!\n');

    // Verificar os valores atuais
    console.log('📊 Verificando distribuição de tipos de processamento:\n');
    const result = await client.query(`
      SELECT 
        tipo_processamento,
        COUNT(*) as total
      FROM produtos
      WHERE ativo = true
      GROUP BY tipo_processamento
      ORDER BY total DESC
    `);

    result.rows.forEach(row => {
      console.log(`   ${row.tipo_processamento || '(vazio)'}: ${row.total} produtos`);
    });

    console.log('\n✅ Valores válidos: in natura, minimamente processado, processado, ultraprocessado');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
aplicarMigration().catch(console.error);

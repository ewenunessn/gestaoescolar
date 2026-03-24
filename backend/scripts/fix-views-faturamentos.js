const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function executarMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Corrigindo views de faturamentos...\n');

    // Ler arquivo de migration
    const migrationPath = path.join(__dirname, '../migrations/20260324_fix_views_faturamentos_only.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Executar migration
    await client.query(sql);

    console.log('✅ Views de faturamentos corrigidas com sucesso!\n');

    // Verificar as views
    console.log('🧪 Verificando as views corrigidas...\n');
    const result = await client.query(`
      SELECT 
        table_name,
        'OK' as status
      FROM information_schema.views
      WHERE table_schema = 'public' 
      AND table_name IN (
        'vw_faturamentos_detalhados',
        'vw_faturamentos_resumo_modalidades',
        'vw_faturamento_tipo_fornecedor_modalidade'
      )
      ORDER BY table_name
    `);

    console.log('📋 Views corrigidas:');
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}: ${row.status}`);
    });

    // Testar a view principal
    console.log('\n🧪 Testando consulta na view principal...\n');
    const testResult = await client.query(`
      SELECT COUNT(*) as total
      FROM vw_faturamentos_detalhados
    `);
    
    console.log(`📊 Total de registros na view: ${testResult.rows[0].total}`);

    console.log('\n✅ Migration executada com sucesso!');
    console.log('\n💡 Agora o endpoint /api/faturamentos/pedido/:id deve funcionar corretamente.');

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

executarMigration().catch(console.error);

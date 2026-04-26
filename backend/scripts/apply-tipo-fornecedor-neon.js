const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do Neon
const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function aplicarMigration() {
  console.log('🚀 Aplicando migration tipo_fornecedor no NEON\n');

  const migrationPath = path.join(__dirname, '../src/migrations/20260304_add_tipo_fornecedor.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 SQL:', sql.substring(0, 200) + '...\n');

  try {
    await neonPool.query(sql);
    console.log('✅ Migration aplicada com sucesso no NEON!\n');

    // Verificar resultado
    const result = await neonPool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'fornecedores' AND column_name = 'tipo_fornecedor'
    `);
    
    console.log('🔍 Coluna tipo_fornecedor no NEON:');
    console.log(result.rows);

    // Verificar fornecedores
    const fornecedores = await neonPool.query(`
      SELECT id, nome, tipo_fornecedor FROM fornecedores LIMIT 5
    `);
    
    console.log('\n📦 Primeiros 5 fornecedores no NEON:');
    console.log(fornecedores.rows);

    // Aplicar views
    console.log('\n🔄 Aplicando views...');
    const viewsPath = path.join(__dirname, '../src/migrations/20260304_create_views_tipo_fornecedor.sql');
    const viewsSql = fs.readFileSync(viewsPath, 'utf8');
    
    await neonPool.query(viewsSql);
    console.log('✅ Views criadas com sucesso no NEON!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  }

  await neonPool.end();
  console.log('\n✅ Script finalizado!');
  process.exit(0);
}

aplicarMigration();

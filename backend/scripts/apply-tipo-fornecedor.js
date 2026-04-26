const fs = require('fs');
const path = require('path');
const { Pool: PgPool } = require('pg');

// Configuração do banco local
const localPool = new PgPool({
  host: 'localhost',
  port: 5432,
  database: 'gestao_escolar',
  user: 'postgres',
  password: 'admin'
});

// Configuração do Neon
const neonPool = new PgPool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function aplicarMigration() {
  const migrationPath = path.join(__dirname, '../src/migrations/20260304_add_tipo_fornecedor.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('🚀 Aplicando migration: add_tipo_fornecedor');
  console.log('📄 SQL:', sql.substring(0, 200) + '...\n');

  // Aplicar no banco local
  console.log('📦 Aplicando no banco LOCAL...');
  try {
    await localPool.query(sql);
    console.log('✅ Migration aplicada com sucesso no banco LOCAL\n');
  } catch (error) {
    console.error('❌ Erro ao aplicar no banco LOCAL:', error.message);
  }

  // Aplicar no Neon
  console.log('☁️  Aplicando no banco NEON...');
  try {
    await neonPool.query(sql);
    console.log('✅ Migration aplicada com sucesso no banco NEON\n');
  } catch (error) {
    console.error('❌ Erro ao aplicar no banco NEON:', error.message);
  }

  // Verificar resultado
  console.log('🔍 Verificando estrutura da tabela fornecedores...\n');
  
  try {
    const localResult = await localPool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'fornecedores' AND column_name = 'tipo_fornecedor'
    `);
    console.log('📦 LOCAL - Coluna tipo_fornecedor:', localResult.rows);
  } catch (error) {
    console.error('❌ Erro ao verificar LOCAL:', error.message);
  }

  try {
    const neonResult = await neonPool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'fornecedores' AND column_name = 'tipo_fornecedor'
    `);
    console.log('☁️  NEON - Coluna tipo_fornecedor:', neonResult.rows);
  } catch (error) {
    console.error('❌ Erro ao verificar NEON:', error.message);
  }

  await localPool.end();
  await neonPool.end();
  console.log('\n✅ Script finalizado!');
}

aplicarMigration().catch(console.error);

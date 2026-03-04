const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function aplicarMigration() {
  const localPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'gestaoescolar',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  });

  const neonPool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📋 Aplicando migration de recebimentos...\n');

    const migrationPath = path.join(__dirname, '../src/migrations/20260304_create_recebimentos.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');

    // Aplicar no LOCAL
    console.log('🔧 Aplicando no banco LOCAL...');
    await localPool.query(migration);
    console.log('✅ Migration aplicada no LOCAL\n');

    // Verificar tabela no LOCAL
    const localCheck = await localPool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'recebimentos'
    `);
    console.log(`✅ LOCAL - Tabela recebimentos: ${localCheck.rows[0].count > 0 ? 'CRIADA' : 'NÃO ENCONTRADA'}`);

    // Aplicar no NEON
    console.log('\n🔧 Aplicando no banco NEON...');
    await neonPool.query(migration);
    console.log('✅ Migration aplicada no NEON\n');

    // Verificar tabela no NEON
    const neonCheck = await neonPool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'recebimentos'
    `);
    console.log(`✅ NEON - Tabela recebimentos: ${neonCheck.rows[0].count > 0 ? 'CRIADA' : 'NÃO ENCONTRADA'}`);

    console.log('\n✅ Migration aplicada com sucesso em ambos os bancos!');

  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

aplicarMigration();

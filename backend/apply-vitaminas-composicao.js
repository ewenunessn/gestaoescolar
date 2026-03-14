const db = require('./src/database.ts');
const fs = require('fs');
const path = require('path');

async function aplicarMigration() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', '20260313_add_vitaminas_composicao.sql'),
      'utf8'
    );
    
    console.log('Aplicando migration: 20260313_add_vitaminas_composicao.sql');
    await db.pool.query(sql);
    console.log('✅ Migration aplicada com sucesso!');
    
    await db.pool.end();
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error.message);
    process.exit(1);
  }
}

aplicarMigration();

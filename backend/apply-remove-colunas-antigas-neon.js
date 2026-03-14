const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function aplicarMigrationNeon() {
  const neonPool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Verificar se NEON_DATABASE_URL está definida
    if (!process.env.NEON_DATABASE_URL) {
      console.error('❌ NEON_DATABASE_URL não está definida no .env');
      console.log('Configure a variável NEON_DATABASE_URL com a connection string do Neon');
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '20260313_fix_vitaminas_neon.sql'),
      'utf8'
    );
    
    console.log('🔗 Conectando ao Neon...');
    console.log('Aplicando migration: 20260313_fix_vitaminas_neon.sql');
    console.log('1. Adicionando colunas vitamina_a_mcg e vitamina_c_mg...');
    console.log('2. Copiando dados das colunas antigas (se houver)...');
    console.log('3. Removendo colunas antigas vitamina_e_mg e vitamina_b1_mg...');
    
    await neonPool.query(migrationSQL);
    
    console.log('✅ Migration aplicada com sucesso no Neon!');
    console.log('✅ Colunas antigas removidas');
    
    await neonPool.end();
  } catch (error) {
    console.error('❌ Erro ao aplicar migration no Neon:', error.message);
    await neonPool.end();
    process.exit(1);
  }
}

aplicarMigrationNeon();

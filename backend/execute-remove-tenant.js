const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function removeTenantSystem() {
  try {
    console.log('🔄 Iniciando remoção do sistema de tenant...');
    
    // Ler o script SQL
    const sqlScript = fs.readFileSync('./remove-tenant-system.sql', 'utf8');
    
    // Executar o script
    const result = await pool.query(sqlScript);
    
    console.log('✅ Sistema de tenant removido com sucesso!');
    console.log('📋 Resultado:', result[result.length - 1]?.rows?.[0]?.status || 'Concluído');
    
  } catch (error) {
    console.error('❌ Erro ao remover sistema de tenant:', error.message);
    console.error('Detalhes:', error);
  } finally {
    await pool.end();
  }
}

removeTenantSystem();
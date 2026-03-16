require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function aplicarMigracaoLocal() {
  const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'alimentacao_escolar',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco local\n');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '20260315_create_periodos_sistema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Aplicando migração...\n');
    
    // Executar a migração
    await client.query(sql);

    console.log('✅ MIGRAÇÃO APLICADA COM SUCESSO!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada\n');
  }
}

aplicarMigracaoLocal().catch(console.error);

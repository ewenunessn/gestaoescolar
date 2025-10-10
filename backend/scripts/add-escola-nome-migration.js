require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'alimentacao_escolar',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
    ssl: false
  });

  try {
    const migrationPath = path.join(__dirname, '../src/database/migrations/010_add_escola_nome_to_demandas.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executando migration para adicionar campo escola_nome...');
    await pool.query(migration);
    console.log('Migration executada com sucesso!');
    
    process.exit(0);
  } catch (error) {
    console.error('Erro na migration:', error);
    process.exit(1);
  }
}

runMigration();
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

// Configuração do banco
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function createBackupTables() {
    try {
        const sql = fs.readFileSync('create_backup_tables.sql', 'utf8');
        const result = await pool.query(sql);
        console.log('✅ Tabelas de backup criadas com sucesso:', result.rows);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao criar tabelas de backup:', error);
        process.exit(1);
    }
}

createBackupTables();
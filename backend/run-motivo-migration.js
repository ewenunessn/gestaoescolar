/**
 * Script para executar a migração que torna o campo motivo opcional
 * Execute este script quando o banco de dados estiver disponível
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

async function runMigration() {
    console.log('🔄 Executando migração para tornar motivo opcional...');

    try {
        // Ler o arquivo de migração
        const migrationPath = path.join(__dirname, 'migrations', 'make-motivo-optional.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Executar a migração
        await pool.query(sql);

        console.log('✅ Migração executada com sucesso!');
        console.log('   - Campo motivo agora é opcional nas movimentações de estoque');

    } catch (error) {
        console.error('❌ Erro na migração:', error.message);

        if (error.message.includes('authentication')) {
            console.log('💡 Dica: Verifique as credenciais do banco de dados');
        } else if (error.message.includes('does not exist')) {
            console.log('💡 Dica: Verifique se o banco de dados existe');
        }
    } finally {
        await pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration };
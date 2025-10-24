const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuração do banco de dados
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'alimentacao_escolar',
    password: process.env.DB_PASSWORD || 'admin123',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

console.log('🔧 Usando configuração local:', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user
});

const pool = new Pool(dbConfig);

async function runMigration() {
    try {
        console.log('🚀 Iniciando migração para adicionar coluna nome às guias...');
        
        // Ler o arquivo SQL
        const migrationPath = path.join(__dirname, 'src/migrations/20241223_add_nome_to_guias.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Executando migração...');
        
        // Executar a migração
        await pool.query(migrationSQL);
        
        console.log('✅ Migração executada com sucesso!');
        
        // Verificar se a coluna foi criada
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'guias' 
            AND column_name = 'nome'
            ORDER BY column_name;
        `);
        
        if (result.rows.length > 0) {
            console.log('📊 Coluna criada:');
            result.rows.forEach(row => {
                console.log(`  ✅ ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
            });
        }
        
        // Verificar guias atualizadas
        const guiasResult = await pool.query(`
            SELECT id, nome, mes, ano FROM guias ORDER BY ano DESC, mes DESC LIMIT 5;
        `);
        
        console.log('📋 Guias atualizadas (últimas 5):');
        guiasResult.rows.forEach(row => {
            console.log(`  - ID ${row.id}: ${row.nome} (${row.mes}/${row.ano})`);
        });
        
    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Executar migração
runMigration()
    .then(() => {
        console.log('🎉 Migração da coluna nome concluída!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Falha na migração:', error);
        process.exit(1);
    });
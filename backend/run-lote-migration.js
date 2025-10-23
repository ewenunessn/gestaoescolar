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
        console.log('🚀 Iniciando migração para adicionar coluna lote...');
        
        // Ler o arquivo SQL
        const migrationPath = path.join(__dirname, 'src/migrations/20241223_add_lote_to_guia_produto_escola.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Executando migração...');
        
        // Executar a migração
        await pool.query(migrationSQL);
        
        console.log('✅ Migração executada com sucesso!');
        
        // Verificar se a coluna foi criada
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'guia_produto_escola' 
            AND column_name = 'lote'
            ORDER BY column_name;
        `);
        
        if (result.rows.length > 0) {
            console.log('📊 Coluna criada:');
            result.rows.forEach(row => {
                console.log(`  ✅ ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
            });
        } else {
            console.log('⚠️  Coluna lote não encontrada após migração');
        }
        
        // Verificar estrutura da tabela
        const tableStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'guia_produto_escola'
            ORDER BY ordinal_position;
        `);
        
        console.log('📋 Estrutura atual da tabela guia_produto_escola:');
        tableStructure.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
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
        console.log('🎉 Migração da coluna lote concluída!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Falha na migração:', error);
        process.exit(1);
    });
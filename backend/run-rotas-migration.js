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
        console.log('🚀 Iniciando migração das rotas...');
        
        // Ler o arquivo SQL
        const migrationPath = path.join(__dirname, 'src/migrations/20241216_create_rotas_entregas.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Executando migração das rotas...');
        
        // Executar a migração
        await pool.query(migrationSQL);
        
        console.log('✅ Migração executada com sucesso!');
        
        // Verificar se as tabelas foram criadas
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('rotas_entrega', 'rota_escolas', 'planejamento_entregas')
            ORDER BY table_name;
        `);
        
        console.log('📊 Tabelas criadas:');
        result.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}`);
        });
        
        // Verificar dados inseridos
        const rotasResult = await pool.query('SELECT id, nome, cor FROM rotas_entrega ORDER BY id');
        console.log('📋 Rotas inseridas:');
        rotasResult.rows.forEach(row => {
            console.log(`  - ${row.id}: ${row.nome} (${row.cor})`);
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
        console.log('🎉 Migração das rotas concluída!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Falha na migração:', error);
        process.exit(1);
    });
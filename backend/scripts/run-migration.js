const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuração do banco de dados
let pool;

console.log('🔍 DATABASE_URL presente?', !!process.env.DATABASE_URL);
console.log('🔍 POSTGRES_URL presente?', !!process.env.POSTGRES_URL);

if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    // Usar DATABASE_URL ou POSTGRES_URL (produção - Vercel/Neon)
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    console.log('✅ Usando connection string para Neon/Vercel');
    pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    // Usar variáveis individuais (desenvolvimento local)
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

    pool = new Pool(dbConfig);
}

async function runMigration() {
    try {
        console.log('🚀 Iniciando migração...');
        
        // Ler o arquivo SQL
        const migrationPath = path.join(__dirname, '../migrations/add_location_fields_to_entregas.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Executando SQL:');
        console.log(migrationSQL);
        
        // Executar a migração
        await pool.query(migrationSQL);
        
        console.log('✅ Migração executada com sucesso!');
        
        // Verificar se as colunas foram criadas
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'guia_produto_escola' 
            AND column_name IN ('observacao_entrega', 'latitude', 'longitude', 'precisao_gps')
            ORDER BY column_name;
        `);
        
        console.log('📊 Colunas criadas:');
        result.rows.forEach(row => {
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
        console.log('🎉 Migração concluída!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Falha na migração:', error);
        process.exit(1);
    });
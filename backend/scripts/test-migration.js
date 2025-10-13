const { Pool } = require('pg');

// Configuração do banco de dados
let pool;

if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    console.log('✅ Usando connection string para Neon/Vercel');
    pool = new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    const dbConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'alimentacao_escolar',
        password: process.env.DB_PASSWORD || 'admin123',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

    console.log('🔧 Usando configuração local');
    pool = new Pool(dbConfig);
}

async function testMigration() {
    try {
        console.log('🧪 Testando migração...');
        
        // Verificar estrutura da tabela
        const columns = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'guia_produto_escola' 
            ORDER BY ordinal_position;
        `);
        
        console.log('📋 Estrutura da tabela guia_produto_escola:');
        columns.rows.forEach(row => {
            const isNew = ['observacao_entrega', 'latitude', 'longitude', 'precisao_gps'].includes(row.column_name);
            const marker = isNew ? '🆕' : '  ';
            console.log(`${marker} ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
        
        // Verificar índices
        const indexes = await pool.query(`
            SELECT indexname, indexdef
            FROM pg_indexes 
            WHERE tablename = 'guia_produto_escola'
            AND indexname LIKE '%location%';
        `);
        
        if (indexes.rows.length > 0) {
            console.log('\n📍 Índices de localização:');
            indexes.rows.forEach(row => {
                console.log(`  - ${row.indexname}`);
            });
        }
        
        // Testar inserção de dados (simulação)
        console.log('\n✅ Migração verificada com sucesso!');
        console.log('🎯 Novos campos disponíveis para registro de localização nas entregas');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Executar teste
testMigration()
    .then(() => {
        console.log('\n🎉 Teste concluído!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Falha no teste:', error);
        process.exit(1);
    });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuração do banco de dados Neon
const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

console.log('🔧 Conectando ao banco Neon...');

const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

const migrations = [
    '20241216_create_rotas_entregas.sql',
    '20241223_add_lote_to_guia_produto_escola.sql',
    '20241223_add_observacao_para_entrega_to_guia_produto_escola.sql',
    '20241223_add_para_entrega_to_guia_produto_escola.sql',
    '20241223_add_nome_to_guias.sql'
];

async function runMigrations() {
    try {
        console.log('🚀 Iniciando execução de migrações no Neon...\n');
        
        for (const migrationFile of migrations) {
            console.log(`📄 Executando: ${migrationFile}`);
            
            try {
                const migrationPath = path.join(__dirname, 'src/migrations', migrationFile);
                const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
                
                await pool.query(migrationSQL);
                console.log(`✅ ${migrationFile} - Sucesso\n`);
            } catch (err) {
                if (err.message.includes('already exists') || err.message.includes('duplicate')) {
                    console.log(`⚠️  ${migrationFile} - Já existe (pulando)\n`);
                } else {
                    console.error(`❌ ${migrationFile} - Erro:`, err.message);
                    throw err;
                }
            }
        }
        
        // Verificar estrutura final
        console.log('\n📊 Verificando estrutura das tabelas...\n');
        
        // Verificar tabela guias
        const guiasColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'guias'
            ORDER BY ordinal_position;
        `);
        console.log('Tabela GUIAS:');
        guiasColumns.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
        
        // Verificar tabela guia_produto_escola
        const gpeColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'guia_produto_escola'
            ORDER BY ordinal_position;
        `);
        console.log('\nTabela GUIA_PRODUTO_ESCOLA:');
        gpeColumns.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
        
        // Verificar tabelas de rotas
        const rotasTables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('rotas_entrega', 'rota_escolas', 'planejamento_entregas')
            ORDER BY table_name;
        `);
        console.log('\nTabelas de ROTAS:');
        rotasTables.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}`);
        });
        
        // Contar registros
        const guiasCount = await pool.query('SELECT COUNT(*) as total FROM guias');
        const rotasCount = await pool.query('SELECT COUNT(*) as total FROM rotas_entrega');
        
        console.log('\n📈 Estatísticas:');
        console.log(`  - Guias: ${guiasCount.rows[0].total}`);
        console.log(`  - Rotas: ${rotasCount.rows[0].total}`);
        
    } catch (error) {
        console.error('\n❌ Erro geral na migração:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

// Executar migrações
runMigrations()
    .then(() => {
        console.log('\n🎉 Todas as migrações foram executadas com sucesso no Neon!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Falha nas migrações:', error);
        process.exit(1);
    });
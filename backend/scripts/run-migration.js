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
        if (process.env.TEST_ESTOQUE === 'true' || process.env.TEST_ESTOQUE === 'multi') {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                let escola;
                let produto;
                if (process.env.TEST_ESTOQUE === 'multi') {
                    escola = await client.query("SELECT escola_id as id FROM estoque_escolas ORDER BY escola_id LIMIT 1");
                    if (!escola.rows.length) {
                        throw new Error('Sem estoque para teste');
                    }
                    produto = await client.query(
                        "SELECT id, nome FROM produtos WHERE ativo = true AND id NOT IN (SELECT produto_id FROM estoque_escolas WHERE escola_id = $1) ORDER BY id LIMIT 1",
                        [escola.rows[0].id]
                    );
                } else {
                    escola = await client.query("SELECT id, nome FROM escolas WHERE ativo = true ORDER BY id LIMIT 1");
                    produto = await client.query("SELECT id, nome FROM produtos WHERE ativo = true ORDER BY id LIMIT 1");
                }
                if (!escola.rows.length || !produto.rows.length) {
                    throw new Error('Sem escola/produto ativo');
                }
                const escolaId = escola.rows[0].id;
                const produtoId = produto.rows[0].id;
                const estoqueAtual = await client.query(
                    'SELECT id, quantidade_atual FROM estoque_escolas WHERE escola_id = $1 AND produto_id = $2 LIMIT 1',
                    [escolaId, produtoId]
                );
                const quantidadeAnterior = estoqueAtual.rows.length ? Number(estoqueAtual.rows[0].quantidade_atual) : 0;
                const quantidadePosterior = quantidadeAnterior + 1;
                let estoqueId;
                if (!estoqueAtual.rows.length) {
                    const insert = await client.query(
                        'INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual, quantidade_minima, quantidade_maxima, data_ultima_atualizacao, ativo, created_at, updated_at) VALUES ($1,$2,$3,0,0,CURRENT_TIMESTAMP,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id',
                        [escolaId, produtoId, quantidadePosterior]
                    );
                    estoqueId = insert.rows[0].id;
                } else {
                    estoqueId = estoqueAtual.rows[0].id;
                    await client.query(
                        'UPDATE estoque_escolas SET quantidade_atual = $1, data_ultima_atualizacao = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                        [quantidadePosterior, estoqueId]
                    );
                }
                await client.query(
                    "INSERT INTO estoque_escolas_historico (estoque_escola_id, escola_id, produto_id, tipo_movimentacao, quantidade_anterior, quantidade_movimentada, quantidade_posterior, motivo, data_movimentacao) VALUES ($1,$2,$3,'entrada',$4,$5,$6,'teste',CURRENT_TIMESTAMP)",
                    [estoqueId, escolaId, produtoId, quantidadeAnterior, 1, quantidadePosterior]
                );
                await client.query('COMMIT');
                console.log('✅ Teste OK', { escolaId, produtoId, quantidadeAnterior, quantidadePosterior });
                return;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }

        console.log('🚀 Iniciando migração...');
        
        // Ler o arquivo SQL
        const migrationFile = process.env.MIGRATION_FILE || '024_remove_tenant_from_estoque_escolar.sql';
        const migrationPath = path.join(__dirname, '../migrations', migrationFile);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('📁 Arquivo de migração:', migrationPath);
        
        // Executar a migração
        await pool.query(migrationSQL);
        
        console.log('✅ Migração executada com sucesso!');
        
        // Verificar se tenant_id foi removido do estoque
        const result = await pool.query(`
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_name IN (
                'estoque_escolas',
                'estoque_escolas_historico',
                'estoque_lotes',
                'estoque_movimentacoes',
                'estoque_alertas'
            )
            AND column_name = 'tenant_id'
            ORDER BY table_name;
        `);
        
        if (result.rows.length === 0) {
            console.log('✅ tenant_id removido das tabelas de estoque');
        } else {
            console.log('⚠️ tenant_id ainda presente em:');
            result.rows.forEach(row => {
                console.log(`  - ${row.table_name}.${row.column_name}`);
            });
        }
        
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

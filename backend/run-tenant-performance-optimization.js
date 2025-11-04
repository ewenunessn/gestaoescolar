/**
 * Script para executar otimizações de performance multi-tenant
 * Aplica índices, views materializadas e configurações de performance
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
let pool;

if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    // Usar connection string (produção)
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
} else {
    // Usar configuração local
    pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'alimentacao_escolar',
        password: process.env.DB_PASSWORD || 'admin123',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
}

async function runOptimization() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Iniciando otimização de performance multi-tenant...');
        
        // Ler arquivo de migração (versão segura)
        const migrationPath = path.join(__dirname, 'migrations', '006_optimize_tenant_indexes_safe.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📖 Executando migração de otimização...');
        
        // Executar migração
        await client.query(migrationSQL);
        
        console.log('✅ Migração de otimização executada com sucesso!');
        
        // Verificar índices criados
        console.log('🔍 Verificando índices criados...');
        const indexQuery = `
            SELECT 
                schemaname,
                tablename,
                indexname,
                indexdef
            FROM pg_indexes 
            WHERE indexname LIKE 'idx_%tenant%' 
            ORDER BY tablename, indexname;
        `;
        
        const indexResult = await client.query(indexQuery);
        console.log(`📊 ${indexResult.rows.length} índices multi-tenant encontrados:`);
        
        indexResult.rows.forEach(row => {
            console.log(`  - ${row.tablename}.${row.indexname}`);
        });
        
        // Verificar views materializadas
        console.log('🔍 Verificando views materializadas...');
        const viewQuery = `
            SELECT 
                schemaname,
                matviewname,
                hasindexes,
                ispopulated
            FROM pg_matviews 
            WHERE matviewname LIKE 'mv_%tenant%'
            ORDER BY matviewname;
        `;
        
        const viewResult = await client.query(viewQuery);
        console.log(`📊 ${viewResult.rows.length} views materializadas encontradas:`);
        
        viewResult.rows.forEach(row => {
            console.log(`  - ${row.matviewname} (populada: ${row.ispopulated})`);
        });
        
        // Executar análise das tabelas principais
        console.log('📈 Executando análise das tabelas...');
        const tablesToAnalyze = [
            'tenants',
            'escolas', 
            'produtos', 
            'usuarios',
            'estoque_escolas',
            'estoque_lotes',
            'estoque_escolas_historico',
            'contratos',
            'pedidos',
            'tenant_users',
            'tenant_configurations'
        ];
        
        for (const table of tablesToAnalyze) {
            try {
                await client.query(`ANALYZE ${table}`);
                console.log(`  ✅ ${table} analisada`);
            } catch (error) {
                console.log(`  ⚠️ ${table} não encontrada ou erro na análise`);
            }
        }
        
        // Testar performance de uma query otimizada
        console.log('🏃‍♂️ Testando performance de query otimizada...');
        
        const testQuery = `
            EXPLAIN (ANALYZE, BUFFERS) 
            SELECT 
                e.id,
                e.nome,
                COUNT(ee.id) as produtos_estoque
            FROM escolas e
            LEFT JOIN estoque_escolas ee ON ee.escola_id = e.id
            WHERE e.tenant_id = $1 AND e.ativo = true
            GROUP BY e.id, e.nome
            ORDER BY e.nome
            LIMIT 10;
        `;
        
        // Usar um tenant de exemplo (se existir)
        const tenantResult = await client.query('SELECT id FROM tenants LIMIT 1');
        if (tenantResult.rows.length > 0) {
            const testTenantId = tenantResult.rows[0].id;
            const explainResult = await client.query(testQuery, [testTenantId]);
            
            console.log('📊 Plano de execução da query de teste:');
            explainResult.rows.forEach(row => {
                console.log(`  ${row['QUERY PLAN']}`);
            });
        }
        
        // Configurações de performance do PostgreSQL
        console.log('⚙️ Verificando configurações de performance...');
        
        const configQueries = [
            "SHOW shared_buffers",
            "SHOW effective_cache_size", 
            "SHOW work_mem",
            "SHOW maintenance_work_mem",
            "SHOW random_page_cost"
        ];
        
        for (const configQuery of configQueries) {
            try {
                const result = await client.query(configQuery);
                const setting = configQuery.replace('SHOW ', '');
                console.log(`  ${setting}: ${result.rows[0][setting]}`);
            } catch (error) {
                console.log(`  ⚠️ Erro ao verificar ${configQuery}`);
            }
        }
        
        // Estatísticas finais
        console.log('📊 Coletando estatísticas finais...');
        
        const statsQuery = `
            SELECT 
                COUNT(*) as total_tenants
            FROM tenants WHERE status = 'active';
        `;
        
        const statsResult = await client.query(statsQuery);
        console.log(`  Tenants ativos: ${statsResult.rows[0].total_tenants}`);
        
        console.log('🎉 Otimização de performance concluída com sucesso!');
        console.log('');
        console.log('📋 Próximos passos recomendados:');
        console.log('  1. Configure Redis para cache (REDIS_URL ou REDIS_HOST)');
        console.log('  2. Execute refresh_tenant_materialized_views() periodicamente');
        console.log('  3. Monitore performance através dos endpoints /api/performance/*');
        console.log('  4. Ajuste configurações do PostgreSQL conforme necessário');
        
    } catch (error) {
        console.error('❌ Erro durante otimização:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        await runOptimization();
        console.log('✅ Script de otimização executado com sucesso!');
    } catch (error) {
        console.error('❌ Erro no script de otimização:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { runOptimization };
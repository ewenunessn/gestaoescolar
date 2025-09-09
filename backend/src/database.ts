// Configuração PostgreSQL - Sistema de Alimentação Escolar
import { Pool, PoolClient, QueryResult } from 'pg';

// Carregar configuração
let config: any;
try {
    const configModule = require('./config');
    config = configModule.config || configModule.default;
} catch (error) {
    console.warn('⚠️  Não foi possível carregar config, usando variáveis de ambiente');
    config = {
        database: {
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            name: process.env.DB_NAME || 'alimentacao_escolar',
            password: process.env.DB_PASSWORD || 'admin123',
            port: process.env.DB_PORT || 5432,
            ssl: process.env.DB_SSL === 'true'
        }
    };
}

// Pool de conexões PostgreSQL (Supabase)
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Configurações otimizadas para Supabase
    max: 15, // Supabase suporta até 60 conexões no plano gratuito
    min: 0, // Não manter conexões ociosas
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true, // Para Vercel Serverless
});

// Função principal para queries
async function query(text: string, params: any[] = []): Promise<QueryResult> {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        
        if (process.env.NODE_ENV === 'development') {
            console.log('Query executada:', {
                text: text.substring(0, 50) + '...',
                duration: duration + 'ms',
                rows: res.rowCount
            });
        }
        
        return res;
    } catch (error: any) {
        console.error('Erro na query PostgreSQL:', error.message);
        console.error('Query:', text);
        console.error('Params:', params);
        throw error;
    }
}

// Função para transações
async function transaction(callback: (client: PoolClient) => Promise<any>): Promise<any> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Função para testar conexão
async function testConnection(): Promise<boolean> {
    try {
        const result = await query('SELECT NOW() as current_time, version()');
        console.log('✅ PostgreSQL conectado:', result.rows[0].current_time);
        return true;
    } catch (error: any) {
        console.error('❌ Erro na conexão PostgreSQL:', error.message);
        return false;
    }
}

// Exportar funções PostgreSQL
const db = {
    query,
    transaction,
    testConnection,
    pool,
    
    // Métodos para compatibilidade com código existente
    all: async (sql: string, params: any[] = []): Promise<any[]> => {
        const result = await query(sql, params);
        return result.rows;
    },
    
    get: async (sql: string, params: any[] = []): Promise<any> => {
        const result = await query(sql, params);
        return result.rows[0];
    },
    
    run: async (sql: string, params: any[] = []): Promise<{ changes: number; lastID: any }> => {
        const result = await query(sql, params);
        return {
            changes: result.rowCount || 0,
            lastID: result.rows && result.rows.length > 0 ? result.rows[0].id : null
        };
    }
};

// Fechar pool quando aplicação terminar
process.on('SIGINT', () => {
    console.log('Fechando pool PostgreSQL...');
    pool.end();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Fechando pool PostgreSQL...');
    pool.end();
    process.exit(0);
});

export default db;
module.exports = db;
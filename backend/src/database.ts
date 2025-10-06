// Configuração PostgreSQL - Sistema de Alimentação Escolar
import { Pool, PoolClient, QueryResult } from 'pg';

// Configuração explícita para garantir conexão correta
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'alimentacao_escolar',
    password: process.env.DB_PASSWORD || 'admin123',
    port: parseInt(process.env.DB_PORT || '5432'),
    // Forçar SSL como false para desenvolvimento local
    // Em produção na Vercel, usar variável de ambiente DB_SSL=true
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

console.log('🔧 Configuração do banco de dados:', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user
});

// Pool de conexões PostgreSQL
const pool = new Pool(dbConfig);

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
        const result = await query('SELECT NOW() as current_time, current_database() as db_name');
        console.log('✅ PostgreSQL conectado:', result.rows[0]);
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

// Testar conexão ao iniciar
testConnection();

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
// ========================================
// CONFIGURAÇÃO PostgreSQL - Sistema de Alimentação Escolar
// ========================================
// 
// Este arquivo suporta duas configurações de banco:
// 
// 1. BANCO NEON/VERCEL (Recomendado para desenvolvimento e produção):
//    - Use DATABASE_URL ou POSTGRES_URL no arquivo .env
//    - Exemplo: DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
// 
// 2. BANCO LOCAL (Para desenvolvimento offline):
//    - Use variáveis individuais: DB_USER, DB_HOST, DB_NAME, etc.
//    - Certifique-se de que DATABASE_URL esteja comentada no .env
// 
// A detecção é automática: se DATABASE_URL existir, usa Neon/Vercel,
// caso contrário, usa configuração local.
// ========================================

import { Pool, PoolClient, QueryResult } from 'pg';

let pool: Pool;

console.log('🔍 Verificando configuração do banco...');
console.log('🔍 DATABASE_URL presente?', !!process.env.DATABASE_URL);
console.log('🔍 POSTGRES_URL presente?', !!process.env.POSTGRES_URL);

if (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    // ========================================
    // CONFIGURAÇÃO NEON/VERCEL (Connection String)
    // ========================================
    // Prioridade: NEON_DATABASE_URL > POSTGRES_URL > DATABASE_URL
    const connectionString = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
    
    // Detectar se é ambiente local (localhost) ou produção (Neon/Vercel)
    const isLocalDatabase = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    
    if (isLocalDatabase) {
        console.log('✅ Usando connection string LOCAL (sem SSL)');
        pool = new Pool({
            connectionString,
            ssl: false,
            client_encoding: 'UTF8',
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
    } else {
        console.log('✅ Usando NEON/VERCEL (com SSL verify-full)');
        
        // Adicionar sslmode=verify-full à connection string se não estiver presente
        let finalConnectionString = connectionString;
        if (!connectionString.includes('sslmode=')) {
            const separator = connectionString.includes('?') ? '&' : '?';
            finalConnectionString = `${connectionString}${separator}sslmode=verify-full`;
        }
        
        pool = new Pool({
            connectionString: finalConnectionString,
            ssl: { rejectUnauthorized: true },  // Equivalente a verify-full
            client_encoding: 'UTF8',
            max: 5,                      // Neon tem limite de conexões
            idleTimeoutMillis: 10000,    // Fecha idle antes do Neon matar (~5min)
            connectionTimeoutMillis: 10000,
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
        });
    }
} else {
    // ========================================
    // CONFIGURAÇÃO BANCO LOCAL (Variáveis individuais)
    // ========================================
    // Para usar esta configuração:
    // 1. Comente DATABASE_URL no arquivo .env
    // 2. Descomente e configure as variáveis DB_* no .env
    // 3. Certifique-se de que o PostgreSQL local está rodando
    
    const dbConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'alimentacao_escolar',
        password: process.env.DB_PASSWORD || 'admin123',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        client_encoding: 'UTF8'
    };

    console.log('🔧 Usando configuração BANCO LOCAL:', {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user
    });

    pool = new Pool(dbConfig);
}

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
        // Reconecta automaticamente se a conexão foi encerrada pelo servidor
        if (error.message?.includes('Connection terminated') || error.code === 'ECONNRESET') {
            console.warn('⚠️ Conexão encerrada, tentando novamente...');
            const res = await pool.query(text, params);
            return res;
        }
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
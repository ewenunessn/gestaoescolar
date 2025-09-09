import { Pool } from 'pg';

// Configuração do PostgreSQL para Vercel
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Função para testar conexão
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ PostgreSQL conectado (Vercel)');
    return true;
  } catch (error) {
    console.error('❌ Erro PostgreSQL (Vercel):', error);
    return false;
  }
};

// Função para executar queries
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executada:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Erro na query:', { text, error });
    throw error;
  }
};

// Função para obter cliente
export const getClient = async () => {
  return await pool.connect();
};

// Função para fechar pool
export const closePool = async () => {
  await pool.end();
};

export default {
  query,
  testConnection,
  getClient,
  closePool
};
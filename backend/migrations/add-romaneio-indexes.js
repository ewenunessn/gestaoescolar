/**
 * Migration: Adicionar índices para otimização do Romaneio
 * Data: 2026-04-02
 * 
 * Adiciona índices nas colunas mais usadas nas queries do romaneio
 * para melhorar a performance de consultas com filtros de data, escola e status
 */

require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: process.env.DB_PORT || 5432
});

async function run() {
  try {
    await client.connect();
    console.log('🔧 Criando índices para otimização do Romaneio...');

    // Índice composto para data_entrega + status (query mais comum)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_data_status 
      ON guia_produto_escola(data_entrega, status)
    `);
    console.log('✅ Índice idx_guia_produto_escola_data_status criado');

    // Índice para escola_id (usado em filtros e JOINs)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_escola_id 
      ON guia_produto_escola(escola_id)
    `);
    console.log('✅ Índice idx_guia_produto_escola_escola_id criado');

    // Índice para produto_id (usado em JOINs)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_guia_produto_escola_produto_id 
      ON guia_produto_escola(produto_id)
    `);
    console.log('✅ Índice idx_guia_produto_escola_produto_id criado');

    // Índice para rota_escolas (usado na subquery de rotas)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_rota_escolas_escola_id 
      ON rota_escolas(escola_id)
    `);
    console.log('✅ Índice idx_rota_escolas_escola_id criado');

    console.log('✅ Todos os índices do Romaneio foram criados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar índices:', error);
    throw error;
  } finally {
    await client.end();
  }
}

run();

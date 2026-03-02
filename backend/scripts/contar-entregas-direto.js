const { Pool } = require('pg');
require('dotenv').config();

// Usar POSTGRES_URL para Neon
const connectionString = process.env.POSTGRES_URL;

console.log('🔗 Conectando ao Neon:', connectionString ? 'SIM' : 'NÃO');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function contarDireto() {
  try {
    console.log('🔍 Contando registros diretamente...\n');

    // Contar sem joins
    const countResult = await pool.query('SELECT COUNT(*) as total FROM historico_entregas');
    console.log(`📦 Total de registros em historico_entregas: ${countResult.rows[0].total}`);

    // Listar todos os IDs
    const idsResult = await pool.query('SELECT id, quantidade_entregue, data_entrega, nome_quem_recebeu, LENGTH(assinatura_base64) as assinatura_length FROM historico_entregas ORDER BY id DESC');
    
    console.log('\n📋 Todos os registros:');
    console.log('─'.repeat(100));
    idsResult.rows.forEach(row => {
      console.log(`ID: ${row.id} | Qtd: ${row.quantidade_entregue} | Data: ${new Date(row.data_entrega).toLocaleDateString('pt-BR')} | Recebedor: ${row.nome_quem_recebeu} | Assinatura: ${row.assinatura_length ? row.assinatura_length + ' chars' : 'NÃO'}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

contarDireto();

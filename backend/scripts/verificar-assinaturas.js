const { Pool } = require('pg');
require('dotenv').config();

// Forçar uso do banco de produção
const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

console.log('🔗 Conectando ao banco:', connectionString ? 'Neon (Produção)' : 'Local');

const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('neon') ? { rejectUnauthorized: false } : false
});

async function verificarAssinaturas() {
  try {
    console.log('🔍 Verificando assinaturas no banco de dados...\n');

    // Contar total de entregas
    const totalResult = await pool.query(`
      SELECT COUNT(*) as total FROM historico_entregas
    `);
    console.log(`📦 Total de entregas: ${totalResult.rows[0].total}`);

    // Contar entregas com assinatura
    const comAssinaturaResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM historico_entregas 
      WHERE assinatura_base64 IS NOT NULL AND assinatura_base64 != ''
    `);
    console.log(`✍️  Entregas com assinatura: ${comAssinaturaResult.rows[0].total}`);

    // Contar entregas sem assinatura
    const semAssinaturaResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM historico_entregas 
      WHERE assinatura_base64 IS NULL OR assinatura_base64 = ''
    `);
    console.log(`❌ Entregas sem assinatura: ${semAssinaturaResult.rows[0].total}`);

    // Mostrar últimas 10 entregas com informação de assinatura
    const ultimasResult = await pool.query(`
      SELECT 
        he.id,
        he.data_entrega,
        he.quantidade_entregue,
        he.nome_quem_entregou,
        he.nome_quem_recebeu,
        p.nome as produto_nome,
        e.nome as escola_nome,
        CASE 
          WHEN he.assinatura_base64 IS NOT NULL AND he.assinatura_base64 != '' 
          THEN 'SIM (' || LENGTH(he.assinatura_base64) || ' chars)'
          ELSE 'NÃO'
        END as tem_assinatura
      FROM historico_entregas he
      INNER JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN escolas e ON gpe.escola_id = e.id
      ORDER BY he.data_entrega DESC
      LIMIT 10
    `);

    console.log('\n📋 Últimas 10 entregas:');
    console.log('─'.repeat(100));
    ultimasResult.rows.forEach(row => {
      console.log(`ID: ${row.id} | ${new Date(row.data_entrega).toLocaleString('pt-BR')}`);
      console.log(`   Produto: ${row.produto_nome}`);
      console.log(`   Escola: ${row.escola_nome}`);
      console.log(`   Quantidade: ${row.quantidade_entregue}`);
      console.log(`   Entregador: ${row.nome_quem_entregou}`);
      console.log(`   Recebedor: ${row.nome_quem_recebeu}`);
      console.log(`   Assinatura: ${row.tem_assinatura}`);
      console.log('─'.repeat(100));
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

verificarAssinaturas();

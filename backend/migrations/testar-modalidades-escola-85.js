const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function testarModalidadesEscola85() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testando modalidades da escola ID 85 (EMEF PROF. DIDI)...\n');

    // Verificar se a escola existe
    const escolaResult = await client.query(`
      SELECT * 
      FROM escolas 
      WHERE id = 85
      LIMIT 1
    `);
    
    console.log('📚 Escola encontrada:', escolaResult.rows[0]);

    // Buscar modalidades da escola
    const modalidadesResult = await client.query(`
      SELECT 
        em.id,
        em.escola_id,
        em.modalidade_id,
        em.quantidade_alunos,
        m.nome as modalidade_nome
      FROM escola_modalidades em
      LEFT JOIN modalidades m ON em.modalidade_id = m.id
      WHERE em.escola_id = 85
      ORDER BY m.nome
    `);

    console.log('\n📋 Modalidades encontradas:', modalidadesResult.rows.length);
    console.log(JSON.stringify(modalidadesResult.rows, null, 2));

    // Listar todas as modalidades disponíveis
    const todasModalidadesResult = await client.query(`
      SELECT id, nome 
      FROM modalidades 
      ORDER BY nome
    `);
    
    console.log('\n📚 Todas as modalidades disponíveis no sistema:');
    console.log(JSON.stringify(todasModalidadesResult.rows, null, 2));

    // Verificar se há alguma escola com modalidades cadastradas
    const escolasComModalidadesResult = await client.query(`
      SELECT 
        e.id,
        e.nome,
        COUNT(em.id) as total_modalidades
      FROM escolas e
      LEFT JOIN escola_modalidades em ON e.id = em.escola_id
      GROUP BY e.id, e.nome
      HAVING COUNT(em.id) > 0
      ORDER BY total_modalidades DESC
      LIMIT 5
    `);

    console.log('\n🏫 Escolas com modalidades cadastradas (top 5):');
    console.log(JSON.stringify(escolasComModalidadesResult.rows, null, 2));

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

testarModalidadesEscola85();

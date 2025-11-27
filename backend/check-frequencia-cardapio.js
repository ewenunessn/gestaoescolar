require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkFrequenciaCardapio() {
  try {
    console.log('Verificando frequências no cardápio...\n');
    
    // Buscar todas as refeições de cardápios com suas frequências
    const result = await pool.query(`
      SELECT 
        c.id as cardapio_id,
        c.nome as cardapio_nome,
        cr.id as cardapio_refeicao_id,
        cr.frequencia_mensal,
        r.id as refeicao_id,
        r.nome as refeicao_nome,
        m.nome as modalidade_nome
      FROM cardapios c
      JOIN cardapio_refeicoes cr ON c.id = cr.cardapio_id
      JOIN refeicoes r ON cr.refeicao_id = r.id
      JOIN modalidades m ON cr.modalidade_id = m.id
      ORDER BY c.id, r.nome
    `);
    
    console.log(`Total de refeições em cardápios: ${result.rows.length}\n`);
    
    result.rows.forEach(row => {
      console.log(`Cardápio: ${row.cardapio_nome} (ID: ${row.cardapio_id})`);
      console.log(`  Refeição: ${row.refeicao_nome} (ID: ${row.refeicao_id})`);
      console.log(`  Modalidade: ${row.modalidade_nome}`);
      console.log(`  Frequência Mensal: ${row.frequencia_mensal}x`);
      console.log(`  cardapio_refeicao_id: ${row.cardapio_refeicao_id}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

checkFrequenciaCardapio();

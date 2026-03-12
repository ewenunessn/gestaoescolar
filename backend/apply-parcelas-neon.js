require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyToNeon() {
  try {
    console.log('🔄 Aplicando migration no Neon: adicionar campo parcelas...\n');
    
    const sql = fs.readFileSync('./migrations/20260312_add_parcelas_modalidades.sql', 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration aplicada no Neon com sucesso!\n');
    
    // Verificar resultado
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'modalidades' AND column_name = 'parcelas'
    `);
    
    if (result.rows.length > 0) {
      console.log('📋 Campo criado no Neon:');
      console.log(`   Nome: ${result.rows[0].column_name}`);
      console.log(`   Tipo: ${result.rows[0].data_type}`);
      console.log(`   Padrão: ${result.rows[0].column_default}\n`);
    }
    
    // Mostrar modalidades
    const modalidades = await pool.query('SELECT id, nome, valor_repasse, parcelas FROM modalidades LIMIT 10');
    console.log('📊 Modalidades no Neon (primeiras 10):');
    modalidades.rows.forEach(m => {
      const valorTotal = (parseFloat(m.valor_repasse || 0) * parseInt(m.parcelas || 1));
      console.log(`   ${m.nome}: R$ ${m.valor_repasse} x ${m.parcelas} parcelas = R$ ${valorTotal.toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration no Neon:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyToNeon();

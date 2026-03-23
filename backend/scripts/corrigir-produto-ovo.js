require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function corrigir() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Corrigindo produto OVO...\n');
    
    // Atualizar produto OVO
    const result = await client.query(`
      UPDATE produtos 
      SET peso = 60,
          unidade_distribuicao = 'Unidade'
      WHERE id = 169
      RETURNING id, nome, unidade_distribuicao, peso
    `);
    
    if (result.rows.length > 0) {
      const p = result.rows[0];
      console.log('✅ Produto atualizado:');
      console.log(`   ID: ${p.id}`);
      console.log(`   Nome: ${p.nome}`);
      console.log(`   Unidade: ${p.unidade_distribuicao}`);
      console.log(`   Peso: ${p.peso}g (1 ovo = 60g)`);
      console.log('');
      console.log('📝 Agora o sistema sabe que:');
      console.log('   - 1 unidade = 1 ovo = 60g');
      console.log('   - Para comprar, pode converter para kg se necessário');
      console.log('');
      console.log('🎉 Correção concluída! Recalcule a guia para aplicar as mudanças.');
    } else {
      console.log('❌ Produto não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

corrigir();

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Forçar uso do banco local
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function verificarUsuarios() {
  try {
    console.log('🔍 Verificando usuários no banco...\n');

    const result = await pool.query(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.tipo,
        u.tipo_secretaria,
        u.escola_id,
        e.nome as escola_nome
      FROM usuarios u
      LEFT JOIN escolas e ON u.escola_id = e.id
      ORDER BY u.id
    `);

    console.log(`📊 Total de usuários: ${result.rows.length}\n`);

    result.rows.forEach(user => {
      console.log(`👤 ID: ${user.id}`);
      console.log(`   Nome: ${user.nome}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Tipo: ${user.tipo}`);
      console.log(`   Tipo Secretaria: ${user.tipo_secretaria || 'NULL'}`);
      console.log(`   Escola ID: ${user.escola_id || 'NULL'}`);
      console.log(`   Escola Nome: ${user.escola_nome || 'N/A'}`);
      console.log('');
    });

    // Verificar se existem escolas
    const escolas = await pool.query('SELECT id, nome FROM escolas ORDER BY nome LIMIT 5');
    console.log(`\n🏫 Escolas disponíveis (primeiras 5):`);
    escolas.rows.forEach(e => {
      console.log(`   ${e.id} - ${e.nome}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificarUsuarios();

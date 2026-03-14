const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verificarCardapiosAntigos() {
  try {
    console.log('🔍 Verificando sistema de cardápios antigo...\n');

    // 1. Verificar se tabelas antigas existem
    const tabelasAntigas = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('cardapios', 'cardapio_refeicoes')
      ORDER BY table_name
    `);

    if (tabelasAntigas.rows.length === 0) {
      console.log('✅ Tabelas antigas não existem. Sistema já migrado!');
      return;
    }

    console.log('📋 Tabelas antigas encontradas:');
    tabelasAntigas.rows.forEach(t => console.log(`  - ${t.table_name}`));
    console.log('\n');

    // 2. Verificar dados nas tabelas antigas
    if (tabelasAntigas.rows.some(t => t.table_name === 'cardapios')) {
      const cardapios = await pool.query('SELECT COUNT(*) as total FROM cardapios');
      console.log(`📊 Cardápios antigos: ${cardapios.rows[0].total}`);
      
      if (cardapios.rows[0].total > 0) {
        const exemplos = await pool.query('SELECT id, nome, data_inicio, data_fim FROM cardapios LIMIT 3');
        console.log('   Exemplos:');
        exemplos.rows.forEach(c => {
          console.log(`   - ID ${c.id}: ${c.nome} (${c.data_inicio} a ${c.data_fim})`);
        });
      }
    }

    if (tabelasAntigas.rows.some(t => t.table_name === 'cardapio_refeicoes')) {
      const refeicoes = await pool.query('SELECT COUNT(*) as total FROM cardapio_refeicoes');
      console.log(`📊 Refeições antigas: ${refeicoes.rows[0].total}\n`);
    }

    // 3. Verificar foreign keys que referenciam as tabelas antigas
    const fks = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name IN ('cardapios', 'cardapio_refeicoes')
    `);

    if (fks.rows.length > 0) {
      console.log('⚠️  Foreign keys que referenciam tabelas antigas:');
      fks.rows.forEach(fk => {
        console.log(`   - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
      console.log('\n');
    }

    // 4. Verificar se há código que usa as tabelas antigas
    console.log('📝 Próximos passos para remoção segura:');
    console.log('   1. Backup dos dados (se necessário)');
    console.log('   2. Remover foreign keys');
    console.log('   3. Remover função calcularDemanda do controller');
    console.log('   4. Remover rota /calcular-demanda');
    console.log('   5. DROP TABLE cardapio_refeicoes');
    console.log('   6. DROP TABLE cardapios');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificarCardapiosAntigos();

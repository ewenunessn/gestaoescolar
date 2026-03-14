const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verificarIndices() {
  try {
    console.log('🔍 Verificando índices de performance...\n');

    // Índices esperados
    const indicesEsperados = [
      'idx_cardapio_refeicoes_dia_cardapio_modalidade',
      'idx_cardapio_refeicoes_dia_refeicao',
      'idx_cardapio_refeicoes_dia_dia',
      'idx_escola_modalidades_escola',
      'idx_escola_modalidades_modalidade',
      'idx_refeicao_produtos_refeicao',
      'idx_refeicao_produtos_produto',
      'idx_refeicao_produto_modalidade_refeicao_produto',
      'idx_refeicao_produto_modalidade_modalidade',
      'idx_cardapios_modalidade_modalidade',
      'idx_cardapios_modalidade_competencia',
      'idx_cardapios_modalidade_ativo'
    ];

    // Buscar índices existentes
    const result = await pool.query(`
      SELECT 
        indexname,
        tablename,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY($1)
      ORDER BY tablename, indexname
    `, [indicesEsperados]);

    console.log(`📊 Índices encontrados: ${result.rows.length}/${indicesEsperados.length}\n`);

    if (result.rows.length > 0) {
      console.log('✅ Índices existentes:');
      result.rows.forEach(idx => {
        console.log(`   - ${idx.indexname} (${idx.tablename})`);
      });
      console.log('');
    }

    // Verificar índices faltantes
    const indicesEncontrados = result.rows.map(r => r.indexname);
    const indicesFaltantes = indicesEsperados.filter(i => !indicesEncontrados.includes(i));

    if (indicesFaltantes.length > 0) {
      console.log('❌ Índices faltantes:');
      indicesFaltantes.forEach(idx => {
        console.log(`   - ${idx}`);
      });
      console.log('\n💡 Execute a migration: backend/migrations/20260314_add_performance_indexes.sql');
    } else {
      console.log('✅ Todos os índices de performance estão criados!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificarIndices();

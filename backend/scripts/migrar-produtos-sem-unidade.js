const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrarProdutosSemUnidade() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Migrando produtos sem unidade...\n');
    
    // Buscar produtos sem unidade
    const produtosSemUnidade = await client.query(`
      SELECT id, nome, unidade_distribuicao
      FROM produtos
      WHERE unidade_medida_id IS NULL
      ORDER BY id
    `);
    
    console.log(`📦 Encontrados ${produtosSemUnidade.rows.length} produtos sem unidade\n`);
    
    if (produtosSemUnidade.rows.length === 0) {
      console.log('✅ Todos os produtos já foram migrados!');
      return;
    }
    
    // Buscar ID da unidade KG (padrão para produtos sem unidade)
    const unidadeKG = await client.query(`
      SELECT id FROM unidades_medida WHERE codigo = 'KG'
    `);
    
    const kgId = unidadeKG.rows[0].id;
    
    let migrados = 0;
    let erros = 0;
    
    for (const produto of produtosSemUnidade.rows) {
      try {
        // Atualizar para KG como padrão
        await client.query(`
          UPDATE produtos 
          SET unidade_medida_id = $1,
              unidade_distribuicao = 'Quilograma'
          WHERE id = $2
        `, [kgId, produto.id]);
        
        migrados++;
        console.log(`✅ ID ${produto.id}: ${produto.nome} → KG`);
      } catch (error) {
        erros++;
        console.error(`❌ ID ${produto.id}: ${produto.nome} - Erro: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Resumo:`);
    console.log(`  Migrados: ${migrados}`);
    console.log(`  Erros: ${erros}`);
    console.log(`  Total: ${produtosSemUnidade.rows.length}`);
    
    // Verificar status final
    const statusFinal = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(unidade_medida_id) as migrados
      FROM produtos
    `);
    
    console.log(`\n✅ Status final:`);
    console.log(`  Total de produtos: ${statusFinal.rows[0].total}`);
    console.log(`  Produtos migrados: ${statusFinal.rows[0].migrados}`);
    console.log(`  Produtos pendentes: ${statusFinal.rows[0].total - statusFinal.rows[0].migrados}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrarProdutosSemUnidade();

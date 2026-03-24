const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrarContratosSemUnidade() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Migrando contratos sem unidade...\n');
    
    // Buscar contratos sem unidade com informações do produto
    const contratosSemUnidade = await client.query(`
      SELECT 
        cp.id,
        cp.produto_id,
        cp.unidade_compra,
        cp.peso_embalagem,
        p.nome as produto_nome,
        p.unidade_medida_id as produto_unidade_id,
        um.codigo as produto_unidade_codigo
      FROM contrato_produtos cp
      JOIN produtos p ON p.id = cp.produto_id
      LEFT JOIN unidades_medida um ON um.id = p.unidade_medida_id
      WHERE cp.unidade_medida_compra_id IS NULL
      ORDER BY cp.id
    `);
    
    console.log(`📋 Encontrados ${contratosSemUnidade.rows.length} contratos sem unidade\n`);
    
    if (contratosSemUnidade.rows.length === 0) {
      console.log('✅ Todos os contratos já foram migrados!');
      return;
    }
    
    let migrados = 0;
    let erros = 0;
    
    for (const contrato of contratosSemUnidade.rows) {
      try {
        // Usar a mesma unidade do produto como padrão
        if (contrato.produto_unidade_id) {
          await client.query(`
            UPDATE contrato_produtos 
            SET unidade_medida_compra_id = $1,
                unidade_compra = $2
            WHERE id = $3
          `, [contrato.produto_unidade_id, contrato.produto_unidade_codigo, contrato.id]);
          
          migrados++;
          console.log(`✅ ID ${contrato.id}: ${contrato.produto_nome} → ${contrato.produto_unidade_codigo}`);
        } else {
          console.warn(`⚠️  ID ${contrato.id}: ${contrato.produto_nome} - Produto sem unidade`);
        }
      } catch (error) {
        erros++;
        console.error(`❌ ID ${contrato.id}: ${contrato.produto_nome} - Erro: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Resumo:`);
    console.log(`  Migrados: ${migrados}`);
    console.log(`  Erros: ${erros}`);
    console.log(`  Total: ${contratosSemUnidade.rows.length}`);
    
    // Verificar status final
    const statusFinal = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(unidade_medida_compra_id) as migrados
      FROM contrato_produtos
    `);
    
    console.log(`\n✅ Status final:`);
    console.log(`  Total de contratos: ${statusFinal.rows[0].total}`);
    console.log(`  Contratos migrados: ${statusFinal.rows[0].migrados}`);
    console.log(`  Contratos pendentes: ${statusFinal.rows[0].total - statusFinal.rows[0].migrados}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrarContratosSemUnidade();

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function investigarOleo() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Investigando produto Óleo...\n');
    
    // Buscar produto óleo
    const produtoResult = await client.query(`
      SELECT id, nome, unidade_distribuicao, peso
      FROM produtos
      WHERE nome ILIKE '%óleo%'
      ORDER BY id
    `);
    
    console.log('📦 Produtos encontrados:');
    produtoResult.rows.forEach(p => {
      console.log(`  ID: ${p.id} | Nome: ${p.nome} | Unidade Dist: ${p.unidade_distribuicao} | Peso: ${p.peso}g`);
    });
    
    if (produtoResult.rows.length === 0) {
      console.log('❌ Nenhum produto óleo encontrado');
      return;
    }
    
    // Para cada produto óleo, verificar contratos
    for (const produto of produtoResult.rows) {
      console.log(`\n📋 Contratos do produto "${produto.nome}" (ID: ${produto.id}):`);
      
      const contratosResult = await client.query(`
        SELECT 
          cp.id,
          cp.contrato_id,
          c.numero_contrato,
          c.fornecedor_nome,
          cp.unidade_compra,
          cp.peso_embalagem,
          cp.fator_conversao,
          cp.preco_unitario
        FROM contrato_produtos cp
        JOIN contratos c ON c.id = cp.contrato_id
        WHERE cp.produto_id = $1
        ORDER BY c.numero_contrato
      `, [produto.id]);
      
      if (contratosResult.rows.length === 0) {
        console.log('  ⚠️  Nenhum contrato encontrado');
        continue;
      }
      
      contratosResult.rows.forEach(cp => {
        console.log(`\n  Contrato: ${cp.numero_contrato} (${cp.fornecedor_nome})`);
        console.log(`    Unidade Compra: ${cp.unidade_compra}`);
        console.log(`    Peso Embalagem: ${cp.peso_embalagem}g`);
        console.log(`    Fator Conversão: ${cp.fator_conversao}`);
        console.log(`    Preço: R$ ${cp.preco_unitario}`);
        
        // Análise do problema
        console.log(`\n    📊 ANÁLISE:`);
        console.log(`    Unidade Distribuição (produto): ${produto.unidade_distribuicao}`);
        console.log(`    Unidade Compra (contrato): ${cp.unidade_compra}`);
        
        if (produto.unidade_distribuicao === cp.unidade_compra) {
          console.log(`    ✅ Unidades são IGUAIS`);
          if (cp.fator_conversao !== 1) {
            console.log(`    ❌ PROBLEMA: Fator de conversão deveria ser 1, mas está ${cp.fator_conversao}`);
            console.log(`    💡 CORREÇÃO NECESSÁRIA: fator_conversao = 1`);
          } else {
            console.log(`    ✅ Fator de conversão está correto (1)`);
          }
        } else {
          console.log(`    ⚠️  Unidades são DIFERENTES`);
          console.log(`    Fator atual: ${cp.fator_conversao}`);
          
          // Calcular fator correto baseado nos pesos
          if (produto.peso && cp.peso_embalagem) {
            const fatorCalculado = cp.peso_embalagem / produto.peso;
            console.log(`    Fator calculado (peso_embalagem/peso_produto): ${fatorCalculado.toFixed(3)}`);
            
            if (Math.abs(cp.fator_conversao - fatorCalculado) > 0.01) {
              console.log(`    ❌ PROBLEMA: Fator de conversão não corresponde aos pesos`);
              console.log(`    💡 CORREÇÃO NECESSÁRIA: fator_conversao = ${fatorCalculado.toFixed(3)}`);
            }
          }
        }
      });
    }
    
    console.log('\n\n🔧 RECOMENDAÇÕES:');
    console.log('1. Se unidade_distribuicao = unidade_compra → fator_conversao = 1');
    console.log('2. Se unidades diferentes → fator_conversao = peso_embalagem / peso_produto');
    console.log('3. Peso sempre em gramas para ambos os campos');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

investigarOleo();

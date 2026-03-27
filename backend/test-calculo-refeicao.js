const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testarCalculo() {
  try {
    // ID da refeição "Arroz com Feijão e Carne moída"
    const refeicaoId = 29;
    
    console.log('\n=== TESTE DE CÁLCULO CALÓRICO ===\n');
    
    // 1. Buscar ingredientes com detalhes
    console.log('1. Ingredientes da preparação:');
    const ingredientes = await pool.query(`
      SELECT 
        p.nome as produto_nome,
        rp.per_capita,
        rp.tipo_medida,
        pcn.energia_kcal,
        CASE 
          WHEN rp.tipo_medida = 'unidades' THEN (rp.per_capita * 100.0)
          ELSE rp.per_capita
        END as quantidade_gramas_liquido,
        CASE 
          WHEN rp.tipo_medida = 'unidades' THEN (rp.per_capita * 100.0) / 100.0
          ELSE rp.per_capita / 100.0
        END as proporcao,
        pcn.energia_kcal * (
          CASE 
            WHEN rp.tipo_medida = 'unidades' THEN (rp.per_capita * 100.0) / 100.0
            ELSE rp.per_capita / 100.0
          END
        ) as calorias_ingrediente
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN produto_composicao_nutricional pcn ON pcn.produto_id = p.id
      WHERE rp.refeicao_id = $1
      ORDER BY p.nome
    `, [refeicaoId]);
    
    let totalManual = 0;
    ingredientes.rows.forEach(ing => {
      console.log(`   ${ing.produto_nome}:`);
      console.log(`      Per capita: ${ing.per_capita} ${ing.tipo_medida}`);
      console.log(`      Energia (100g): ${ing.energia_kcal || 'N/A'} kcal`);
      console.log(`      Quantidade líquida: ${ing.quantidade_gramas_liquido}g`);
      console.log(`      Proporção: ${ing.proporcao}`);
      console.log(`      Calorias: ${ing.calorias_ingrediente || 0} kcal`);
      console.log('');
      totalManual += parseFloat(ing.calorias_ingrediente || 0);
    });
    
    console.log(`   TOTAL MANUAL: ${totalManual.toFixed(2)} kcal\n`);
    
    // 2. Buscar usando a query da listagem
    console.log('2. Cálculo da query de listagem:');
    const listagem = await pool.query(`
      SELECT 
        r.nome,
        ROUND(
          COALESCE(
            SUM(
              CASE 
                WHEN pcn.energia_kcal IS NOT NULL THEN 
                  pcn.energia_kcal * (
                    CASE 
                      WHEN rp.tipo_medida = 'unidades' THEN (rp.per_capita * 100.0) / 100.0
                      ELSE rp.per_capita / 100.0
                    END
                  )
                ELSE 0
              END
            ), 
            0
          ),
          0
        ) as valor_calorico_total
      FROM refeicoes r
      LEFT JOIN refeicao_produtos rp ON r.id = rp.refeicao_id
      LEFT JOIN produto_composicao_nutricional pcn ON rp.produto_id = pcn.produto_id
      WHERE r.id = $1
      GROUP BY r.id, r.nome
    `, [refeicaoId]);
    
    console.log(`   ${listagem.rows[0].nome}: ${listagem.rows[0].valor_calorico_total} kcal\n`);
    
    // 3. Comparar com o cálculo da API de detalhes
    console.log('3. Para comparar com o detalhe, acesse:');
    console.log(`   POST http://localhost:3000/api/refeicoes/${refeicaoId}/calcular-nutricional`);
    console.log(`   Body: { "rendimento_porcoes": 1 }\n`);
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testarCalculo();

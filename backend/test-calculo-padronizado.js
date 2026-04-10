require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testCalculoPadronizado() {
  const refeicaoId = process.argv[2] || 31;
  
  try {
    console.log(`🧪 Testando padronização de cálculo para refeição ${refeicaoId}\n`);

    // 1. Cálculo da LISTAGEM (CTE)
    const listagem = await pool.query(`
      WITH primeira_modalidade AS (
        SELECT id FROM modalidades WHERE ativo = true ORDER BY id LIMIT 1
      ),
      calculos_refeicoes AS (
        SELECT 
          r.id as refeicao_id,
          ROUND(
            COALESCE(
              SUM(
                CASE 
                  WHEN pcn.energia_kcal IS NOT NULL THEN 
                    pcn.energia_kcal * (
                      CASE 
                        WHEN rp.tipo_medida = 'unidades' THEN 
                          (COALESCE(rpm.per_capita_ajustado, rp.per_capita) * COALESCE(p.peso, 100.0)) / 100.0
                        ELSE 
                          COALESCE(rpm.per_capita_ajustado, rp.per_capita) / 100.0
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
        LEFT JOIN produtos p ON p.id = rp.produto_id
        LEFT JOIN produto_composicao_nutricional pcn ON rp.produto_id = pcn.produto_id
        LEFT JOIN refeicao_produto_modalidade rpm ON rpm.refeicao_produto_id = rp.id 
          AND rpm.modalidade_id = (SELECT id FROM primeira_modalidade)
        WHERE r.id = $1
        GROUP BY r.id
      )
      SELECT valor_calorico_total FROM calculos_refeicoes
    `, [refeicaoId]);

    // 2. Cálculo da BUSCA INDIVIDUAL
    const busca = await pool.query(`
      SELECT 
        COALESCE(
          SUM(
            CASE 
              WHEN pcn.energia_kcal IS NOT NULL THEN 
                pcn.energia_kcal * (
                  CASE 
                    WHEN rp.tipo_medida = 'unidades' THEN 
                      (rp.per_capita * COALESCE(p.peso, 100.0)) / 100.0
                    ELSE 
                      rp.per_capita / 100.0
                  END
                )
              ELSE 0
            END
          ), 
          0
        ) as valor_calorico_total
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN produto_composicao_nutricional pcn ON rp.produto_id = pcn.produto_id
      WHERE rp.refeicao_id = $1
    `, [refeicaoId]);

    // 3. Detalhamento por ingrediente
    const detalhes = await pool.query(`
      SELECT 
        p.nome,
        rp.per_capita,
        rp.tipo_medida,
        p.peso,
        pcn.energia_kcal,
        CASE 
          WHEN rp.tipo_medida = 'unidades' THEN 
            (rp.per_capita * COALESCE(p.peso, 100.0)) / 100.0 * pcn.energia_kcal
          ELSE 
            rp.per_capita / 100.0 * pcn.energia_kcal
        END as calorias_ingrediente
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN produto_composicao_nutricional pcn ON rp.produto_id = pcn.produto_id
      WHERE rp.refeicao_id = $1
      ORDER BY p.nome
    `, [refeicaoId]);

    console.log('📊 RESULTADOS:\n');
    console.log(`Listagem (CTE):      ${listagem.rows[0]?.valor_calorico_total || 0} kcal`);
    console.log(`Busca Individual:    ${busca.rows[0]?.valor_calorico_total || 0} kcal`);
    
    const totalDetalhes = detalhes.rows.reduce((sum, row) => sum + (parseFloat(row.calorias_ingrediente) || 0), 0);
    console.log(`Soma dos detalhes:   ${totalDetalhes.toFixed(2)} kcal`);

    console.log('\n📋 Detalhamento por ingrediente:');
    console.table(detalhes.rows.map(r => ({
      nome: r.nome,
      per_capita: r.per_capita,
      tipo: r.tipo_medida,
      peso: r.peso,
      kcal_100g: r.energia_kcal,
      kcal_total: parseFloat(r.calorias_ingrediente || 0).toFixed(2)
    })));

    const listVal = parseFloat(listagem.rows[0]?.valor_calorico_total || 0);
    const buscaVal = parseFloat(busca.rows[0]?.valor_calorico_total || 0);
    
    if (Math.abs(listVal - buscaVal) < 0.01 && Math.abs(listVal - totalDetalhes) < 0.01) {
      console.log('\n✅ SUCESSO! Todos os cálculos estão padronizados e retornam o mesmo valor.');
    } else {
      console.log('\n⚠️  ATENÇÃO! Há diferenças entre os cálculos:');
      console.log(`   Listagem vs Busca: ${Math.abs(listVal - buscaVal).toFixed(2)} kcal`);
      console.log(`   Listagem vs Detalhes: ${Math.abs(listVal - totalDetalhes).toFixed(2)} kcal`);
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

testCalculoPadronizado();

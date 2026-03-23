require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verificar() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Procurando registro de 684 ovos...\n');
    
    // Buscar na guia_produto_escola
    const result = await client.query(`
      SELECT 
        gpe.id,
        gpe.quantidade,
        gpe.unidade,
        gpe.data_entrega,
        p.id as produto_id,
        p.nome as produto_nome,
        e.id as escola_id,
        e.nome as escola_nome,
        g.id as guia_id,
        g.nome as guia_nome,
        g.competencia_mes_ano
      FROM guia_produto_escola gpe
      JOIN produtos p ON p.id = gpe.produto_id
      JOIN escolas e ON e.id = gpe.escola_id
      JOIN guias g ON g.id = gpe.guia_id
      WHERE gpe.quantidade >= 680 AND gpe.quantidade <= 690
        AND p.nome ILIKE '%ovo%'
      ORDER BY gpe.quantidade DESC
    `);
    
    console.log(`📊 Encontrados ${result.rows.length} registros com ~684 ovos:`);
    console.log('');
    
    result.rows.forEach(r => {
      console.log(`📦 Registro ID: ${r.id}`);
      console.log(`   Produto: ${r.produto_nome} (ID: ${r.produto_id})`);
      console.log(`   Escola: ${r.escola_nome} (ID: ${r.escola_id})`);
      console.log(`   Guia: ${r.guia_nome} (${r.competencia_mes_ano})`);
      console.log(`   Quantidade: ${r.quantidade} ${r.unidade}`);
      console.log(`   Data Entrega: ${r.data_entrega ? new Date(r.data_entrega).toISOString().split('T')[0] : 'não definida'}`);
      console.log('');
    });
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum registro encontrado com ~684 ovos');
      console.log('');
      console.log('🔍 Procurando TODOS os registros de OVO para Berço da Liberdade...');
      
      const result2 = await client.query(`
        SELECT 
          gpe.id,
          gpe.quantidade,
          gpe.unidade,
          gpe.data_entrega,
          p.id as produto_id,
          p.nome as produto_nome,
          g.competencia_mes_ano
        FROM guia_produto_escola gpe
        JOIN produtos p ON p.id = gpe.produto_id
        JOIN escolas e ON e.id = gpe.escola_id
        JOIN guias g ON g.id = gpe.guia_id
        WHERE e.nome ILIKE '%berço%liberdade%'
          AND p.nome ILIKE '%ovo%'
          AND g.competencia_mes_ano = '2026-03'
        ORDER BY gpe.data_entrega, p.nome
      `);
      
      console.log(`📊 Encontrados ${result2.rows.length} registros de OVO:`);
      console.log('');
      
      let total = 0;
      result2.rows.forEach(r => {
        console.log(`   ${r.data_entrega ? new Date(r.data_entrega).toISOString().split('T')[0] : 'sem data'}: ${r.quantidade} ${r.unidade} - ${r.produto_nome}`);
        total += Number(r.quantidade);
      });
      
      console.log('');
      console.log(`📈 Total: ${total} ${result2.rows[0]?.unidade || 'unidades'}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verificar();

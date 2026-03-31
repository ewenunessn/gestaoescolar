require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verificarOrfaos() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando registros órfãos após exclusão de guia...\n');

    // 1. Verificar guia_produto_escola órfãs
    console.log('📋 1. Verificando guia_produto_escola órfãs:');
    const guiasEscolaOrfas = await client.query(`
      SELECT gpe.id, gpe.guia_id, gpe.escola_id, gpe.produto_id, gpe.quantidade
      FROM guia_produto_escola gpe
      LEFT JOIN guias g ON gpe.guia_id = g.id
      WHERE g.id IS NULL
      ORDER BY gpe.id
      LIMIT 10
    `);
    
    if (guiasEscolaOrfas.rows.length > 0) {
      console.log(`   ❌ Encontradas ${guiasEscolaOrfas.rows.length} guia_produto_escola órfãs:`);
      guiasEscolaOrfas.rows.forEach(row => {
        console.log(`      - ID: ${row.id}, guia_id: ${row.guia_id}, escola_id: ${row.escola_id}, produto_id: ${row.produto_id}`);
      });
      
      // Contar total
      const totalOrfas = await client.query(`
        SELECT COUNT(*) as total
        FROM guia_produto_escola gpe
        LEFT JOIN guias g ON gpe.guia_id = g.id
        WHERE g.id IS NULL
      `);
      console.log(`   📊 Total de guia_produto_escola órfãs: ${totalOrfas.rows[0].total}\n`);
    } else {
      console.log('   ✅ Nenhuma guia_produto_escola órfã encontrada\n');
    }

    // 2. Verificar historico_entregas órfãs (referenciando guia_produto_escola)
    console.log('🚚 2. Verificando historico_entregas órfãs:');
    const entregasOrfas = await client.query(`
      SELECT he.id, he.guia_produto_escola_id, he.data_entrega
      FROM historico_entregas he
      LEFT JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
      WHERE gpe.id IS NULL
      ORDER BY he.id
      LIMIT 10
    `);
    
    if (entregasOrfas.rows.length > 0) {
      console.log(`   ❌ Encontradas ${entregasOrfas.rows.length} historico_entregas órfãs:`);
      entregasOrfas.rows.forEach(row => {
        console.log(`      - ID: ${row.id}, guia_produto_escola_id: ${row.guia_produto_escola_id}`);
      });
      
      // Contar total
      const totalEntregasOrfas = await client.query(`
        SELECT COUNT(*) as total
        FROM historico_entregas he
        LEFT JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
        WHERE gpe.id IS NULL
      `);
      console.log(`   📊 Total de historico_entregas órfãs: ${totalEntregasOrfas.rows[0].total}\n`);
    } else {
      console.log('   ✅ Nenhuma historico_entregas órfã encontrada\n');
    }

    // 3. Verificar pedidos órfãos
    console.log('🛒 3. Verificando pedidos órfãos:');
    const pedidosOrfaos = await client.query(`
      SELECT p.id, p.guia_id
      FROM pedidos p
      LEFT JOIN guias g ON p.guia_id = g.id
      WHERE g.id IS NULL
      ORDER BY p.id
      LIMIT 10
    `);
    
    if (pedidosOrfaos.rows.length > 0) {
      console.log(`   ❌ Encontrados ${pedidosOrfaos.rows.length} pedidos órfãos:`);
      pedidosOrfaos.rows.forEach(row => {
        console.log(`      - ID: ${row.id}, guia_id: ${row.guia_id}`);
      });
      
      // Contar total
      const totalPedidosOrfaos = await client.query(`
        SELECT COUNT(*) as total
        FROM pedidos p
        LEFT JOIN guias g ON p.guia_id = g.id
        WHERE g.id IS NULL
      `);
      console.log(`   📊 Total de pedidos órfãos: ${totalPedidosOrfaos.rows[0].total}\n`);
    } else {
      console.log('   ✅ Nenhum pedido órfão encontrado\n');
    }

    // Resumo
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESUMO DA VERIFICAÇÃO:');
    console.log('═══════════════════════════════════════════════════════');
    
    const temOrfaos = 
      guiasEscolaOrfas.rows.length > 0 ||
      entregasOrfas.rows.length > 0 ||
      pedidosOrfaos.rows.length > 0;

    if (temOrfaos) {
      console.log('❌ ATENÇÃO: Foram encontrados registros órfãos!');
      console.log('\n💡 Para limpar os órfãos, execute:');
      console.log('   node backend/migrations/limpar-orfaos-guia.js');
    } else {
      console.log('✅ Nenhum registro órfão encontrado!');
      console.log('   O banco de dados está consistente.');
    }
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erro ao verificar órfãos:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verificarOrfaos()
  .then(() => {
    console.log('✅ Verificação concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function criarDemo() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔧 Criando comprovante demo...\n');

    // Buscar uma escola
    const escola = await client.query('SELECT id, nome FROM escolas LIMIT 1');
    if (escola.rows.length === 0) {
      console.log('❌ Nenhuma escola encontrada');
      return;
    }

    console.log(`📋 Escola: ${escola.rows[0].nome}`);

    // Buscar alguns itens de guia para criar históricos
    const itens = await client.query(`
      SELECT 
        gpe.id,
        p.nome as produto_nome,
        gpe.quantidade,
        gpe.unidade
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      WHERE gpe.escola_id = $1
      AND gpe.para_entrega = true
      LIMIT 3
    `, [escola.rows[0].id]);

    if (itens.rows.length === 0) {
      console.log('❌ Nenhum item para entrega encontrado');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`📦 Itens encontrados: ${itens.rows.length}\n`);

    // Criar históricos de entrega para cada item
    const historicoIds = [];
    for (const item of itens.rows) {
      const historico = await client.query(`
        INSERT INTO historico_entregas (
          guia_produto_escola_id,
          quantidade_entregue,
          nome_quem_entregou,
          nome_quem_recebeu,
          observacao
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        item.id,
        item.quantidade,
        'João Silva (Demo)',
        'Maria Santos (Demo)',
        'Entrega demo'
      ]);
      
      historicoIds.push({
        id: historico.rows[0].id,
        produto_nome: item.produto_nome,
        quantidade: item.quantidade,
        unidade: item.unidade
      });
      
      console.log(`   ✓ Histórico criado: ${item.produto_nome}`);
    }

    // Gerar número do comprovante
    const numeroResult = await client.query('SELECT gerar_numero_comprovante() as numero');
    const numeroComprovante = numeroResult.rows[0].numero;

    // Criar comprovante
    const comprovante = await client.query(`
      INSERT INTO comprovantes_entrega (
        numero_comprovante,
        escola_id,
        nome_quem_entregou,
        nome_quem_recebeu,
        cargo_recebedor,
        observacao,
        total_itens
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      numeroComprovante,
      escola.rows[0].id,
      'João Silva (Demo)',
      'Maria Santos (Demo)',
      'Diretora',
      'Comprovante de demonstração criado automaticamente',
      historicoIds.length
    ]);

    console.log(`\n✅ Comprovante criado: ${numeroComprovante}`);

    // Inserir itens do comprovante
    for (const hist of historicoIds) {
      await client.query(`
        INSERT INTO comprovante_itens (
          comprovante_id,
          historico_entrega_id,
          produto_nome,
          quantidade_entregue,
          unidade
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        comprovante.rows[0].id,
        hist.id,
        hist.produto_nome,
        hist.quantidade,
        hist.unidade
      ]);
      console.log(`   ✓ ${hist.produto_nome}: ${hist.quantidade} ${hist.unidade}`);
    }

    await client.query('COMMIT');
    
    console.log('\n🎉 Comprovante demo criado com sucesso!');
    console.log(`\nAcesse: http://localhost:5173/comprovantes-entrega`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

criarDemo();
